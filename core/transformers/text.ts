import type { Node as FigmaDocumentNode } from "@figma/rest-api-spec";
import { hasValue } from "../utils/identity.js";
import type { SimplifiedTextStyle } from "../types/simplified-types.js";

export { SimplifiedTextStyle };

export function isTextNode(
  n: FigmaDocumentNode,
): n is Extract<FigmaDocumentNode, { type: "TEXT" }> {
  return n.type === "TEXT";
}

export function hasTextStyle(
  n: FigmaDocumentNode,
): n is FigmaDocumentNode & { style: Extract<FigmaDocumentNode, { style: any }>["style"] } {
  return hasValue("style", n) && Object.keys(n.style).length > 0;
}

export function extractTextStyle(n: FigmaDocumentNode) {
  if (hasTextStyle(n)) {
    const style = n.style;
    const color = extractSolidColorFromFills("fills" in n ? (n as any).fills : undefined);

    const textStyle: SimplifiedTextStyle = {
      fontFamily: style.fontFamily,
      fontWeight: style.fontWeight,
      fontSize: style.fontSize,
      lineHeight:
        "lineHeightPx" in style && style.lineHeightPx && style.fontSize
          ? `${style.lineHeightPx / style.fontSize}em`
          : undefined,
      letterSpacing:
        style.letterSpacing && style.letterSpacing !== 0 && style.fontSize
          ? `${(style.letterSpacing / style.fontSize) * 100}%`
          : undefined,
      textCase: style.textCase,
      textDecoration: "textDecoration" in style ? (style as any).textDecoration : undefined,
      textAlignHorizontal: style.textAlignHorizontal,
      textAlignVertical: style.textAlignVertical,
      color: color
    };

    return textStyle;
  }
}

export function extractRichTextSegments(
  n: FigmaDocumentNode,
  baseStyle: SimplifiedTextStyle,
): { text: string; style: SimplifiedTextStyle }[] | undefined {
  const chars = (n as any).characters as string | undefined;
  const overrides = (n as any).characterStyleOverrides as number[] | undefined;
  const overrideTable = (n as any).styleOverrideTable as Record<number, any> | undefined;
  if (!chars || !overrides || !overrideTable || overrides.length === 0) {
    return undefined;
  }

  const length = Math.min(chars.length, overrides.length);
  const segments: { text: string; style: SimplifiedTextStyle }[] = [];
  let currentText = "";
  let currentStyleId = overrides[0];
  let currentStyle = mergeTextStyle(baseStyle, overrideTable[currentStyleId]);

  // 拆分为不同文本样式的对象
  for (let i = 0; i < length; i++) {
    const styleId = overrides[i];
    // 样式发生改变时，将当前文本样式对象加入结果数组(合并样式相同的文本)
    if (styleId !== currentStyleId) {
      if (currentText) {
        segments.push({ text: currentText, style: currentStyle });
      }
      currentText = chars[i];
      currentStyleId = styleId;
      currentStyle = mergeTextStyle(baseStyle, overrideTable[styleId]);
    } else {
      currentText += chars[i];
    }
  }

  // 清空当前文本样式对象
  if (currentText) {
    segments.push({ text: currentText, style: currentStyle });
  }

  return segments.length > 0 ? segments : undefined;
}

// override是 figma 原始字段，与 base 合并需要转换
function mergeTextStyle(base: SimplifiedTextStyle, override: any): SimplifiedTextStyle {
  if (!override) return { ...base };
  const merged: SimplifiedTextStyle = { ...base };
  if (override.fontFamily) merged.fontFamily = override.fontFamily;
  if (override.fontWeight) merged.fontWeight = override.fontWeight;
  if (override.fontSize) merged.fontSize = override.fontSize;
  if (override.lineHeightPx) {
    const fontSize = override.fontSize || merged.fontSize;
    if (fontSize) {
      merged.lineHeight = `${override.lineHeightPx / fontSize}em`;
    }
  }
  if (override.letterSpacing !== undefined) {
    const fontSize = override.fontSize || merged.fontSize;
    if (fontSize) {
      merged.letterSpacing = `${(override.letterSpacing / fontSize) * 100}%`;
    }
  }
  if (override.textCase) merged.textCase = override.textCase;
  if (override.textDecoration) merged.textDecoration = override.textDecoration;
  if (override.textAlignHorizontal) merged.textAlignHorizontal = override.textAlignHorizontal;
  if (override.textAlignVertical) merged.textAlignVertical = override.textAlignVertical;
  const color = extractSolidColorFromFills(override.fills);
  if (color) merged.color = color;
  return merged;
}

function extractSolidColorFromFills(fills: any): any | undefined {
  if (!Array.isArray(fills) || fills.length === 0) {
    return undefined;
  }
  const fill = fills[0];
  if (fill && fill.type === "SOLID" && fill.visible !== false) {
    return fill.color;
  }
  return undefined;
}
