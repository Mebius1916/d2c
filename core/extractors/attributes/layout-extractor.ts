import type { ExtractorFn, SimplifiedNode } from "../../types/extractor-types.js";
import { buildSimplifiedLayout } from "../../transformers/layout.js";
import { findOrCreateVar } from "../../utils/style-helper.js";
import { isLayout, isRectangle } from "../../utils/identity.js";
import { pixelRound } from "../../utils/common.js";

/**
 * Extracts layout-related properties from a node.
 */
export const layoutExtractor: ExtractorFn = (node, context) => {
  const result: Partial<SimplifiedNode> = {};

  // 1. Extract CSS Layout styles
  const layout = buildSimplifiedLayout(node, context.parent);
  if (Object.keys(layout).length > 1) {
    result.layout = findOrCreateVar(context.globalVars, layout, "layout");
  }

  // 2. Extract Rotation / Transform
  if ("rotation" in node && typeof node.rotation === "number") {
    if (Math.abs(node.rotation) > 0.01) {
      result.rotation = pixelRound(node.rotation);
      result.transform = `rotate(${-result.rotation}deg)`;
    }
  } else if ("relativeTransform" in node && node.relativeTransform) {   
    const t = node.relativeTransform;
    // Implementation:
    const angleRad = Math.atan2(t[1][0], t[0][0]); 
    const angleDeg = angleRad * (180 / Math.PI);
    
    if (Math.abs(angleDeg) > 0.01) {
      result.rotation = pixelRound(angleDeg);
      result.transform = `rotate(${-result.rotation}deg)`;
    }
  }

  // 3. Extract Absolute Geometry for internal algorithms (Occlusion, Clustering)
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

  return result;
};
