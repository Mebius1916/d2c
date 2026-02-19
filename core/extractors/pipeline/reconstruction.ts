import { removeOccludedNodes } from "../algorithms/occlusion.js";
import { mergeSpatialIcons } from "../algorithms/spatial-merging.js";
import { reparentNodes } from "../algorithms/reparenting.js";
import { groupNodesByLayout } from "../algorithms/layout-grouping.js";
import { inferListPatterns } from "../algorithms/list-inference.js";
import { groupNodesByAdjacency } from "../algorithms/adjacency-clustering.js";
import { flattenRedundantNodes } from "../algorithms/flattening.js";
import { inferSemanticTags } from "../algorithms/semantic-inference.js";
import type { SimplifiedNode, TraversalContext } from "../../types/extractor-types.js";

/**
 * Structure + Layout Pipeline
 */
export function runReconstructionPipeline(
  nodes: SimplifiedNode[],
  globalVars?: TraversalContext["globalVars"]
): SimplifiedNode[] {
  if (nodes.length === 0) return [];

  // 1. Occlusion Culling
  let processedNodes = removeOccludedNodes(nodes);

  // 2. Spatial Merging
  processedNodes = mergeSpatialIcons(processedNodes);

  // 3. Reparenting
  processedNodes = reparentNodes(processedNodes);

  // 4. Layout Grouping
  processedNodes = groupNodesByLayout(processedNodes);

  // 5. List Inference
  processedNodes = inferListPatterns(processedNodes);

  // 6. Adjacency Clustering
  processedNodes = groupNodesByAdjacency(processedNodes);

  // 7. Semantic Inference
  processedNodes = inferSemanticTags(processedNodes);

  // 8. Flattening
  if (globalVars) {
    processedNodes = flattenRedundantNodes(processedNodes, globalVars);
  }

  return processedNodes;
}
