import type { Node as FigmaDocumentNode } from "@figma/rest-api-spec";
import { removeOccludedNodes } from "../algorithms/occlusion.js";
import { reparentNodes } from "../algorithms/reparenting.js";
import { groupNodesByLayout } from "../algorithms/layout-grouping.js";
import { inferListPatterns } from "../algorithms/list-inference.js";
import { groupNodesByAdjacency } from "../algorithms/adjacency-clustering.js";
import { processNodeWithExtractors, shouldProcessNode } from "./node-processor.js";
import type {
  ExtractorFn,
  TraversalContext,
  TraversalOptions,
  GlobalVars,
  SimplifiedNode,
} from "../types.js";

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
    .filter((node) => shouldProcessNode(node, options))  // 剔除不可见节点
    .map((node) => processNodeWithExtractors(node, extractors, context, options)) // 节点转换
    .filter((node): node is SimplifiedNode => node !== null); // 过滤无效节点

  const visibleNodes = removeOccludedNodes(processedNodes); // 完全遮挡检测
  const reconstructedNodes = reparentNodes(visibleNodes); // 父子分组
  const groupedNodes = groupNodesByLayout(reconstructedNodes); // 行列分组
  const listNodes = inferListPatterns(groupedNodes); // 特征分组
  const finalNodes = groupNodesByAdjacency(listNodes); // 相邻成组

  return {
    nodes: finalNodes,
    globalVars: context.globalVars,
  };
}
