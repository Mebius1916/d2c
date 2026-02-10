import type {
  GetFileResponse,
  GetFileNodesResponse,
  Node as FigmaDocumentNode,
  Component,
  ComponentSet,
  Style,
} from "@figma/rest-api-spec";
import { simplifyComponents, simplifyComponentSets } from "../../transformers/component.js";
import type { SimplifiedDesign, TraversalContext, SimplifiedNode } from "../../types/extractor-types.js";
import { extractFromDesign } from "./node-walker.js";
import { flattenRedundantNodes } from "../algorithms/flattening.js";

/**
 * Extract a complete SimplifiedDesign from raw Figma API response using extractors.
 */
export function simplifyRawFigmaObject(
  apiResponse: GetFileResponse | GetFileNodesResponse,
): SimplifiedDesign {
  // Extract components, componentSets, and raw nodes from API response
  const { metadata, rawNodes, components, componentSets, extraStyles } =
    parseAPIResponse(apiResponse);

  // Process nodes using the flexible extractor system
  const globalVars: TraversalContext["globalVars"] = { styles: {}, extraStyles };
  const { nodes: extractedNodes, globalVars: finalGlobalVars } = extractFromDesign(
    rawNodes,
    globalVars,
  );

  // Run structure optimization: Flatten redundant groups
  const optimizedNodes = flattenRedundantNodes(extractedNodes, { styles: finalGlobalVars.styles });

  // Return complete design
  return {
    ...metadata,
    nodes: cleanupNodes(optimizedNodes),
    components: simplifyComponents(components),
    componentSets: simplifyComponentSets(componentSets),
    globalVars: { styles: finalGlobalVars.styles },
  };
}

/**
 * Remove internal properties like visualSignature from nodes before output
 */
function cleanupNodes(nodes: SimplifiedNode[]): SimplifiedNode[] {
  return nodes.map(node => {
    const { visualSignature, ...rest } = node as any;
    if (rest.children) {
      rest.children = cleanupNodes(rest.children);
    }
    return rest as SimplifiedNode;
  });
}

/**
 * Parse the raw Figma API response to extract metadata, nodes, and components.
 */
function parseAPIResponse(data: GetFileResponse | GetFileNodesResponse) {
  const aggregatedComponents: Record<string, Component> = {};
  const aggregatedComponentSets: Record<string, ComponentSet> = {};
  let extraStyles: Record<string, Style> = {};
  let nodesToParse: Array<FigmaDocumentNode>;

  if ("nodes" in data) {
    // GetFileNodesResponse
    const nodeResponses = Object.values(data.nodes);
    nodeResponses.forEach((nodeResponse) => {
      if (nodeResponse.components) {
        Object.assign(aggregatedComponents, nodeResponse.components);
      }
      if (nodeResponse.componentSets) {
        Object.assign(aggregatedComponentSets, nodeResponse.componentSets);
      }
      if (nodeResponse.styles) {
        Object.assign(extraStyles, nodeResponse.styles);
      }
    });
    nodesToParse = nodeResponses.map((n) => n.document);
  } else {
    // GetFileResponse
    Object.assign(aggregatedComponents, data.components);
    Object.assign(aggregatedComponentSets, data.componentSets);
    if (data.styles) {
      extraStyles = data.styles;
    }
    nodesToParse = data.document.children;
  }

  const { name } = data;

  return {
    metadata: {
      name,
    },
    rawNodes: nodesToParse,
    extraStyles,
    components: aggregatedComponents,
    componentSets: aggregatedComponentSets,
  };
}
