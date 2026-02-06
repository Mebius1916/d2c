import type { SimplifiedNode } from "../../types.js";

/**
 * Calculates dynamic adjacency threshold between two nodes based on their types and sizes.
 * Used for Density-Based Clustering.
 */
export function calculateAdjacencyThreshold(a: SimplifiedNode, b: SimplifiedNode): number {
  // 1. Get approximate feature size (Use height for text as font-size proxy)
  const sizeA = getFeatureSize(a);
  const sizeB = getFeatureSize(b);

  let threshold = 4;

  // 2. Dynamic Calculation based on Types
  if (a.type === "TEXT" && b.type === "TEXT") {
    // Text + Text: High affinity. Allow gap up to 0.5x max line-height.
    threshold = Math.max(sizeA, sizeB) * 0.5;
  } 
  else if ((a.type === "TEXT" && b.type !== "TEXT") || (a.type !== "TEXT" && b.type === "TEXT")) {
    // Text + Icon/Image: Medium affinity. Allow gap up to 1.0x text height.
    const textSize = a.type === "TEXT" ? sizeA : sizeB;
    threshold = textSize * 1.0;
  } 
  else {
    // Image + Image / Other: Low affinity. Strict gap.
    // Allow 20% of smaller dimension.
    threshold = Math.min(sizeA, sizeB) * 0.2;
  }

  // 3. Clamp values (Min 2px, Max 24px)
  return Math.max(2, Math.min(threshold, 24));
}

/**
 * Calculates dynamic layout gap threshold for a group of nodes.
 * Used for Recursive Projection Cutting.
 */
export function calculateLayoutGap(nodes: SimplifiedNode[], axis: "x" | "y"): number {
  if (nodes.length === 0) return 2;

  const totalSize = nodes.reduce((sum, n) => {
    if (!n.absRect) return sum;
    return sum + (axis === "x" ? n.absRect.width : n.absRect.height);
  }, 0);

  const avgSize = totalSize / nodes.length;

  // Logic: 5% of average size, min 2px
  return Math.max(2, avgSize * 0.05);
}

/**
 * 分段量化尺寸 (Tiered Quantization)
 * 工业级 D2C 的最佳实践：避免单一阈值导致的过拟合或欠拟合
 * Used for Visual Fingerprinting.
 */
export function quantizeSize(val: number): number {
  if (val < 50) {
    // 小元素 (Icon, Badge): 高精度，2px 容错
    return Math.round(val / 2) * 2;
  } else if (val < 200) {
    // 中元素 (Button, Avatar): 中等精度，5px 容错
    return Math.round(val / 5) * 5;
  } else {
    // 大元素 (Card, Image): 低精度，10px 容错
    return Math.round(val / 10) * 10;
  }
}

function getFeatureSize(node: SimplifiedNode): number {
  if (!node.absRect) return 0;
  if (node.type === "TEXT") {
    return node.absRect.height;
  }
  return Math.min(node.absRect.width, node.absRect.height);
}
