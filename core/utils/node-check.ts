import type { SimplifiedNode } from "../types/extractor-types.js";

/**
 * Checks if a node should be pruned from the tree.
 * A node should be pruned if:
 * 1. It has no children
 * 2. It is visually empty (no styles, no semantic meaning)
 * 3. It is not a content node (Text, Image, SVG)
 */
export function shouldPruneNode(node: SimplifiedNode): boolean {
  // 1. Check children
  const hasChildren = node.children && node.children.length > 0;
  if (hasChildren) {
    return false;
  }

  if (node.visible === false) {
    return false;
  }

  // 2. Never prune content nodes
  if (node.type === "TEXT" || node.type === "IMAGE" || node.type === "SVG") {
    return false;
  }

  // 3. Check for visual styles
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
