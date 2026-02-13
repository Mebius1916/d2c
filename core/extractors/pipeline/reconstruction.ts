import { removeOccludedNodes } from "../algorithms/occlusion.js";
import { mergeSpatialIcons } from "../algorithms/spatial-merging.js";
import { reparentNodes } from "../algorithms/reparenting.js";
import { groupNodesByLayout } from "../algorithms/layout-grouping.js";
import { inferListPatterns } from "../algorithms/list-inference.js";
import { groupNodesByAdjacency } from "../algorithms/adjacency-clustering.js";
import { flattenRedundantNodes } from "../algorithms/flattening.js";
import type { SimplifiedNode, TraversalContext } from "../../types/extractor-types.js";

/**
 * Phase 1: Structure Optimization Pipeline
 */
export function runStructurePipeline(nodes: SimplifiedNode[]): SimplifiedNode[] {
  if (nodes.length === 0) return [];

  // 1. Occlusion Culling
  let processedNodes = removeOccludedNodes(nodes);

  // 2. Spatial Merging
  processedNodes = mergeSpatialIcons(processedNodes);

  // 3. Reparenting
  processedNodes = reparentNodes(processedNodes);

  return processedNodes;
}

/**
 * Phase 2: Layout Inference Pipeline
 */
export function runLayoutPipeline(
  nodes: SimplifiedNode[],
  globalVars?: TraversalContext["globalVars"]
): SimplifiedNode[] {
  if (nodes.length === 0) return [];

  // 1. Layout Grouping
  let processedNodes = groupNodesByLayout(nodes);

  // 2. List Inference
  processedNodes = inferListPatterns(processedNodes);

  // 3. Adjacency Clustering
  processedNodes = groupNodesByAdjacency(processedNodes);

  // 4. Flattening
  if (globalVars) {
    processedNodes = flattenRedundantNodes(processedNodes, globalVars);
  }

  return processedNodes;
}
