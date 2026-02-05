import type { Node as FigmaDocumentNode } from "@figma/rest-api-spec";
import { isVisible } from "../utils/common.js";
import { hasValue } from "../utils/identity.js";
import { isIcon } from "../transformers/icon.js";
import { isImageNode } from "../transformers/image.js";
import { removeOccludedNodes } from "./occlusion.js";
import { mergeSpatialIcons } from "./spatial-merging.js";
import { reparentNodes } from "./reparenting.js";
import { groupNodesByLayout } from "./layout-grouping.js";
import { inferListPatterns } from "./list-inference.js";
import type {
  ExtractorFn,
  TraversalContext,
  TraversalOptions,
  GlobalVars,
  SimplifiedNode,
} from "./types.js";

/**
 * Extract data from Figma nodes using a flexible, single-pass approach.
 *
 * @param nodes - The Figma nodes to process
 * @param extractors - Array of extractor functions to apply during traversal
 * @param options - Traversal options (filtering, depth limits, etc.)
 * @param globalVars - Global variables for style deduplication
 * @returns Object containing processed nodes and updated global variables
 */
export function extractFromDesign(
  nodes: FigmaDocumentNode[],
  extractors: ExtractorFn[],
  options: TraversalOptions = {},
  globalVars: GlobalVars = { styles: {} },
): { nodes: SimplifiedNode[]; globalVars: GlobalVars } {
  const context: TraversalContext = {
    globalVars,
    currentDepth: 0,
  };

  const processedNodes = nodes
    .filter((node) => shouldProcessNode(node, options))
    .map((node) => processNodeWithExtractors(node, extractors, context, options))
    .filter((node): node is SimplifiedNode => node !== null);

  // Apply Occlusion Culling: Remove nodes that are completely hidden by siblings above them
  const visibleNodes = removeOccludedNodes(processedNodes);
  
  const reconstructedNodes = reparentNodes(visibleNodes);

  // Apply Layout Grouping: Recursively infer Flexbox rows/cols
  // We need to apply this to the reconstructed tree.
  function applyLayoutGroupingToTree(nodes: SimplifiedNode[]): SimplifiedNode[] {
    // 1. Process children first (bottom-up) or top-down?
    // groupNodesByLayout processes a list of siblings. 
    // It recursively calls itself on groups it creates.
    // BUT, it doesn't automatically traverse into *existing* children of the input nodes.
    // So we need to traverse.
    
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        node.children = applyLayoutGroupingToTree(node.children);
      }
    });

    // 2. Process current level
    return groupNodesByLayout(nodes);
  }

  // Apply List Inference: Recursively detect repetitive patterns
  function applyListInferenceToTree(nodes: SimplifiedNode[]): SimplifiedNode[] {
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        node.children = applyListInferenceToTree(node.children);
      }
    });
    return inferListPatterns(nodes);
  }

  const groupedNodes = applyLayoutGroupingToTree(reconstructedNodes);
  const listNodes = applyListInferenceToTree(groupedNodes);

  return {
    nodes: listNodes,
    globalVars: context.globalVars,
  };
}

/**
 * Process a single node with all provided extractors in one pass.
 */
function processNodeWithExtractors(
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

        // Note: We DO NOT run `reparentNodes` here recursively.
        // Why? Because `reparentNodes` is designed to be a GLOBAL operation.
        // It flattens the tree. If we run it on every subtree, we are just doing local re-parenting.
        // But the whole point is to fix "Button is physically in Card but logically in Root".
        // So `reparentNodes` should ONLY be called once at the very end of `walkNodes`.
        // However, `mergeSpatialIcons` is a local operation (siblings only), so it stays here.

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
function shouldProcessNode(node: FigmaDocumentNode, options: TraversalOptions): boolean {
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
