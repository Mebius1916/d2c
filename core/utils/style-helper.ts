import type { GlobalVars, StyleTypes, TraversalContext, SimplifiedNode } from "../types/extractor-types.js";
import { generateVarId } from "./common.js";
import { hasValue } from "./identity.js";
import type { Node as FigmaDocumentNode } from "@figma/rest-api-spec";

// 将一个样式对象存到全局样式表里，并返回它的 id
export function findOrCreateVar(globalVars: GlobalVars, value: StyleTypes, prefix: string): string {
  // Initialize cache if it doesn't exist
  if (!globalVars.styleCache) {
    globalVars.styleCache = new Map();
    // Populate cache with existing styles (migration path)
    Object.entries(globalVars.styles).forEach(([id, val]) => {
      globalVars.styleCache!.set(JSON.stringify(val), id);
    });
  }

  const stringifiedValue = JSON.stringify(value);

  // O(1) Lookup
  const existingVarId = globalVars.styleCache.get(stringifiedValue);
  if (existingVarId) {
    return existingVarId;
  }

  // Create a new variable if it doesn't exist
  const varId = generateVarId(prefix);
  globalVars.styles[varId] = value;
  globalVars.styleCache.set(stringifiedValue, varId);
  
  return varId;
}

// Helper to fetch a Figma style name for specific style keys on a node
export function getStyleName(
  node: FigmaDocumentNode,
  context: TraversalContext,
  keys: string[],
): string | undefined {
  if (!hasValue("styles", node)) return undefined;
  const styleMap = node.styles as Record<string, string>;
  for (const key of keys) {
    const styleId = styleMap[key];
    if (styleId) {
      const meta = context.globalVars.extraStyles?.[styleId];
      if (meta?.name) return meta.name;
    }
  }
  return undefined;
}

export function addStyleRef(refs: Set<string>, value?: string) {
  if (value) refs.add(value);
}

export function buildNodeStyle(node: SimplifiedNode): Record<string, string | number> {
  return {
    ...(typeof node.opacity === "number" ? { opacity: node.opacity } : {}),
    ...(node.borderRadius ? { borderRadius: node.borderRadius } : {}),
    ...(node.transform ? { transform: node.transform } : {}),
  };
}
