import type { ExtractorFn } from "../types.js";
import { hasValue } from "../../utils/identity.js";

/**
 * Extracts component-related properties from INSTANCE nodes.
 */
export const componentExtractor: ExtractorFn = (node, result, _context) => {
  if (node.type === "INSTANCE") {
    if (hasValue("componentId", node)) {
      result.componentId = node.componentId;
    }

    // Add specific properties for instances of components
    if (hasValue("componentProperties", node)) {
      result.componentProperties = Object.entries(node.componentProperties ?? {}).map(
        ([name, { value, type }]) => ({
          name,
          value: value.toString(),
          type,
        }),
      );
    }
  }
};
