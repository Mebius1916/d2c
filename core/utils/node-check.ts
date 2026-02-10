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
  
  // Check for layout styles that might be structural (e.g. fixed size spacer)
  // If a node has fixed dimensions but no children/style, it might be a spacer.
  // But usually spacers are handled by Gap or Padding. 
  // Let's be conservative: if it has a specific layout mode other than 'none', keep it?
  // Actually, an empty flex container with no children is useless unless it has height/width.
  // For now, let's assume if it has no styles, it's empty.
  
  return true;
}
