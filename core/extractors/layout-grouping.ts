
/*
  切片逻辑只会发生在同一层级，切片后按行列进行分组，
  根据行列元素的位置关系进行打分，取分数较低的方向作为布局方向。
  打分算法分为两个方面：
  1. 对齐代价 (Alignment Cost)：
     计算行列组中心点的偏差值（斜率），偏差值越小，说明对齐越紧密。
  2. 相似度代价 (Similarity Cost)：
     计算行列组面积的方差，方差越小，说明元素的面积越相似。
*/
import type { SimplifiedNode } from "./types.js";
import { v4 as uuidv4 } from "uuid";
import { getUnionRect, type BoundingBox } from "../utils/geometry.js";

export function groupNodesByLayout(nodes: SimplifiedNode[]): SimplifiedNode[] {
  // 排除绝对定位的节点
  const flowNodes = nodes.filter(n => n.layoutMode !== "absolute");
  const absoluteNodes = nodes.filter(n => n.layoutMode === "absolute");

  if (flowNodes.length <= 1) {
    return [...flowNodes, ...absoluteNodes];
  }

  // 计算动态 GAP 阈值
  // 逻辑：取平均尺寸的 5% 作为最小间隙，且不小于 2px。
  // 如果是切行 (Y轴)，参考平均高度；如果是切列 (X轴)，参考平均宽度。
  const avgWidth = flowNodes.reduce((sum, n) => sum + (n.absRect?.width || 0), 0) / flowNodes.length;
  const avgHeight = flowNodes.reduce((sum, n) => sum + (n.absRect?.height || 0), 0) / flowNodes.length;
  
  const gapX = Math.max(2, avgWidth * 0.05);
  const gapY = Math.max(2, avgHeight * 0.05);

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
    // 比如 3 列 Card，每列长得都很像，那么 ColSimilarityCost 就会很低
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
      // 如果 processedGroup 只有一个元素，且这个元素本身就是 Row，那直接返回它，不要再包一层 Row
      if (processedGroup.length === 1) {
         const child = processedGroup[0];
         // 如果孩子也是 Row，直接返回孩子（去壳）
         if (child.type === "FRAME" && child.name === "Row") {
            return child;
         }
         // 如果孩子是普通节点，包一层
         if (child.type !== "FRAME") {
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
         if (child.type === "FRAME" && child.name === "Column") {
            return child;
         }
         if (child.type !== "FRAME") {
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
 * 对应图中的 "1.3 对比行列相似度"
 * 
 * 核心逻辑：计算分组的“尺寸一致性”。
 * 如果切出来的每一组大小都差不多（方差小），说明这个方向切对了结构（比如 Grid 的列）。
 * 如果切出来的大小差异巨大，说明可能切得不对劲。
 */
function calculateSimilarityCost(groups: SimplifiedNode[][]): number {
  if (groups.length <= 1) return 0;

  // 计算每组的面积
  const areas = groups.map(group => {
    const rects = group.map(n => n.absRect).filter((r): r is BoundingBox => !!r);
    const union = getUnionRect(rects);
    return union ? union.width * union.height : 0;
  });

  // 计算平均面积
  const avgArea = areas.reduce((a, b) => a + b, 0) / areas.length;
  if (avgArea === 0) return 0;

  const variance = areas.reduce((sum, area) => sum + Math.pow(area - avgArea, 2), 0);
  
  // 计算面积方差 (Variance)
  return variance / (Math.pow(avgArea, 2) * groups.length);
}

/**
 * 计算对齐代价 (Alignment Cost)
 * 对应图中的 "1.2 对比行列斜率"
 * 
 * 如果是 Row 分组，我们希望每一行内部的元素在垂直方向上高度对齐 (Top/Center/Bottom 一致)。
 * 如果参差不齐，说明这可能不是真正的行。
 */
function calculateAlignmentCost(groups: SimplifiedNode[][], direction: "row" | "column"): number {
  let totalCost = 0;

  for (const group of groups) {
    if (group.length <= 1) continue;

    // 计算该组所有节点的中心点平均值
    const centers = group.map(n => {
      if (!n.absRect) return 0;
      return direction === "row" 
        ? n.absRect.y + n.absRect.height / 2  // Row: 关注 Y 轴中心
        : n.absRect.x + n.absRect.width / 2;  // Col: 关注 X 轴中心
    });
    
    const avgCenter = centers.reduce((a, b) => a + b, 0) / centers.length;

    const variance = centers.reduce((sum, c) => sum + Math.pow(c - avgCenter, 2), 0);
  
    // 计算方差 (variance / group.length) 作为代价
    totalCost += variance / group.length;
  }

  // 平均每组的代价
  return totalCost / groups.length;
}

function splitByProjection(nodes: SimplifiedNode[], axis: "x" | "y", minGap: number): SimplifiedNode[][] {
  if (nodes.length === 0) return [];

  nodes.sort((a, b) => getStart(a, axis) - getStart(b, axis));

  const groups: SimplifiedNode[][] = [];
  let currentGroup: SimplifiedNode[] = [nodes[0]];
  let currentEnd = getEnd(nodes[0], axis);

  for (let i = 1; i < nodes.length; i++) {
    const node = nodes[i];
    const start = getStart(node, axis);
    const end = getEnd(node, axis);

    // Check for gap using dynamic threshold
    if (start > currentEnd + minGap) {
      groups.push(currentGroup);
      currentGroup = [node];
      currentEnd = end;
    } else {
      currentGroup.push(node);
      currentEnd = Math.max(currentEnd, end);
    }
  }
  groups.push(currentGroup);

  return groups;
}

function getStart(node: SimplifiedNode, axis: "x" | "y"): number {
  return node.absRect ? node.absRect[axis] : 0;
}

function getEnd(node: SimplifiedNode, axis: "x" | "y"): number {
  if (!node.absRect) return 0;
  const size = axis === "x" ? node.absRect.width : node.absRect.height;
  return node.absRect[axis] + size;
}

function createVirtualContainer(children: SimplifiedNode[], direction: "row" | "column"): SimplifiedNode {
  const rects = children.map(c => c.absRect).filter((r): r is BoundingBox => !!r);
  const unionRect = getUnionRect(rects);

  return {
    id: `virtual-layout-${uuidv4()}`,
    name: direction === "row" ? "Row" : "Column",
    type: "FRAME",
    layoutMode: "relative",
    layout: {
      layoutMode: direction === "row" ? "HORIZONTAL" : "VERTICAL",
      primaryAxisAlignItems: "MIN",
      counterAxisAlignItems: "MIN",
      itemSpacing: 0,
    } as any,
    absRect: unionRect,
    children: children,
  };
}
