
import type { SimplifiedNode } from "../../types/extractor-types.js";
import { getNodeBoundingBox, getUnionRect } from "../../utils/geometry.js";
import { createVirtualFrame } from "./utils/virtual-node.js";
import { calculateLayoutGap } from "./utils/dynamic-threshold.js";
import type { BoundingBox } from "../../types/simplified-types.js";

export function groupNodesByLayout(nodes: SimplifiedNode[]): SimplifiedNode[] {
  nodes.forEach((node) => {
    if (node.dirty && node.children && node.children.length > 0) {
      node.children = groupNodesByLayout(node.children);
    }
  });

  // 排除绝对定位的节点
  const flowNodes = nodes.filter(n => n.layoutMode !== "absolute");
  const absoluteNodes = nodes.filter(n => n.layoutMode === "absolute");

  if (flowNodes.length <= 1) {
    return [...flowNodes, ...absoluteNodes];
  }

  // 计算动态 GAP 阈值
  // 逻辑：取平均尺寸的 5% 作为最小间隙，且不小于 2px。
  const gapX = calculateLayoutGap(flowNodes, "x");
  const gapY = calculateLayoutGap(flowNodes, "y");

  // 1. 试探性切割：同时尝试 X 轴和 Y 轴
  const rowGroups = splitByProjection(flowNodes, "y", gapY);
  const colGroups = splitByProjection(flowNodes, "x", gapX);

  const canSplitRow = rowGroups.length > 1;
  const canSplitCol = colGroups.length > 1;

  // 2. 决策逻辑
  let bestDirection: "row" | "column" | "none" = "none";

  if (!canSplitRow && !canSplitCol) {
    bestDirection = "none";
  } else if (canSplitRow && !canSplitCol) {
    bestDirection = "row";
  } else if (!canSplitRow && canSplitCol) {
    bestDirection = "column";
  } else {
    // 3. 竞争决策：两边都能切开 (Grid 布局或稀疏布局)
    // 综合计算 "对齐代价" (Alignment Cost) 和 "相似度代价" (Similarity Cost)
    
    // 对齐代价：越整齐越好 (Cost 越低)
    const rowAlignCost = calculateAlignmentCost(rowGroups, "row");
    const colAlignCost = calculateAlignmentCost(colGroups, "column");

    // 相似度代价：切出来的子组越像越好 (Cost 越低)
    const rowSimCost = calculateSimilarityCost(rowGroups);
    const colSimCost = calculateSimilarityCost(colGroups);

    // 综合评分 (权重可调，目前 1:1)
    const rowTotalCost = rowAlignCost + rowSimCost;
    const colTotalCost = colAlignCost + colSimCost;

    // 谁的代价小选谁；如果代价一样，遵循 Web 标准 "Row First" (自上而下)
    bestDirection = rowTotalCost <= colTotalCost ? "row" : "column";
  }

  // 4. 根据决策结果处理
  if (bestDirection === "row") {
    const processedRows = rowGroups.map(group => {
      if (group.length === 1) return group[0];
      
      const processedGroup = groupNodesByLayout(group);
      
      // 优化：防止冗余嵌套 (Row inside Row)
      if (processedGroup.length === 1) {
         const child = processedGroup[0];
         // 如果孩子也是 Row，直接返回孩子（去壳）
         if (child.type === "CONTAINER" && child.name === "Row") {
            return child;
         }
         // 如果孩子是普通节点，包一层
         if (child.type !== "CONTAINER") {
            return createVirtualContainer(processedGroup, "row");
         }
         return child;
      }
      
      return createVirtualContainer(processedGroup, "row");
    });
    return [...processedRows, ...absoluteNodes];
  } else if (bestDirection === "column") {
    const processedCols = colGroups.map(group => {
      if (group.length === 1) return group[0];
      
      const processedGroup = groupNodesByLayout(group);
      
      // 优化：防止冗余嵌套 (Column inside Column)
      if (processedGroup.length === 1) {
         const child = processedGroup[0];
         if (child.type === "CONTAINER" && child.name === "Column") {
            return child;
         }
         if (child.type !== "CONTAINER") {
            return createVirtualContainer(processedGroup, "column");
         }
         return child;
      }
      
      return createVirtualContainer(processedGroup, "column");
    });
    return [...processedCols, ...absoluteNodes];
  }

  return [...flowNodes, ...absoluteNodes];
}

/**
 * 计算相似度代价 (Similarity Cost)
 * 使用变异系数 (CV) 进行无量纲化评分
 * CV = 标准差 / 平均值
 */
function calculateSimilarityCost(groups: SimplifiedNode[][]): number {
  if (groups.length <= 1) return 0;

  // 计算每组的面积
  const areas = groups.map(group => {
    const rects = group.map(n => n.absRect).filter((r): r is BoundingBox => !!r);
    const union = getUnionRect(rects);
    return union ? union.width * union.height : 0;
  });

  // 计算统计量
  const avgArea = areas.reduce((a, b) => a + b, 0) / areas.length;
  if (avgArea === 0) return 0;

  const variance = areas.reduce((sum, area) => sum + Math.pow(area - avgArea, 2), 0) / areas.length;
  const stdDev = Math.sqrt(variance);
  
  // 返回变异系数 (CV)
  return stdDev / avgArea;
}

/**
 * 计算对齐代价 (Alignment Cost)
 * 使用变异系数 (CV) 进行无量纲化评分
 */
function calculateAlignmentCost(groups: SimplifiedNode[][], direction: "row" | "column"): number {
  let totalCV = 0;
  let validGroups = 0;

  for (const group of groups) {
    if (group.length <= 1) continue;

    // 计算该组所有节点的中心点
    const centers = group.map(n => {
      if (!n.absRect) return 0;
      return direction === "row" 
        ? n.absRect.y + n.absRect.height / 2  // Row: 关注 Y 轴中心
        : n.absRect.x + n.absRect.width / 2;  // Col: 关注 X 轴中心
    });
    
    const avgCenter = centers.reduce((a, b) => a + b, 0) / centers.length;
    if (avgCenter === 0) continue;

    const variance = centers.reduce((sum, c) => sum + Math.pow(c - avgCenter, 2), 0) / centers.length;
    const stdDev = Math.sqrt(variance);
  
    // 累加该组的 CV
    totalCV += stdDev / Math.abs(avgCenter);
    validGroups++;
  }

  // 返回平均 CV
  return validGroups > 0 ? totalCV / validGroups : 0;
}

// 分行或者分列，根据投影轴和最小间隔进行切片
function splitByProjection(nodes: SimplifiedNode[], axis: "x" | "y", minGap: number): SimplifiedNode[][] {
  if (nodes.length === 0) return [];

  // 排序：按起始坐标从小到大
  nodes.sort((a, b) => {
    const rectA = getNodeBoundingBox(a);
    const rectB = getNodeBoundingBox(b);
    const startA = rectA ? rectA[axis] : 0;
    const startB = rectB ? rectB[axis] : 0;
    return startA - startB;
  });

  const groups: SimplifiedNode[][] = [];
  let currentGroup: SimplifiedNode[] = [nodes[0]];
  const firstRect = getNodeBoundingBox(nodes[0]);
  let currentEnd = firstRect
    ? firstRect[axis] + (axis === "x" ? firstRect.width : firstRect.height)
    : 0;

  for (let i = 1; i < nodes.length; i++) {
    const node = nodes[i];
    const rect = getNodeBoundingBox(node);
    const start = rect ? rect[axis] : 0;
    const end = rect ? start + (axis === "x" ? rect.width : rect.height) : 0;

    // 是否分列
    if (start > currentEnd + minGap) {
      groups.push(currentGroup);
      currentGroup = [node]; // 恢复现场
      currentEnd = end;
    } else {
      currentGroup.push(node);
      currentEnd = Math.max(currentEnd, end);
    }
  }
  groups.push(currentGroup);

  return groups;
}

function createVirtualContainer(children: SimplifiedNode[], direction: "row" | "column"): SimplifiedNode {
  return createVirtualFrame({
    name: direction === "row" ? "Row" : "Column",
    type: "CONTAINER",
    layout: {
      layoutMode: direction === "row" ? "HORIZONTAL" : "VERTICAL",
      primaryAxisAlignItems: "MIN",
      counterAxisAlignItems: "MIN",
      itemSpacing: 0,
    },
    children: children,
    dirty: true
  });
}
