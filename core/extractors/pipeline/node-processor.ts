import { runStructurePipeline, runLayoutPipeline } from "./reconstruction.js";
import type {
  TraversalContext,
  SimplifiedNode,
} from "../../types/extractor-types.js";
import { processNodes } from "./utils/core-process.js";
import { walkTreePostOrder } from "./utils/walk-tree.js";
import { shouldPruneNode } from "../../utils/node-check.js";

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
  let rootNodes = processNodes(nodes, context, runStructurePipeline);

  // 2. Layout Phase: Post-Order Traversal (Bottom-Up)
  rootNodes = walkTreePostOrder(rootNodes, (children) => {
    const processedNodes = runLayoutPipeline(children, globalVars);

    // Prune empty containers
    return processedNodes.filter((node) => {
      if (node.type === "CONTAINER") {
        if (shouldPruneNode(node)) {
          return false;
        }
      }
      return true;
    });
  });

  return {
    nodes: rootNodes,
    globalVars,
  };
}
