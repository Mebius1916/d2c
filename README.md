# Figma To Code

这是一个核心引擎模块，用于提取、清洗和标准化 Figma REST API 返回的原始 JSON 数据。它将庞大、复杂的物理设计数据转换为开发者友好的、CSS 就绪的 JSON 格式，作为 Design-to-Code (D2C) 工作流中的 ETL (提取-转换-加载) 管道。

## 📂 目录结构

```
core/
├── extractors/           # 提取流水线 ("Extract" 阶段)
│   ├── algorithms/       # 高级推断算法
│   │   ├── layout-grouping.ts    # 布局投影切割 (Row/Column)
│   │   ├── list-inference.ts     # 循环列表推导 (v-for)
│   │   ├── adjacency-clustering.ts # 密度聚类 (Content Group)
│   │   ├── occlusion.ts          # 遮挡剔除 (AABB)
│   │   ├── flattening.ts         # 冗余扁平化
│   │   └── reparenting.ts        # 视觉父子重组
│   ├── attributes/       # 属性提取器
│   │   ├── layout-extractor.ts   # 几何属性
│   │   ├── text-extractor.ts     # 文本属性
│   │   └── visuals-extractor.ts  # 视觉属性
│   ├── pipeline/         # 调度核心
│   │   ├── design-extractor.ts   # 主入口
│   │   ├── node-walker.ts        # 遍历引擎
│   │   └── node-processor.ts     # 单节点处理
│   └── types.ts          # 类型定义
├── transformers/         # 数据转换器 ("Transform" 阶段)
│   ├── layout.ts         # Flexbox 转换
│   ├── style.ts          # 颜色/渐变
│   ├── icon.ts           # 图标识别
│   └── ...
└── utils/                # 通用工具
    ├── common.ts         # 基础函数
    ├── geometry.ts       # 几何计算
    └── network-utils.ts  # 资源下载
```

## 🔄 数据流转链路 (Data Pipeline)

数据在引擎中的流动遵循 **"Parse -> Traverse -> Transform -> Reconstruct"** 的四阶段处理模式：

```text
[Figma Raw JSON]
      ⬇️
[design-extractor.ts] (入口: Parse & Normalize)
      ⬇️
[node-walker.ts] (Orchestrator: 遍历与调度)
      ⬇️
   ┌─ 1. Traversal & Extraction (自顶向下) ───────────────┐
   │  • Node Processor (单节点处理)                        
   │    ├─ Layout Extractor  (AutoLayout -> Flex)        │──> absRect, layout
   │    ├─ Text Extractor    (Style -> Typography)       │──> textStyle
   │    └─ Visuals Extractor (Fills/Strokes -> CSS)      │──> fills, effects
   │                                                    
   │  • Recursion (递归处理子节点...)                      
   └─────────────────────────────────────────────────────┘
      ⬇️
   ┌─ 2. Structure Reconstruction (自底向上) ────────────┐
   │  • Occlusion Culling (遮挡剔除: AABB检测)          
   │  • Spatial Merging   (碎片合并: Icon/Image)              
   │  • Reparenting       (父子重组: 视觉包含关系)         
   │  • Layout Grouping   (布局推断: Row/Column)           
   │  • List Inference    (列表识别: v-for)                
   │  • Flattening        (结构优化: 去除冗余层级)        
   └───────────────────────────────────────────────────┘
      ⬇️
[Cleaned JSON] (Structured Nodes + Global Styles)
```
