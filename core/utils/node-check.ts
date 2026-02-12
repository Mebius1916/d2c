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

  // Check for visual styles using the unified helper
  if (hasVisibleStyles(node)) {
    return false;
  }
  
  return true;
}

/**
 * Checks if a node has any visible visual styles (fills, strokes, effects).
 * This function unifies style checking logic used across multiple modules.
 */
export function hasVisibleStyles(node: SimplifiedNode | any): boolean {
  // 1. Fills
  if (node.fills && node.fills !== "transparent") {
    // If fills is an array (raw Figma node or intermediate state)
    if (Array.isArray(node.fills)) {
      const hasVisibleFill = node.fills.some(
        (paint: any) => paint.visible !== false && paint.opacity !== 0
      );
      if (hasVisibleFill) return true;
    } else {
      // If fills is a string ID or simplified object (SimplifiedNode)
      return true;
    }
  }

  // 2. Strokes
  if (node.strokes && node.strokes !== "transparent") {
    if (Array.isArray(node.strokes)) {
      const hasVisibleStroke = node.strokes.some(
        (paint: any) => paint.visible !== false && paint.opacity !== 0
      );
      if (hasVisibleStroke) return true;
    } else {
      return true;
    }
  }

  // 3. Effects
  if (node.effects && node.effects !== "transparent") {
    if (Array.isArray(node.effects)) {
      const hasVisibleEffect = node.effects.some(
        (effect: any) => effect.visible !== false
      );
      if (hasVisibleEffect) return true;
    } else {
      return true;
    }
  }

  // 4. Border Radius (Structural Style)
  // Sometimes a node is just a rounded container for clipping
  if (node.borderRadius && node.borderRadius !== "0px" && node.borderRadius !== "0") {
    return true;
  }

  return false;
}
