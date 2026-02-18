import type { SimplifiedDesign, SimplifiedNode } from "../../types/extractor-types.js";
import { hasVisibleStyles } from "../../utils/node-check.js";

/**
 * Flattens redundant nested groups/frames that don't contribute to layout or style.
 */
export function flattenRedundantNodes(
  nodes: SimplifiedNode[],
  globalVars: SimplifiedDesign['globalVars']
): SimplifiedNode[] {
  return nodes.map(node => processNode(node, globalVars));
}

function processNode(
  node: SimplifiedNode,
  globalVars: SimplifiedDesign['globalVars']
): SimplifiedNode {
  // 1. Recursively process children first (bottom-up approach)
  if (node.children && node.children.length > 0) {
    node.children = flattenRedundantNodes(node.children, globalVars);
  }

  // 2. Check if current node is redundant
  if (isRedundant(node, globalVars)) {
    return node.children![0]; 
  }

  return node;
}

function isRedundant(
  node: SimplifiedNode,
  globalVars: SimplifiedDesign['globalVars']
): boolean {
  // Must have exactly one child
  if (!node.children || node.children.length !== 1) return false;

  // Must be a container type
  if (node.type !== 'CONTAINER') return false;
  
  
  // Must have no visual styles
  if (hasVisibleStyles(node)) return false;

  if (node.semanticTag) return false;

  // Must have no layout impact (padding)
  if (hasLayoutImpact(node, globalVars)) return false;

  return true;
}

function hasLayoutImpact(
  node: SimplifiedNode,
  globalVars: SimplifiedDesign['globalVars']
): boolean {
  if (!node.layout) return false;

  const resolvedLayout = typeof node.layout === 'string'
    ? globalVars.styles[node.layout]
    : node.layout;
  if (!resolvedLayout) return false;
  const layout = resolvedLayout as any;
  if (layout.padding && layout.padding !== '0px' && layout.padding !== '0') return true;
  if (layout.gap && layout.gap !== '0px' && layout.gap !== '0') return true;
  if (layout.wrap) return true;
  if (layout.justifyContent || layout.alignItems || layout.alignSelf) return true;
  if (layout.position === 'absolute') return true;
  if (layout.locationRelativeToParent) return true;
  if (layout.dimensions && (layout.dimensions.width || layout.dimensions.height || layout.dimensions.aspectRatio)) return true;
  if (layout.sizing && (layout.sizing.horizontal || layout.sizing.vertical)) return true;
  if (layout.overflowScroll && layout.overflowScroll.length > 0) return true;
  return false;
}
