import type { SimplifiedNode, SimplifiedDesign } from "../types.js";

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
  if (node.type !== 'FRAME' && node.type !== 'GROUP') return false;

  // Must have no visual styles
  if (hasVisualStyles(node)) return false;

  // Must have no layout impact (padding)
  if (hasLayoutImpact(node, globalVars)) return false;
  
  if (node.semanticTag) return false;

  return true;
}

function hasVisualStyles(node: SimplifiedNode): boolean {
  // Check for direct properties or references
  if (node.fills && node.fills !== 'transparent') return true;
  if (node.strokes) return true;
  if (node.effects) return true;
  if (node.borderRadius) return true;
  return false;
}

function hasLayoutImpact(
  node: SimplifiedNode,
  globalVars: SimplifiedDesign['globalVars']
): boolean {
  if (!node.layout) return false;

  // If layout is just a string ID, resolve it
  if (typeof node.layout === 'string') {
    const layoutStyle = globalVars.styles[node.layout];
    if (!layoutStyle) return false; // Should not happen, but safe fallback
    const layout = layoutStyle as any; 
    if (layout.padding && layout.padding !== '0px') return true;
  }

  return false;
}
