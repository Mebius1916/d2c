import type { SimplifiedNode } from "../../types/extractor-types.js";
import { subtractRect, getNodeBoundingBox } from "../../utils/geometry.js";
import { hasVisibleStyles } from "../../utils/node-check.js";
import type { BoundingBox } from "../../types/simplified-types.js";

export function removeOccludedNodes(nodes: SimplifiedNode[]): SimplifiedNode[] {
  if (nodes.length === 0) return [];

  const visibleNodes: SimplifiedNode[] = []; // 有效节点
  const occluders: BoundingBox[] = []; // 遮罩层

  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    const rect = getNodeBoundingBox(node);

    // Skip nodes with invalid geometry
    if (!rect || rect.width <= 0 || rect.height <= 0) {
      continue;
    }

    // 当前节点的几何区域
    let remainingRegions = [rect];

    // 遍历所有遮罩层，计算当前节点的可见区域
    for (const occluder of occluders) {
      const nextRegions: BoundingBox[] = [];
      for (const region of remainingRegions) {
        nextRegions.push(...subtractRect(region, occluder));
      }
      remainingRegions = nextRegions;
      
      // 如果当前节点的可见区域为空，说明当前节点被完全遮挡
      if (remainingRegions.length === 0) {
        break;
      }
    }

    // 判断当前节点露出部分是否有可见内容
    const isOccluded = remainingRegions.length === 0 || !hasVisibleContentInRegions(node, remainingRegions);

    if (!isOccluded) {
      visibleNodes.unshift(node);

      // 加入遮罩层
      if (isOpaque(node)) {
        occluders.push(rect);
      }
    }
  }

  return visibleNodes;
}

function hasVisibleContentInRegions(node: SimplifiedNode, regions: BoundingBox[]): boolean {
  // 1. Leaf Nodes (Text, Icon, Image) are inherently visible if they are not fully occluded.
  if (node.type === "TEXT" || node.type === "SVG" || node.type === "IMAGE") {
    return true;
  }

  // 2. Check if node has visible background/border/effects
  if (hasVisibleStyles(node)) {
    return true;
  }

  // 3. If node is transparent container (no fill/stroke), check if any child falls in the remaining regions
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      const childRect = getNodeBoundingBox(child);
      if (!childRect) continue;

      // Check if child intersects with any remaining region
      for (const region of regions) {
        // Simple AABB intersection check
        if (
          childRect.x < region.x + region.width &&
          childRect.x + childRect.width > region.x &&
          childRect.y < region.y + region.height &&
          childRect.y + childRect.height > region.y
        ) {
          return true; // Found a visible child
        }
      }
    }
    return false;
  }
  return false;
}

// Check if node is opaque (blocks vision)
function isOpaque(node: SimplifiedNode): boolean {
  // 1. Type Check: Non-rectangular shapes are never opaque occluders
  if (node.type === "TEXT" || node.type === "SVG") return false;
  
  // 2. Opacity Check: Must be fully opaque
  if (node.opacity !== undefined && node.opacity < 1) return false;

  // 3. Image Exception: Images are generally treated as opaque rectangles
  if (node.type === "IMAGE") return true;

  // 4. Fill Check: Must have a visible fill
  if (!node.fills || node.fills === "transparent") return false;

  // 5. Border Radius Check: Must be a sharp rectangle
  if (node.borderRadius && node.borderRadius !== "0px" && node.borderRadius !== "0") return false;

  return true;
}
