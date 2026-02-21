import type { ExtractorFn } from "../../types/extractor-types.js";
import { hasValue } from "../../utils/identity.js";
import { isImageNode } from "../../transformers/image.js";
import { isIcon } from "../../transformers/icon.js";

export const imageExtractor: ExtractorFn = (node, context) => {
  const imageAssets = context.globalVars.imageAssets || { nodeIds: [], imageRefs: [], svgNodeIds: [] };
  const ids = imageAssets.nodeIds;
  const imageRefs = imageAssets.imageRefs;
  const svgNodeIds = imageAssets.svgNodeIds || [];
  imageAssets.svgNodeIds = svgNodeIds;

  if (isImageNode(node)) {
    pushUnique(ids, node.id);
  }
  if (isIcon(node)) {
    pushUnique(svgNodeIds, node.id);
  }

  if (hasValue("fills", node) && Array.isArray(node.fills) && node.fills.length) {
    node.fills.forEach((fill: any) => {
      if (fill?.type === "PATTERN" && fill.sourceNodeId) {
        pushUnique(ids, fill.sourceNodeId);
        return;
      }
      if (fill?.type === "IMAGE") {
        if (fill.imageRef) pushUnique(imageRefs, fill.imageRef);
        if (fill.gifRef) pushUnique(imageRefs, fill.gifRef);
      }
    });
  }

  context.globalVars.imageAssets = imageAssets;
  return {};
};

function pushUnique(list: string[], id: string) {
  if (!list.includes(id)) list.push(id);
}
