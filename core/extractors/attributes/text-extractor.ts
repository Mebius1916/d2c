import type { ExtractorFn, SimplifiedNode } from "../../types/extractor-types.js";
import { findOrCreateVar, getStyleName } from "../../utils/style-helper.js";
import { 
  buildTextEffectsFromNode, 
  extractRichTextSegments, 
  extractTextStyle, 
  hasTextStyle, 
  isTextNode 
} from "../../transformers/text.js";

/**
 * Extracts text content and text styling from a node.
 */
export const textExtractor: ExtractorFn = (node, context) => {
  const result: Partial<SimplifiedNode> = {};

  // Extract text content
  if (isTextNode(node)) {
    const textStyle = hasTextStyle(node) ? extractTextStyle(node) : undefined;
    const baseStyle = (textStyle || {}) as any;
    let richText = textStyle ? extractRichTextSegments(node, baseStyle) : undefined;
    if (!richText) {
      const text = (node as any).characters as string | undefined;
      const sharedEffects = buildTextEffectsFromNode(node);
      const effects = Object.keys(sharedEffects).length ? sharedEffects : undefined;
      richText = text ? [{ text, style: baseStyle, effects }] : undefined;
    }
    if (richText) {
      result.richText = richText;
    }

    if (textStyle) {
      const styleName = getStyleName(node, context, ["text", "typography"]);
      if (styleName) {
        context.globalVars.styles[styleName] = textStyle;
        result.textStyle = styleName;
      } else {
        result.textStyle = findOrCreateVar(context.globalVars, textStyle, "style");
      }
    }
  }

  return result;
};
