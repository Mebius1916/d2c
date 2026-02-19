import type { SimplifiedNode, TraversalContext } from "../../types/extractor-types.js";
import { findOrCreateVar, addStyleRef, buildNodeStyle } from "../../utils/style-helper.js";

// 递归处理整棵节点树并合并为单一 styles
export function normalizeNodeStyles(
  nodes: SimplifiedNode[],
  globalVars: TraversalContext["globalVars"]
): SimplifiedNode[] {
  return nodes.map((node) => normalizeNodeStyle(node, globalVars));
}

// 单节点归一化：收集样式引用、生成合并样式、清理原字段
function normalizeNodeStyle(
  node: SimplifiedNode,
  globalVars: TraversalContext["globalVars"]
): SimplifiedNode {
  normalizeChildren(node, globalVars);
  normalizeLayout(node, globalVars);
  const refs = collectStyleRefs(node, globalVars);
  if (refs.length > 0) {
    node.styles = refs.length === 1 ? refs[0] : findOrCreateVar(globalVars, { refs }, "style");
  }
  clearStyleFields(node);
  return node;
}

// 递归处理子节点
function normalizeChildren(node: SimplifiedNode, globalVars: TraversalContext["globalVars"]) {
  if (node.children && node.children.length > 0) {
    node.children = node.children.map((child) => normalizeNodeStyle(child, globalVars));
  }
}

// 将 layout 对象转为 styleId
function normalizeLayout(node: SimplifiedNode, globalVars: TraversalContext["globalVars"]) {
  if (node.layout && typeof node.layout !== "string") {
    node.layout = findOrCreateVar(globalVars, node.layout as any, "layout");
  }
}

// 汇总节点上的所有 styleId
function collectStyleRefs(
  node: SimplifiedNode,
  globalVars: TraversalContext["globalVars"]
): string[] {
  const refs = new Set<string>();
  addStyleRef(refs, node.styles);
  addStyleRef(refs, typeof node.layout === "string" ? node.layout : undefined);
  addStyleRef(refs, node.fills);
  addStyleRef(refs, node.textStyle);
  addStyleRef(refs, node.strokes);
  addStyleRef(refs, node.effects);
  const nodeStyle = buildNodeStyle(node);
  if (Object.keys(nodeStyle).length > 0) {
    addStyleRef(refs, findOrCreateVar(globalVars, nodeStyle, "node"));
  }
  return Array.from(refs);
}

// 清理节点上拆分的样式字段，仅保留 styles
function clearStyleFields(node: SimplifiedNode) {
  node.layout = undefined;
  node.fills = undefined;
  node.textStyle = undefined;
  node.strokes = undefined;
  node.effects = undefined;
  node.opacity = undefined;
  node.borderRadius = undefined;
  node.transform = undefined;
}
