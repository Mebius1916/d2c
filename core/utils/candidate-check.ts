import type { SimplifiedNode } from "../types/extractor-types.js";

// 相邻聚类
export function isClusterCandidate(node: SimplifiedNode): boolean {
  if (!node.absRect) return false;
  if (node.layoutMode === "absolute") return false;
  if (node.type === "CONTAINER") {
    const area = node.absRect.width * node.absRect.height;
    if (area > 100 * 100) return false;
  }
  return true;
}

export function isMergeCandidate(node: SimplifiedNode, maxSize: number): boolean {
  if (!node.absRect) return false;
  if (node.type !== "SVG") return false;
  if (node.absRect.width > maxSize || node.absRect.height > maxSize) return false;
  return true;
}

export function canBeParent(node: SimplifiedNode): boolean {
  if (node.type === "TEXT" || node.type === "SVG" || node.type === "IMAGE") return false;
  return true;
}
