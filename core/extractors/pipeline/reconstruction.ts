import { removeOccludedNodes } from "../algorithms/occlusion.js";
import { mergeSpatialIcons } from "../algorithms/spatial-merging.js";
import { reparentNodes } from "../algorithms/reparenting.js";
import { groupNodesByLayout } from "../algorithms/layout-grouping.js";
import { inferListPatterns } from "../algorithms/list-inference.js";
import { groupNodesByAdjacency } from "../algorithms/adjacency-clustering.js";
import { flattenRedundantNodes } from "../algorithms/flattening.js";
import type { SimplifiedNode, TraversalContext } from "../../types/extractor-types.js";

/**
 * Runs the full structure reconstruction pipeline on a list of nodes.
 * This pipeline is applied to:
 * 1. Children of each node during recursive processing (node-processor.ts)
 * 2. Root nodes at the end of the top-level traversal (node-walker.ts)
 * 
 * @param nodes The list of sibling nodes to process
 * @param globalVars Global variables (styles) needed for some algorithms like flattening
 * @returns The optimized and restructured list of nodes
 */
export function runReconstructionPipeline(
  nodes: SimplifiedNode[],
  globalVars?: TraversalContext["globalVars"]
): SimplifiedNode[] {
  if (nodes.length === 0) return [];

  // 1. Occlusion Culling: Remove nodes hidden by opaque siblings
  let processedNodes = removeOccludedNodes(nodes);

  // 2. Spatial Merging: Merge scattered vector paths into icons
  processedNodes = mergeSpatialIcons(processedNodes);

  // 3. Reparenting: Fix parent-child relationships based on visual containment
  processedNodes = reparentNodes(processedNodes);

  // 4. Layout Grouping: Convert absolute layout to Flexbox (Row/Column)
  processedNodes = groupNodesByLayout(processedNodes);

  // 5. List Inference: Detect repeating patterns and wrap in List containers
  processedNodes = inferListPatterns(processedNodes);

  // 6. Adjacency Clustering: Group remaining loose items (e.g. Title + Subtitle)
  processedNodes = groupNodesByAdjacency(processedNodes);

  // 7. Flattening: Remove redundant wrapper frames
  // Requires globalVars to check for styles/padding
  if (globalVars) {
    processedNodes = flattenRedundantNodes(processedNodes, globalVars);
  }

  return processedNodes;
}
