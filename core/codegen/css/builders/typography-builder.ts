
import type { SimplifiedTextStyle } from "../../../types/simplified-types.js";
import { px, toCssColor } from "../utils/css-color.js";

/**
 * Builds CSS styles for Typography properties
 */
export const typographyBuilder = (text: SimplifiedTextStyle): Record<string, string> => {
  const styles: Record<string, string> = {};

  if (text.fontFamily) styles["font-family"] = `"${text.fontFamily}", sans-serif`;
  if (text.fontSize) styles["font-size"] = px(text.fontSize);
  if (text.fontWeight && text.fontWeight !== 400) styles["font-weight"] = String(text.fontWeight);
  
  if (text.lineHeight) {
    const lh = typeof text.lineHeight === "number" ? px(text.lineHeight) : text.lineHeight;
    if (lh !== "normal") styles["line-height"] = lh;
  }

  if (text.letterSpacing) {
    const ls = typeof text.letterSpacing === "number" ? px(text.letterSpacing) : text.letterSpacing;
    if (ls !== "0" && ls !== "0px" && ls !== "0%") styles["letter-spacing"] = ls;
  }
  
  if (text.textAlignHorizontal && text.textAlignHorizontal !== "LEFT") {
    const alignMap: any = { CENTER: "center", RIGHT: "right", JUSTIFIED: "justify" };
    if (alignMap[text.textAlignHorizontal]) {
      styles["text-align"] = alignMap[text.textAlignHorizontal];
    }
  }

  if (text.textCase) {
    const caseMap: any = { UPPER: "uppercase", LOWER: "lowercase", TITLE: "capitalize" };
    if (caseMap[text.textCase]) {
      styles["text-transform"] = caseMap[text.textCase];
    }
  }

  if (text.textDecoration) {
    const decoMap: any = { UNDERLINE: "underline", STRIKETHROUGH: "line-through" };
    if (decoMap[text.textDecoration]) {
      styles["text-decoration"] = decoMap[text.textDecoration];
    }
  }

  if (text.fontStyle) {
    const styleMap: any = { ITALIC: "italic", italic: "italic" };
    if (styleMap[text.fontStyle]) {
      styles["font-style"] = styleMap[text.fontStyle];
    }
  }

  if (text.color) styles["color"] = toCssColor(text.color);
  styles["word-wrap"] = "break-word";

  return styles;
};
