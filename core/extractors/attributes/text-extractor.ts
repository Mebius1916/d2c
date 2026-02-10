import type { ExtractorFn, SimplifiedNode } from "../../types/extractor-types.js";
import {
  extractNodeText,
  extractTextStyle,
  hasTextStyle,
  isTextNode,
} from "../../transformers/text.js";
import { findOrCreateVar, getStyleName } from "../../utils/style-helper.js";

/**
 * Extracts text content and text styling from a node.
 */
export const textExtractor: ExtractorFn = (node, context) => {
  const result: Partial<SimplifiedNode> = {};

  // Extract text content
  if (isTextNode(node)) {
    result.text = extractNodeText(node);
  }

  // Extract text style
  if (hasTextStyle(node)) {
    const textStyle = extractTextStyle(node);
    if (textStyle) {
      // Prefer Figma named style when available
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
