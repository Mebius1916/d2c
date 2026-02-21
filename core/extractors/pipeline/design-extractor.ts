import type {
  GetFileResponse,
  GetFileNodesResponse,
} from "@figma/rest-api-spec";
import { simplifyComponents, simplifyComponentSets } from "../../transformers/component.js";
import type { SimplifiedDesign, TraversalContext } from "../../types/extractor-types.js";
import { extractFromDesign } from "./node-processor.js";
import { normalizeNodeStyles } from "../algorithms/style-normalization.js";
import { resolveImageAssetsFromFigma } from "./utils/image-assets.js";
import type { ReconstructionStepFlags } from "./reconstruction.js";
import { parseAPIResponse } from "./utils/parse-api.js";

/**
 * Extract a complete SimplifiedDesign from raw Figma API response using extractors.
 */
export async function simplifyRawFigmaObjectWithImages(
  apiResponse: GetFileResponse | GetFileNodesResponse,
  options: {
    fileKey: string;
    token: string;
    format?: "png" | "jpg" | "svg" | "pdf";
    scale?: number;
    reconstruction?: { enabled?: ReconstructionStepFlags };
  },
): Promise<SimplifiedDesign> {
  const { metadata, rawNodes, components, componentSets, extraStyles } =
    parseAPIResponse(apiResponse);

  const globalVars: TraversalContext["globalVars"] = {
    styles: {},
    extraStyles,
    imageAssets: { nodeIds: [], imageRefs: [], svgNodeIds: [] },
  };
  const { nodes: extractedNodes, globalVars: finalGlobalVars } = extractFromDesign(
    rawNodes,
    globalVars,
    options.reconstruction ? { reconstruction: options.reconstruction } : undefined,
  );

  // 类名合并优化：将所有节点的 styles 合并为单一 styleId
  const normalizedNodes = normalizeNodeStyles(extractedNodes, finalGlobalVars);

  const design: SimplifiedDesign = {
    ...metadata,
    nodes: normalizedNodes,
    components: simplifyComponents(components),
    componentSets: simplifyComponentSets(componentSets),
    globalVars: {
      styles: finalGlobalVars.styles,
      imageAssets: finalGlobalVars.imageAssets,
    },
  };

  return resolveImageAssetsFromFigma(design, options);
}
