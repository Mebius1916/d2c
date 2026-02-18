import { runReconstructionPipeline } from "./reconstruction.js";
import type {
  TraversalContext,
  SimplifiedNode,
} from "../../types/extractor-types.js";
import { processNodes } from "./utils/core-process.js";

/**
 * Traverse the Figma node tree and extract simplified nodes.
 *
 * This function orchestrates the traversal and delegates specific extraction
 * logic to the `processNodes` function.
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

  // 1. Extraction Phase (with Injected Structure Pass)
  let rootNodes = processNodes(nodes, context, (children) =>
    runReconstructionPipeline(children, globalVars),
  );

  // 剪枝操作，减少内存占用
  if (globalVars.extraStyles) {
    delete globalVars.extraStyles;
  }

  return {
    nodes: rootNodes,
    globalVars,
  };
}
