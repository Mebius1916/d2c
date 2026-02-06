import type { ExtractorFn } from "../types.js";
import { buildSimplifiedLayout } from "../../transformers/layout.js";
import { findOrCreateVar } from "../../utils/style-helper.js";
import { isLayout, isRectangle } from "../../utils/identity.js";

/**
 * Extracts layout-related properties from a node.
 */
export const layoutExtractor: ExtractorFn = (node, result, context) => {
  // 1. Extract CSS Layout styles
  const layout = buildSimplifiedLayout(node, context.parent);
  if (Object.keys(layout).length > 1) {
    result.layout = findOrCreateVar(context.globalVars, layout, "layout");
  }

  // 2. Extract Absolute Geometry for internal algorithms (Occlusion, Clustering)
  // This is crucial: without absRect, nodes will be culled by occlusion detection!
  if (isLayout(node) || isRectangle("absoluteBoundingBox", node)) {
    const box = node.absoluteBoundingBox;
    if (box) {
      result.absRect = {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
      };
    }
  } else if (isRectangle("absoluteRenderBounds", node)) {
    // Fallback to render bounds (e.g. for Groups or weird Vectors)
    const box = node.absoluteRenderBounds;
    if (box) {
      result.absRect = {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
      };
    }
  }
};
