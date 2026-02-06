import type { Node as FigmaDocumentNode } from "@figma/rest-api-spec";
import { isVisible } from "../../utils/common.js";
import { hasValue } from "../../utils/identity.js";
import { isIcon } from "../../transformers/icon.js";
import { isImageNode } from "../../transformers/image.js";
import { removeOccludedNodes } from "../algorithms/occlusion.js";
import { mergeSpatialIcons } from "../algorithms/spatial-merging.js";
import type {
  ExtractorFn,
  TraversalContext,
  TraversalOptions,
  SimplifiedNode,
} from "../types.js";

export function processNodeWithExtractors(
  node: FigmaDocumentNode,
  extractors: ExtractorFn[],
  context: TraversalContext,
  options: TraversalOptions,
): SimplifiedNode | null {
  if (!shouldProcessNode(node, options)) {
    return null;
  }

  // 1. Detect if this is an Icon (SVG)
  // If true, we treat it as a leaf node (SVG) and do NOT traverse children
  if (isIcon(node)) {
    const result: SimplifiedNode = {
      id: node.id,
      name: node.name,
      type: "SVG", // Mark as SVG
      semanticTag: "icon", // Semantic hint for LLM
    };
    // Apply extractors to get layout/styles for the icon container itself
    for (const extractor of extractors) {
      extractor(node, result, context);
    }
    return result;
  }

  // 2. Detect if this is an Image
  // If true, we treat it as a leaf node (IMAGE) and do NOT traverse children
  if (isImageNode(node)) {
    const result: SimplifiedNode = {
      id: node.id,
      name: node.name,
      type: "IMAGE", // Mark as Image
      semanticTag: "image",
    };
    // Apply extractors to get layout/styles (border-radius, shadow)
    for (const extractor of extractors) {
      extractor(node, result, context);
    }
    return result;
  }

  // 3. Standard Node Processing
  const result: SimplifiedNode = {
    id: node.id,
    name: node.name,
    type: node.type === "VECTOR" ? "IMAGE-SVG" : node.type,
  };

  // Apply all extractors to this node in a single pass
  for (const extractor of extractors) {
    extractor(node, result, context);
  }

  // Handle children recursively
  if (shouldTraverseChildren(node, context, options)) {
    const childContext: TraversalContext = {
      ...context,
      currentDepth: context.currentDepth + 1,
      parent: node,
    };

    // Use the same pattern as the existing parseNode function
    if (hasValue("children", node) && node.children.length > 0) {
      const children = node.children
        .filter((child) => shouldProcessNode(child, options))
        .map((child) => processNodeWithExtractors(child, extractors, childContext, options))
        .filter((child): child is SimplifiedNode => child !== null);

      if (children.length > 0) {
        // 1. Apply Occlusion Culling (Remove hidden nodes)
        let processedChildren = removeOccludedNodes(children);

        // 2. Apply Spatial Merging (Group scattered icon parts)
        processedChildren = mergeSpatialIcons(processedChildren);

        // Allow custom logic to modify parent and control which children to include
        const childrenToInclude = options.afterChildren
          ? options.afterChildren(node, result, processedChildren)
          : processedChildren;

        if (childrenToInclude.length > 0) {
          result.children = childrenToInclude;
        }
      }
    }
  }

  return result;
}

/**
 * Determine if a node should be processed based on filters.
 */
export function shouldProcessNode(node: FigmaDocumentNode, options: TraversalOptions): boolean {
  // Skip invisible nodes
  if (!isVisible(node)) {
    return false;
  }

  // Apply custom node filter if provided
  if (options.nodeFilter && !options.nodeFilter(node)) {
    return false;
  }

  return true;
}

/**
 * Determine if we should traverse into a node's children.
 */
function shouldTraverseChildren(
  node: FigmaDocumentNode,
  context: TraversalContext,
  options: TraversalOptions,
): boolean {
  // Check depth limit
  if (options.maxDepth !== undefined && context.currentDepth >= options.maxDepth) {
    return false;
  }

  return true;
}
