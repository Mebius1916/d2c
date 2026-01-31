# 更新日志 (CHANGELOG)

## [v0.1.1] - 2025-01-31

### 核心算法升级

- **节点合并算法 (Node Merging Algorithm)**:
  - **图标合并 (Icon Merging)**:
    - 采用多维度启发式策略：优先识别 SVG 导出设置。
    - 尺寸卡控：基础图形 (≤64px)、复杂矢量 (≤120px)、容器 (≤64px)。
    - 结构校验：递归检查子节点，排除文本、Frame 组件等非图标元素，确保包含矢量路径。
  - **图片合并 (Image Merging)**:
    - **Mask Group 识别**: 自动识别包含遮罩 (`isMask: true`) 和图片填充的复杂容器，合并为单一图片节点。
    - **优先级逻辑**: 图片填充 > 遮罩组 > 导出设置 (PNG/JPG) > 命名规则 ("bitmap", "img_")。

## [v0.1.0] - 2025-01-31

### 初始化配置

- **算法来源**: 移植了 `figma-context-mcp` (Figma Context MCP) 的核心过滤算法。
- **核心处理链路**:
  1. **遍历与过滤 (Extractors)**: 深度优先遍历节点树，递归剔除不可见节点 (`visible: false`)，过滤无意义的空分组。
  2. **布局转换 (Transformers)**: 将 Figma 的 AutoLayout 映射为 CSS Flexbox，处理主轴/交叉轴对齐及 Hug/Fill 尺寸逻辑。
  3. **样式标准化**: 将物理像素值转换为 CSS 标准单位 (px -> em)，规范化颜色 (RGBA -> Hex/CSS) 及渐变属性。
  4. **全局去重**: 提取复用的颜色与样式定义到全局字典 (`globalVars`)，显著降低 JSON 体积。
