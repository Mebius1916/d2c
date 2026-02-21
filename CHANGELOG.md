# 更新日志 (CHANGELOG)

## [v0.1.15] - 2026-02-22

### 抽取管线与 codegen 系列升级

> **涉及文件**:
>
> - `core/extractors/pipeline/design-extractor.ts` (改造: 支持图像/SVG 资源回填与重建参数)
> - `core/extractors/pipeline/reconstruction.ts` (新增: 阶段开关与分步执行)
> - `core/extractors/pipeline/utils/image-assets.ts` (新增: 图片/SVG 资源回填)
> - `core/extractors/pipeline/utils/parse-api.ts` (拆分: API 解析逻辑)
> - `core/extractors/algorithms/occlusion.ts` (优化: 透明填充判断)
> - `core/extractors/algorithms/flattening.ts` (优化: 尺寸一致时允许折叠)
> - `core/extractors/attributes/visuals-extractor.ts` (新增: blendMode/visible 输出)
> - `core/types/extractor-types.ts` / `core/types/simplified-types.ts` (扩展: layout/text/paint/visibility/blendMode)
> - `core/codegen/index.ts` / `core/codegen/context/index.ts` (新增: 统一入口与上下文)
> - `core/codegen/html/*` (增强: 富文本 tag、内联 SVG 组合)
> - `core/codegen/css/*` (增强: 背景层、描边对齐、颜色解析)
> - `core/transformers/*` (增强: 图片 scaleMode/文本样式/渐变工具)
> - `main.ts` (调整: 走带资源解析的提取入口)

- **资源回填与阶段控制 (Assets & Steps)**:
  - **图片/SVG 回填**: 支持 Figma 渲染资源映射到节点与样式。
  - **阶段开关**: 重建流水线支持按阶段启用/禁用。
  - **遮挡检测**: 透明填充判定更准确，减少误遮挡。
- **样式与类型扩展 (Styles & Types)**:
  - **可见性与混合模式**: 输出 `visible` 与 `blendMode`，并参与节点样式构建。
  - **布局与文本补齐**: layout 增加尺寸与文本自适应信息，文本补充 OpenType 与 trim 信息。
- **Codegen 输出增强 (HTML/CSS)**:
  - **HTML**: 富文本按语义标签输出，SVG 支持组合渲染。
  - **CSS**: 背景图层、混合模式、描边对齐与多重边框处理优化。
- **冗余折叠优化 (Flatten Redundant)**:
  - **放宽条件**: 仅尺寸 layout 且边界与子节点一致时允许折叠。
  - **安全边界**: 仍保留 padding/gap/对齐/定位/滚动等布局影响的阻断条件。

## [v0.1.14] - 2026-02-20

### 文本样式对齐与 codegen 入口收敛

> **涉及文件**:
>
> - `core/transformers/text.ts` (增强: 富文本分段附带 effects 与样式归一)
> - `core/transformers/utils/text-utils.ts` (新增: 行高/字距/变量名解析工具)
> - `core/extractors/attributes/text-extractor.ts` (调整: richText 兜底分段补充 effects)
> - `core/codegen/css/utils/text-style.ts` (增强: 段落 effects 参与 styleId 合成)
> - `core/codegen/html/index.ts` (新增: generateHTMLParts 拆分)
> - `core/codegen/context/index.ts` (新增: codegen 上下文构建)
> - `core/codegen/index.ts` (调整: 唯一 codegen 入口函数)
> - `run-codegen.ts` (调整: 使用统一 codegen 入口)
>
- **文本对齐 (Text Alignment)**:
  - **行高/字距**: 统一以 px 结果输出，避免百分比导致的渲染不一致。
  - **富文本 effects**: 每个 segment 合入相同的文本效果，保证拆分后的视觉一致性。
- **codegen 入口收敛 (Single Entry)**:
  - **统一入口**: 对外仅暴露 `codegen(design)`，返回 `{ html, css, body, context }`。
  - **上下文复用**: HTML 与 CSS 共享同一 context，避免样式 id 不一致。
- **HTML 生成健壮性 (HTML Generation)**:
  - **可见性过滤**: 生成阶段跳过不可见节点，避免无效 DOM 输出。

## [v0.1.13] - 2026-02-19

### 文本与语义推断增强

> **涉及文件**:
>
> - `core/extractors/attributes/text-extractor.ts` (增强: 输出 richText 分段)
> - `core/transformers/text.ts` (重构: 富文本切分与样式合并)
> - `core/extractors/pipeline/reconstruction.ts` (新增: 语义推断阶段)
> - `core/extractors/algorithms/utils/virtual-node.ts` (扩展: 语义标签集合)
> - `core/extractors/pipeline/design-extractor.ts` (新增: 样式归一化)
> - `core/types/extractor-types.ts` (新增: Composite/Node 样式类型)
> - `core/utils/style-helper.ts` (新增: 节点样式构建与样式引用聚合)
> - `core/extractors/algorithms/utils/fingerprint.ts` (优化: 统一哈希实现)
> - `run-codegen.ts` (调整: HTML 生成入口)
>
- **富文本分段 (Rich Text Segments)**:
  - **改进**: textExtractor 输出 `richText` 分段数据，支持基于 override 表拆分文本并合并样式。
  - **回退**: 没有 override 时退化为单段文本，保证输出稳定。
- **语义推断 (Semantic Inference)**:
  - **新增**: 重建流程引入语义推断阶段，补充 `semanticTag` 推导。
  - **扩展**: 标签集合覆盖 `header/nav/section/article/aside/main` 与 `h1-h6`。
- **样式归一化与类型补全 (Style Normalization)**:
  - **新增**: 引入 `SimplifiedNodeStyle` 与 `SimplifiedCompositeStyle`，合并样式引用与节点样式字段。
  - **工具**: `style-helper` 增加样式引用聚合与节点样式构建工具。
- **指纹与生成入口优化 (Fingerprint & Codegen)**:
  - **统一**: 视觉指纹计算改为复用统一的 FNV 哈希实现。
  - **入口**: HTML 生成入口调整为 `core/codegen/html/index`。

## [v0.1.12] - 2026-02-13

### 节点清理与空容器剪枝优化

> **涉及文件**:
>
> - `core/utils/node-check.ts` (新增/合并: `shouldPruneNode`)
> - `core/extractors/pipeline/utils/core-process.ts` (优化: 使用统一剪枝逻辑)
> - `core/extractors/pipeline/node-processor.ts` (优化: 布局阶段新增空容器剪枝)
> - `core/extractors/pipeline/core-process.ts` (删除: 冗余文件)

- **统一节点剪枝逻辑 (Unified Pruning Logic)**:
  - **背景**: 项目中存在多处判断“是否为空节点”的逻辑（`isNodeEmpty` 和 `shouldPruneNode`），且逻辑分散在不同阶段，维护成本高。
  - **改进**:
    - 将 `isNodeEmpty` 和 `shouldPruneNode` 合并为唯一的 `shouldPruneNode` 函数。
    - 明确了剪枝标准：无子节点 + 无可见样式 + 非内容节点（Text/Image/SVG）= 可剪枝。

- **布局阶段增强 (Layout Phase Enhancement)**:
  - **背景**: 布局重建算法（分组、展平）执行后，可能会产生新的“空容器”（例如子节点被展平移走后的父容器），这些残留容器会污染最终代码。
  - **改进**:
    - 在 `node-processor.ts` 的后序遍历（Post-Order Traversal）阶段，引入了额外的剪枝步骤。
    - 利用 `walkTreePostOrder` 的自底向上特性，确保所有因重组产生的空壳都能被及时清理。

- **代码库清理 (Codebase Cleanup)**:
  - **删除**: 移除了不再使用的 `core/extractors/pipeline/core-process.ts` 文件（已被 `utils/core-process.ts` 替代）。
  - **类型修正**: 修正了 `SimplifiedNode` 类型定义，移除了未使用的 `semanticTag`，规范了 `type` 枚举。

## [v0.1.11] - 2026-02-12

### 父子推导算法重构

> **涉及文件**:
>
> - `core/extractors/algorithms/reparenting.ts` (重构: 父子关系推导算法)

- **基于图层顺序的递归推导 (Layer-Based Recursive Reparenting)**:
  - **背景**: 废弃原有的“全局拍扁+面积排序”算法，解决其无法正确处理复杂层级（如 Mask、Background）归属的问题。
  - **新逻辑**:
    1. **尊重 Z-Index**: 严格遵循 Figma 原始图层顺序（Bottom-to-Top），优先让底层元素（如背景卡片）捕获其上方的浮动元素（如按钮、文本）。
    2. **递归分治**: 摒弃全局扁平化，采用递归策略，以容器为单位局部重组，提升算法效率与稳定性。
    3. **去递归优化**: 移除内部递归调用，依赖外部 Pipeline 的递归机制，避免重复计算。
  - **价值**: 生成的 DOM 结构严格遵循“视觉堆叠上下文”，完美还原“背景包含内容”的常规布局逻辑。

### 样式检测统一与代码去重

> **涉及文件**:
>
> - `core/utils/node-check.ts` (新增: 统一的样式检查工具)
> - `core/extractors/algorithms/flattening.ts` (优化: 复用样式检查)
> - `core/extractors/algorithms/occlusion.ts` (优化: 复用样式检查)
> - `core/transformers/icon.ts` (增强: 图标识别策略)
> - `core/transformers/image.ts` (优化: 图片/遮罩识别)

- **样式检测收敛 (Unified Style Checking)**:
  - **背景**: 多个模块（扁平化、遮挡剔除、图标识别）各自实现了重复的“是否有可见样式”检查逻辑，且覆盖度不一致。
  - **改进**:
    - 在 `core/utils/node-check.ts` 中封装通用的 `hasVisibleStyles` 函数。
    - 统一支持 Fills, Strokes, Effects 及 BorderRadius 的检测。
    - 所有下游模块全部迁移至该统一接口，消除了代码冗余并提升了判定一致性。

- **转换器增强 (Transformers Polish)**:
  - **图标识别**:
    - 支持仅有边框/背景样式的空容器作为图标（常见于占位符或装饰框）。
    - 扩展 `COMPLEX_VECTOR` 识别范围，纳入 `STAR` 和 `POLYGON`。
  - **图片/遮罩识别**:
    - 优化 Mask Group 判定：只要是遮罩组且不含文本节点，即视为图片组件（不再强制要求包含 Image Fill），有效减少了误判。

## [v0.1.10] - 2026-02-11

### 遮挡检测优化与性能提升

> **核心变更**:
>
> - **遮挡剔除 V3**: 引入精确的区域减法算法，支持部分遮挡检测，避免误删可见内容。
> - **性能优化**: 样式查找引入 O(1) 缓存机制，显著提升样式去重效率。
> - **架构简化**: 移除 `node-walker.ts` 和 `svg-helper.ts`，逻辑收敛至 `node-processor.ts`。

- **遮挡剔除 (Occlusion Culling)**:
  - **背景**: 原算法只能检测全遮挡，无法处理部分遮挡的情况，且逻辑较为简单。
  - **改进**:
    - **精确计算**: 使用 `subtractRect` 算法，递归计算节点的剩余可见区域。
    - **部分可见性**: 只要节点存在非空的可见区域，且该区域内有内容（文本、图标、自身样式），即保留节点。
    - **逻辑**: 重写 `removeOccludedNodes`，支持复杂的遮挡场景。

- **性能优化 (Performance)**:
  - **样式缓存**: `findOrCreateVar` 新增 `styleCache` (Map)，避免在大规模节点处理时的 O(n) 查找开销。

- **代码重构 (Refactoring)**:
  - **流程整合**: 将 `extractFromDesign` 逻辑移入 `node-processor.ts`，消除循环依赖，简化调用链。
  - **递归合并**: 将原本分离的节点遍历与结构重构合并为单次递归过程，在回溯阶段即时完成子树重构，避免二次遍历。
  - **清理**: 删除冗余的 `core/extractors/pipeline/node-walker.ts` 和 `core/utils/svg-helper.ts`。

## [v0.1.9] - 2026-02-10

### 类型系统重构与提取器优化

> **核心变更**:
>
> - **类型系统重构**: 将分散的类型定义统一迁移至 `core/types`，建立更严谨的 `SimplifiedNode` 和 `StyleTypes` 类型体系。
> - **提取器纯函数化**: 重构所有 Extractor 为返回 `Partial<SimplifiedNode>` 的纯函数，消除副作用，提升代码健壮性。
> - **工具库增强**: 新增 `isNodeEmpty` 等节点检查工具，优化图标和文本的提取逻辑。

- **类型系统 (Type System)**:
  - 新增 `core/types/simplified-types.ts`，定义所有 Simplified 节点的原子属性接口。
  - 将 `core/extractors/types.ts` 迁移至 `core/types/extractor-types.ts`，统一管理提取器上下文类型。

- **算法增强 (Algorithm)**:
  - **Text Transformer**: 大幅增强文本样式解析逻辑，支持更复杂的排版属性。
  - **Style Transformer**: 简化样式解析逻辑，移除大量冗余代码 (-108 lines)。
  - **Icon Transformer**: 优化图标识别策略。

- **代码质量 (Code Quality)**:
  - **Extractors**: 移除对 `result` 对象的直接修改，改为返回提取结果对象。
  - **Dependencies**: 清理项目中的无效引用。

## [v0.1.8] - 2026-02-06

### 架构重构与算法增强

> **核心变更**:
>
> - **文件结构重组**: 按职责划分为 `algorithms`, `attributes`, `pipeline`，并将工具函数下沉，显著提升代码可维护性。
> - **遮挡检测重写**: 弃用多边形裁剪库，改用 AABB 包围盒检测，大幅提升鲁棒性。
> - **输出净化**: 自动清理内部指纹字段，修复节点丢失问题。
> - **结构优化**: 新增冗余层级扁平化算法。

- **冗余层级扁平化 (Flatten Redundant Groups)**:

  - **背景**: 消除为了 Auto Layout 而产生的无意义嵌套容器，解决“div 地狱”问题。
  - **逻辑**: 递归识别并提升仅含单子节点且无样式/无布局影响的 Frame/Group。
- **遮挡剔除算法升级 (Occlusion Culling v2)**:

  - **背景**: 原 `martinez-polygon-clipping` 库在处理空数组或特定几何时易崩溃，且性能开销大。
  - **改进**:
    - **移除依赖**: 彻底移除 `martinez-polygon-clipping`。
    - **AABB 检测**: 采用 Axis-Aligned Bounding Box (矩形包围盒) 算法进行遮挡判定。
    - **鲁棒性**: 修复了因 `absRect` 缺失导致所有节点被误判为遮挡的 Bug。
- **工程化重构 (Architecture Refactor)**:

  - **模块化**: 将 `core/extractors` 拆分为：
    - `algorithms/`: 核心布局推断算法 (Clustering, List, Occlusion...)
    - `attributes/`: 属性提取器 (Layout, Text, Visuals...)
    - `pipeline/`: 调度流水线 (DesignExtractor, NodeWalker...)
  - **工具库下沉**: 将通用 Utils 移至 `core/utils`，业务 Utils 下沉至各模块内部，实现高内聚。
- **输出质量优化 (Output Polish)**:

  - **数据完整性**: 修复 `layoutExtractor` 逻辑，确保 `absRect` 正确回填，保证后续算法链正常运行。
  - **字段净化**: 输出前自动剔除 `visualSignature` 等内部调试字段，产出纯净 JSON。
  - **测试增强**: `run-test.ts` 支持自动识别并解包嵌套的 API 响应格式。

## [v0.1.7] - 2026-02-05

### 元素相邻成组

> **涉及文件**:
>
> - `core/extractors/adjacency-clustering.ts` (全新: 密度聚类算法)
> - `core/extractors/node-walker.ts` (集成: 相邻聚类)
> - `core/utils/virtual-node.ts` (重构: 统一虚拟节点创建)

- **相邻内容聚类 (Adjacency Clustering)**:
  - **背景**: 解决经过层层清洗后，仍有部分“孤儿节点”（如标题与副标题）虽然紧密相邻但未被归类的问题。
  - **逻辑**:
    1. **候选筛选**: 仅针对散落的原子节点（文本、图片、SVG）进行处理，跳过已成型的容器。
    2. **密度检测**: 采用简化版 DBSCAN 思想，基于 Union-Find (并查集) 算法，计算两两节点之间的物理距离。
    3. **动态阈值**: 根据节点类型对（如 Text-Text 吸引力强，Image-Text 吸引力中）动态调整判定距离阈值。
    4. **自动成组**: 将满足密度条件的节点聚合成 `Content Group` 虚拟容器。
  - **价值**: 模拟人类视觉归类本能，将逻辑上紧密相关的内容（如 Card Header 里的 Title + Date）自动“粘”在一起，进一步提升 DOM 结构的语义性。

## [v0.1.6] - 2026-02-05

### 列表循环推导

> **涉及文件**:
>
> - `core/utils/fingerprint.ts` (全新: 视觉指纹生成)
> - `core/extractors/list-inference.ts` (全新: 列表模式挖掘)
> - `core/extractors/node-walker.ts` (集成: 列表推导)

- **列表循环识别 (List Loop Inference)**:
  - **背景**: 仅仅有 Row/Column 结构是不够的，我们需要识别出“循环列表”的语义，以便生成 `v-for` 或 `.map()` 代码。
  - **逻辑**:
    1. **视觉指纹 (Visual Fingerprinting)**: 为每个节点生成唯一的视觉 Hash。包含：节点类型、语义标签、尺寸（5px容差）、关键样式（颜色、字号、圆角）以及**递归结构指纹**。
    2. **模式挖掘 (Pattern Mining)**: 扫描容器内的子节点序列，寻找连续重复的指纹模式（如 `A A A` 或 `A B A B`）。
    3. **虚拟列表容器**: 将识别出的循环项自动包裹在 `List` (`semanticTag: "list"`) 虚拟容器中，并自动推导列表方向（垂直/水平）和间距 (Item Spacing)。
  - **价值**: 将重复的 DOM 结构转化为语义化的 List 数据结构，直接对应前端框架的循环渲染指令。

## [v0.1.5] - 2026-02-05

### 布局行列分组

> **涉及文件**:
>
> - `core/extractors/layout-grouping.ts` (全新: 智能递归投影切割算法)
> - `core/extractors/node-walker.ts` (集成: 递归布局分组)
> - `package.json` (依赖: uuid)

- **智能递归投影切割算法 (Smart Recursive Projection Cutting)**:
  - **背景**: 将散乱的绝对定位节点（Canvas 布局）自动推导为结构化的 Flexbox (`Row` / `Column`) 布局，为后续生成高质量代码打下基础。
  - **逻辑**:
    1. **动态阈值切割**: 基于当前容器元素的平均尺寸，动态计算最小分割间隙 (Gap)，适应不同密度的设计稿。
    2. **竞争决策 (Competitive Decision)**: 同时尝试 X 轴 (列) 和 Y 轴 (行) 切割，通过评分系统决定最佳方向。
       - **对齐代价 (Alignment Cost)**: 计算每行/每列内部元素的中心对齐度（方差），越整齐代价越低。
       - **相似度代价 (Similarity Cost)**: 计算切分后各组的面积一致性，越均匀代价越低（适用于 Grid/List）。
    3. **虚拟容器**: 自动创建 `Row`/`Column` 容器，并包含**冗余嵌套优化**（自动去除多余的单层嵌套）。
    4. **递归处理**: 对生成的每一个子分组递归执行上述过程，直到无法继续分割。
  - **价值**: 能够智能识别复杂布局（如 Grid、瀑布流），生成的 DOM 结构不仅逻辑正确，而且符合人类“视觉审美”，极大减少了冗余层级。

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
