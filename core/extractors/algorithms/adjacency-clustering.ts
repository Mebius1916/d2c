import type { SimplifiedNode } from "../types.js";
import { createVirtualFrame } from "./utils/virtual-node.js";
import { areRectsTouching } from "../../utils/geometry.js";
import { UnionFind } from "./utils/union-find.js";
import { calculateAdjacencyThreshold } from "./utils/dynamic-threshold.js";

export function groupNodesByAdjacency(nodes: SimplifiedNode[]): SimplifiedNode[] {
  // 0. Recursively process children first (Bottom-Up Traversal)
  nodes.forEach(node => {
    if (node.children && node.children.length > 0) {
      node.children = groupNodesByAdjacency(node.children);
    }
  });

  if (nodes.length < 2) return nodes;

  const candidates: { index: number; node: SimplifiedNode }[] = [];
  const others: { index: number; node: SimplifiedNode }[] = [];

  nodes.forEach((node, i) => {
    if (isClusterCandidate(node)) {
      candidates.push({ index: i, node });
    } else {
      others.push({ index: i, node });
    }
  });

  if (candidates.length < 2) return nodes;

  // 初始化一个并查集用于元素分组（只存索引）
  const uf = new UnionFind(candidates.length);

  // 并查集的 check 操作
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const nodeA = candidates[i].node;
      const nodeB = candidates[j].node;
      
      // Dynamic Threshold Calculation
      const threshold = calculateAdjacencyThreshold(nodeA, nodeB);
      
      if (areRectsTouching(nodeA.absRect!, nodeB.absRect!, threshold)) {
        uf.union(i, j);
      }
    }
  }

  const groupIndices = uf.getGroups(); // 索引集合
  const clusters = new Map<number, { index: number; node: SimplifiedNode }[]>(); // 索引对应的元素集合
  
  // 通过 idx 映射索引到具体节点
  for (const [root, indices] of groupIndices) {
    const items = indices.map(idx => candidates[idx]);
    clusters.set(root, items);
  }

  // 5. Create Virtual Groups and Maintain Order
  const finalNodesWithOrder: { index: number; node: SimplifiedNode }[] = [];

  // Add non-clustered nodes
  others.forEach(item => {
    finalNodesWithOrder.push({ index: item.index, node: item.node });
  });

  // Add clusters
  for (const [_, clusterItems] of clusters) {
    if (clusterItems.length > 1) {
      // Create a virtual group for the cluster
      const group = createVirtualFrame({
        name: "Content Group",
        type: "GROUP", // Use GROUP for loose semantic coupling
        layoutMode: "relative",
        children: clusterItems.map(item => item.node),
        semanticTag: "content-group"
      });
      
      // 最小索引插入
      const minIndex = Math.min(...clusterItems.map(item => item.index));

      finalNodesWithOrder.push({ index: minIndex, node: group });
    } else {
      const item = clusterItems[0];
      finalNodesWithOrder.push({ index: item.index, node: item.node });
    }
  }

  // 按索引顺序排序，排序后剔除索引对象
  return finalNodesWithOrder.sort((a, b) => a.index - b.index).map(x => x.node);
}

// 判断合法性
function isClusterCandidate(node: SimplifiedNode): boolean {
  if (!node.absRect) return false;
  // Don't cluster existing structural frames
  if (node.type === "FRAME" || node.type === "GROUP") {
    // Exception: Small frames might be icons or buttons
    const area = node.absRect.width * node.absRect.height;
    if (area > 100 * 100) return false; 
  }
  return true;
}
