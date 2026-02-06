import type { GlobalVars, StyleTypes, TraversalContext } from "../extractors/types.js";
import { generateVarId } from "./common.js";
import { hasValue } from "./identity.js";
import type { Node as FigmaDocumentNode } from "@figma/rest-api-spec";

/**
 * Helper function to find or create a global variable.
 */
export function findOrCreateVar(globalVars: GlobalVars, value: StyleTypes, prefix: string): string {
  // Check if the same value already exists
  const [existingVarId] =
    Object.entries(globalVars.styles).find(
      ([_, existingValue]) => JSON.stringify(existingValue) === JSON.stringify(value),
    ) ?? [];

  if (existingVarId) {
    return existingVarId;
  }

  // Create a new variable if it doesn't exist
  const varId = generateVarId(prefix);
  globalVars.styles[varId] = value;
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
