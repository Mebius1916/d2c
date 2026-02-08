import type { SimplifiedNode } from "../types.js";
import type { BoundingBox } from "../../utils/geometry.js";
import { isRectContained } from "../../utils/geometry.js";

export function removeOccludedNodes(nodes: SimplifiedNode[]): SimplifiedNode[] {
  if (nodes.length === 0) return [];

  const visibleNodes: SimplifiedNode[] = [];
  const occluders: BoundingBox[] = [];

  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    const rect = getNodeBoundingBox(node);

    // Skip nodes with invalid geometry
    if (!rect || rect.width <= 0 || rect.height <= 0) {
      continue;
    }

    let isOccluded = false;

    // Check if completely covered by any existing occluder
    for (const occluder of occluders) {
      if (isRectContained(rect, occluder)) {
        isOccluded = true;
        break;
      }
    }

    if (!isOccluded) {
      visibleNodes.unshift(node);

      // If current node is opaque, add it to occluders list
      if (isOpaque(node)) {
        occluders.push(rect);
      }
    }
  }

  return visibleNodes;
}

// Extract geometry from node
function getNodeBoundingBox(node: SimplifiedNode): BoundingBox | null {
  if (node.absRect) {
    return {
      x: node.absRect.x,
      y: node.absRect.y,
      width: node.absRect.width,
      height: node.absRect.height,
    };
  }
  return null;
}

// Check if node is opaque (blocks vision)
function isOpaque(node: SimplifiedNode): boolean {
  // Note: We assume node is visible because it passed the pipeline filters
  if (node.type === "TEXT") return false;
  if (node.type === "SVG") return false;
  
  // Images are generally opaque if they don't have transparency set
  if (node.type === "IMAGE") return true;

  // Check explicit opacity
  if (node.opacity !== undefined && node.opacity < 1) return false;

  return true;
}
