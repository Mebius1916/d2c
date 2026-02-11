import type { SimplifiedNode } from "../types/extractor-types.js";

/**
 * Checks if a SimplifiedNode is "empty" and can be safely pruned.
 * An empty node is one that:
 * 1. Has no children (caller must ensure this check before calling)
 * 2. Has no visual styles (fills, strokes, effects)
 * 3. Has no semantic meaning (tag)
 * 4. Is not a specific type that must be preserved (e.g. TEXT, IMAGE)
 */
export function isNodeEmpty(node: SimplifiedNode): boolean {
  // Never prune content nodes
  if (node.type === "TEXT" || node.type === "IMAGE" || node.type === "IMAGE-SVG" || node.type === "SVG") {
    return false;
  }

  // Preserve semantic nodes
  if (node.semanticTag) {
    return false;
  }

  // Check for visual styles
  if (node.fills && node.fills !== "transparent") return false;
  if (node.strokes) return false;
  if (node.effects) return false;
  
  return true;
}
