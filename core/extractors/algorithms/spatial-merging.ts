/*
  小图标合并:
    通过并查集算法将所有有关系的碎片节点聚集为一个集合，
    然后将这个集合合并为一个虚拟的图标节点，然后插入到原始节点列表中（不保留原始碎片节点）
*/
import type { SimplifiedNode } from "../types.js";
import { createVirtualFrame } from "./utils/virtual-node.js";
import { type BoundingBox, areRectsTouching } from "../../utils/geometry.js";
import { UnionFind } from "./utils/union-find.js";

const SPATIAL_MERGE_THRESHOLD = 80; // Max size for an icon
const MERGE_DISTANCE = 2; // Max distance in pixels to consider "touching"

// Primitives that can be merged into an icon
const MERGEABLE_TYPES = new Set([
  "VECTOR",
  "ELLIPSE",
  "RECTANGLE",
  "STAR",
  "POLYGON",
  "LINE",
  "BOOLEAN_OPERATION"
]);

export function mergeSpatialIcons(nodes: SimplifiedNode[]): SimplifiedNode[] {
  if (nodes.length < 2) return nodes;

  const candidates: { index: number; rect: BoundingBox; node: SimplifiedNode }[] = [];
  const nonCandidates: { index: number; node: SimplifiedNode }[] = [];

  // 1. Filter candidates
  nodes.forEach((node, i) => {
    if (isMergeCandidate(node)) {
      candidates.push({ index: i, rect: node.absRect!, node });
    } else {
      nonCandidates.push({ index: i, node });
    }
  });

  if (candidates.length < 2) return nodes;

  // 2. Clustering using Union-Find
  const uf = new UnionFind(candidates.length);

  // 并查集将符合条件的碎片合并到一个集合中
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      if (areRectsTouching(candidates[i].rect, candidates[j].rect, MERGE_DISTANCE)) {
        uf.union(i, j);
      }
    }
  }

  // 3. Group by cluster
  const groupIndices = uf.getGroups();
  const clusters = new Map<number, typeof candidates>();
  
  for (const [root, indices] of groupIndices) {
    const parts = indices.map(idx => candidates[idx]);
    clusters.set(root, parts);
  }

  // 4. 恢复节点列表原始排序（不合法节点保持原位置）
  const finalNodes = [...nonCandidates.map(nc => ({ node: nc.node, sortIdx: nc.index }))];
  
  for (const [_, clusterParts] of clusters) {
    if (clusterParts.length > 1) {
      // 小图标合并后的虚拟节点
      const mergedNode = createMergedIconNode(clusterParts.map(c => c.node));
      // 插入位置选择最早出现的碎片index
      const minIdx = Math.min(...clusterParts.map(c => c.index));
      finalNodes.push({ node: mergedNode, sortIdx: minIdx });
    } else {
      finalNodes.push({ node: clusterParts[0].node, sortIdx: clusterParts[0].index });
    }
  }

  return finalNodes.sort((a, b) => a.sortIdx - b.sortIdx).map(n => n.node);
}

// 合法性检测
function isMergeCandidate(node: SimplifiedNode): boolean {
  if (!node.absRect) return false; // Must have layout info
  if (!MERGEABLE_TYPES.has(node.type)) return false; // Must be vector type
  
  // Check size
  if (node.absRect.width > SPATIAL_MERGE_THRESHOLD || node.absRect.height > SPATIAL_MERGE_THRESHOLD) {
    return false;
  }

  return true;
}

// 计算所有碎片的总包围矩形
function createMergedIconNode(parts: SimplifiedNode[]): SimplifiedNode {
  return createVirtualFrame({
    name: "Merged Icon",
    type: "GROUP",
    semanticTag: "icon",
    children: parts,
    layoutMode: "relative"
  });
}
