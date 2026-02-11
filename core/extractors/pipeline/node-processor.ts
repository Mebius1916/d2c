import { runReconstructionPipeline } from "./reconstruction.js";
import type {
  TraversalContext,
  SimplifiedNode,
} from "../../types/extractor-types.js";
import { processNodeWithExtractors } from "./core-process.js";
/**
 * Traverse the Figma node tree and extract simplified nodes.
 *
 * This function orchestrates the traversal and delegates specific extraction
 * logic to the `processNodeWithExtractors` function.
 */
export function extractFromDesign(
  nodes: any[], // Raw Figma nodes
  globalVars: TraversalContext["globalVars"] = { styles: {} },
): { nodes: SimplifiedNode[]; globalVars: TraversalContext["globalVars"] } {
  const context: TraversalContext = {
    currentDepth: 0,
    parent: undefined,
    globalVars,
  };

  // 1. Process all root nodes (DFS Traversal & Extraction)
  let processedNodes = nodes
    .map((node) => processNodeWithExtractors(node, context)) // 递
    .filter((node): node is SimplifiedNode => node !== null); // 归
  
  // 2. Process Design Tree (Structure Reconstruction) - Root Level
  if (processedNodes.length > 0) {
      processedNodes = runReconstructionPipeline(processedNodes, globalVars);
  }

  return {
    nodes: processedNodes,
    globalVars,
  };
}
