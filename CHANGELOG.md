# 更新日志 (CHANGELOG)

## [Unreleased] - 2025-01-31

### 初始化配置

- **算法来源**: 移植了 `figma-context-mcp` (Figma Context MCP) 的核心过滤算法。
- **核心处理链路**:
  1. **遍历与过滤 (Extractors)**: 深度优先遍历节点树，递归剔除不可见节点 (`visible: false`)，过滤无意义的空分组。
  2. **布局转换 (Transformers)**: 将 Figma 的 AutoLayout 映射为 CSS Flexbox，处理主轴/交叉轴对齐及 Hug/Fill 尺寸逻辑。
  3. **样式标准化**: 将物理像素值转换为 CSS 标准单位 (px -> em)，规范化颜色 (RGBA -> Hex/CSS) 及渐变属性。
  4. **全局去重**: 提取复用的颜色与样式定义到全局字典 (`globalVars`)，显著降低 JSON 体积。

### 功能特性

- **数据清洗**: 实现了基础的属性提取，包括 布局 (Flexbox)、样式 (颜色/渐变)、文本 和 特效。
- **去重机制**: 实现了 `GlobalVars` 机制，将通用样式提取到全局字典中复用。
- **工作流集成**: 验证了 Dify -> 本地服务器 -> LLM 优化的端到端链路。
