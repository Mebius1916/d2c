# 更新日志 (CHANGELOG)

## [v0.1.2] - 2026-02-03

### 新增小图标合并算法

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

### 新增图片遮挡检测算法

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

### 新增image与 icon 识别算法

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
