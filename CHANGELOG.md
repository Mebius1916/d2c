# 更新日志 (CHANGELOG)

## [v0.1.5] - 2026-02-05

### 布局行列分组

> **涉及文件**:
>
> - `core/extractors/layout-grouping.ts` (全新: 递归投影切割算法)
> - `core/extractors/node-walker.ts` (集成: 递归布局分组)
> - `package.json` (依赖: uuid)

- **递归投影切割算法 (Recursive Projection Cutting / XY-Cut)**:
  - **背景**: 将散乱的绝对定位节点（Canvas 布局）自动推导为结构化的 Flexbox (`Row` / `Column`) 布局，为后续生成高质量代码打下基础。
  - **逻辑**:
    1. **投影分析**: 对当前容器内的所有流式节点（非 Absolute）进行 X 轴和 Y 轴的投影分析。
    2. **切割判定**:
       - 优先尝试 **Y 轴切割 (Rows)**: 寻找垂直方向上的显著间隙，将节点分为多个“行”。
       - 如果 Y 轴不可分，尝试 **X 轴切割 (Columns)**: 寻找水平方向上的显著间隙，将节点分为多个“列”。
    3. **虚拟容器**:
       - 如果发现多行结构，自动创建 `Row` 虚拟容器包裹每行的节点。
       - 如果发现多列结构，自动创建 `Column` 虚拟容器包裹每列的节点。
    4. **递归处理**: 对生成的每一个子分组（行或列）递归执行上述过程，直到无法继续分割。
  - **价值**: 将扁平的节点列表转化为具有语义深度的 Flexbox 树状结构，自动识别并构建网页常见的“左右分栏”、“上下堆叠”等布局模式。

## [v0.1.4] - 2026-02-03

### 父子推导

> **涉及文件**:
>
> - `core/extractors/reparenting.ts` (全新: 父子关系推导算法)
> - `core/extractors/node-walker.ts` (集成: 树重构)

- **基于几何包含关系的父子推导**:
  - **背景**: 彻底解决 Figma 原始图层结构与视觉呈现不一致的问题（例如：按钮在卡片上方但图层结构中是兄弟关系）。
  - **逻辑**:
    1. **打散**: 将清洗后的节点树完全扁平化。
    2. **排序**: 按面积从小到大排序。
    3. **认亲**: 为每个节点寻找**几何上完全包含它**且**面积最小**的“父亲”。
  - **价值**: 无论设计师如何组织图层，生成的 DOM 结构始终严格遵循视觉嵌套关系，显著提升代码的可维护性。
  - **绝对定位推导 (Absolute Positioning Inference)**:
    - **逻辑**: 在重构后的容器内，自动检测相互重叠的子节点。
    - **判定**: 如果兄弟节点发生几何重叠 (AABB Overlap)，将面积较小的节点标记为 `layoutMode: "absolute"`。
    - **场景**: 自动识别并标记悬浮徽标 (Badge)、关闭按钮、装饰性元素等，避免它们挤占 Flex 文档流。

## [v0.1.3] - 2026-02-03

### 小图标合并

> **涉及文件**:
>
> - `core/extractors/spatial-merging.ts` (全新: 并查集聚类算法)
> - `core/extractors/node-walker.ts` (集成: 碎片合并)
> - `package.json` (依赖: uuid)

- **小图标碎片自动聚合**:
  - **背景**: 解决设计稿中大量矢量图标未打组、路径散乱导致生成的 DOM 结构碎片化的问题。
  - **逻辑**: 使用**并查集 (Union-Find)** 算法，对同一层级下的小矢量碎片（<80px）进行空间聚类分析。
  - **判定**: 如果碎片之间**接触** (Gap ≤ 2px) 或**重叠**，则自动将其归并为一个虚拟图标组 (`semanticTag: "icon"`)。
  - **还原**: 智能计算合并后的插入位置（取首个碎片的索引），最大程度保持原始图层的 Z-Index 顺序。

## [v0.1.2] - 2026-02-03

### 遮挡图层过滤

> **涉及文件**:
>
> - `core/extractors/occlusion.ts` (全新: 遮挡检测逻辑)
> - `core/extractors/node-walker.ts` (集成: 遮挡剔除)
> - `package.json` (依赖: martinez-polygon-clipping)

- **完全遮挡剔除 (Full Occlusion Culling)**:
  - 引入了计算几何算法 (Polygon Clipping)，实现了像素级精度的矩形遮挡检测。
  - **逻辑**: 自动计算节点与上层所有不透明图层的重叠面积，如果被完全遮挡（Visible Area ≈ 0），则直接从输出中剔除。
  - **优势**: 能够自动清理被背景图、蒙层覆盖的冗余节点，生成极简的 DOM 结构。

## [v0.1.1] - 2026-01-31

### image 与 icon 类型检测

> **涉及文件**:
>
> - `core/transformers/icon.ts` (图标识别逻辑)
> - `core/transformers/image.ts` (图片/遮罩识别逻辑)
> - `core/extractors/node-walker.ts` (节点遍历与合并逻辑)

- **节点合并算法 (Node Merging Algorithm)**:
  - **图标合并 (Icon Merging)**:
    - 采用多维度启发式策略：优先识别 SVG 导出设置。
    - 尺寸卡控：基础图形 (≤64px)、复杂矢量 (≤120px)、容器 (≤64px)。
    - 结构校验：递归检查子节点，排除文本、Frame 组件等非图标元素，确保包含矢量路径。
  - **图片合并 (Image Merging)**:
    - **Mask Group 识别**: 自动识别包含遮罩 (`isMask: true`) 和图片填充的复杂容器，合并为单一图片节点。
    - **优先级逻辑**: 图片填充 > 遮罩组 > 导出设置 (PNG/JPG) > 命名规则 ("bitmap", "img_")。
  - **空间碎片合并 (Spatial Shard Merging)**:
    - **逻辑**: 使用并查集 (Union-Find) 算法，对同一层级下散落的小矢量碎片（<80px）进行空间聚类。
    - **条件**: 如果碎片之间发生接触 (Gap ≤ 2px) 或重叠，自动将其归并为一个虚拟图标组 (`semanticTag: "icon"`)。
    - **价值**: 解决了设计稿中图标未打组、矢量路径散乱的问题，将其聚合为语义化的整体。

## [v0.1.0] - 2026-01-31

### 初始化配置

> **涉及文件**:
>
> - **提取器 (Extractors)**:
>   - `core/extractors/node-walker.ts` (主遍历逻辑)
>   - `core/extractors/design-extractor.ts` (设计属性提取)
>   - `core/extractors/types.ts` (类型定义)
> - **转换器 (Transformers)**:
>   - `core/transformers/layout.ts` (AutoLayout -> Flexbox)
>   - `core/transformers/style.ts` (颜色/填充/边框)
>   - `core/transformers/text.ts` (排版属性)
>   - `core/transformers/effects.ts` (阴影/模糊)
>   - `core/transformers/component.ts` (组件变体)
> - **工具库 (Utils)**:
>   - `core/utils/common.ts` (通用工具)
>   - `core/utils/identity.ts` (ID/类型检查)

- **算法来源**: 移植了 `figma-context-mcp` (Figma Context MCP) 的核心过滤算法。
- **核心处理链路**:
  1. **遍历与过滤 (Extractors)**: 深度优先遍历节点树，递归剔除不可见节点 (`visible: false`)，过滤无意义的空分组。
  2. **布局转换 (Transformers)**: 将 Figma 的 AutoLayout 映射为 CSS Flexbox，处理主轴/交叉轴对齐及 Hug/Fill 尺寸逻辑。
  3. **样式标准化**: 将物理像素值转换为 CSS 标准单位 (px -> em)，规范化颜色 (RGBA -> Hex/CSS) 及渐变属性。
  4. **全局去重**: 提取复用的颜色与样式定义到全局字典 (`globalVars`)，显著降低 JSON 体积。
