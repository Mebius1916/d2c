import type { ExtractorFn, SimplifiedNode } from "../../types/extractor-types.js";
import { buildSimplifiedStrokes, parsePaint, toCssBlendMode } from "../../transformers/style.js";
import { buildSimplifiedEffects } from "../../transformers/effects.js";
import { hasValue, isRectangleCornerRadii } from "../../utils/identity.js";
import { findOrCreateVar, getStyleName } from "../../utils/style-helper.js";

/**
 * Extracts visual appearance properties (fills, strokes, effects, opacity, border radius).
 */
export const visualsExtractor: ExtractorFn = (node, context) => {
  const result: Partial<SimplifiedNode> = {};

  // Check if node has children to determine CSS properties
  const hasChildren =
    hasValue("children", node) && Array.isArray(node.children) && node.children.length > 0;

  // fills
  if (hasValue("fills", node) && Array.isArray(node.fills) && node.fills.length) {
    const fills = node.fills.map((fill) => parsePaint(fill, hasChildren)).reverse();
    const styleName = getStyleName(node, context, ["fill", "fills"]);
    if (styleName) {
      context.globalVars.styles[styleName] = fills;
      result.fills = styleName;
    } else {
      result.fills = findOrCreateVar(context.globalVars, fills, "fill");
    }
  }

  // strokes
  const strokes = buildSimplifiedStrokes(node, hasChildren);
  if (strokes.colors.length) {
    const styleName = getStyleName(node, context, ["stroke", "strokes"]);
    if (styleName) {
      const hasExtraStrokeProps =
        !!strokes.strokeWeight ||
        !!strokes.strokeWeights ||
        !!strokes.strokeDashes ||
        !!strokes.strokeAlign;
      if (hasExtraStrokeProps) {
        result.strokes = findOrCreateVar(context.globalVars, strokes, "stroke");
      } else {
        context.globalVars.styles[styleName] = strokes.colors;
        result.strokes = styleName;
      }
    } else {
      result.strokes = findOrCreateVar(context.globalVars, strokes, "stroke");
    }
  }

  // effects
  const effects = buildSimplifiedEffects(node);
  if (Object.keys(effects).length) {
    const styleName = getStyleName(node, context, ["effect", "effects"]);
    if (styleName) {
      // Effects styles store only the effect values
      context.globalVars.styles[styleName] = effects;
      result.effects = styleName;
    } else {
      result.effects = findOrCreateVar(context.globalVars, effects, "effect");
    }
  }

  // opacity
  if (hasValue("opacity", node) && typeof node.opacity === "number" && node.opacity !== 1) {
    result.opacity = node.opacity;
  }

  if (hasValue("visible", node) && node.visible === false) {
    result.visible = false;
  }

  if (hasValue("blendMode", node) && typeof node.blendMode === "string") {
    const blendMode = toCssBlendMode(node.blendMode);
    if (blendMode) result.blendMode = blendMode;
  }

  // border radius
  if (hasValue("cornerRadius", node) && typeof node.cornerRadius === "number") {
    result.borderRadius = `${node.cornerRadius}px`;
  }
  if (hasValue("rectangleCornerRadii", node, isRectangleCornerRadii)) {
    result.borderRadius = `${node.rectangleCornerRadii[0]}px ${node.rectangleCornerRadii[1]}px ${node.rectangleCornerRadii[2]}px ${node.rectangleCornerRadii[3]}px`;
  }

  return result;
};
