import type { Node as FigmaDocumentNode } from "@figma/rest-api-spec";
import { hasValue } from "../utils/identity.js";
import type { SimplifiedEffects, SimplifiedTextStyle } from "../types/simplified-types.js";
import { htmlColor } from "./style.js";
import { 
  resolveFontStyle,    
  resolveLetterSpacing,     
  resolveLineHeight, 
  resolveVariableColorName 
}from "./utils/text-utils.js";

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
      lineHeight: resolveLineHeight((style as any).lineHeight ?? (style as any).lineHeightPx, style.fontSize),
      letterSpacing:
        resolveLetterSpacing(style.letterSpacing, style.fontSize),
      textCase: style.textCase,
      textDecoration: "textDecoration" in style ? (style as any).textDecoration : undefined,
      textAlignHorizontal: style.textAlignHorizontal,
      textAlignVertical: style.textAlignVertical,
      fontStyle: resolveFontStyle((style as any).fontStyle || (style as any).fontName?.style),
      openTypeFeatures: resolveOpenTypeFeatures((style as any).openTypeFeatures),
      color: color
    };

    if ("leadingTrim" in n && (n as any).leadingTrim === "CAP_HEIGHT") {
      textStyle.textBoxTrim = "trim-both";
      textStyle.textBoxEdge = "cap alphabetic";
    }

    return textStyle;
  }
}

// 构建富文本对象数组
type RichTextSegment = { text: string; style: SimplifiedTextStyle; effects?: SimplifiedEffects };

function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

export function extractRichTextSegments(
  n: FigmaDocumentNode,
  baseStyle: SimplifiedTextStyle,
): RichTextSegment[] | undefined {
  const styledSegments = (n as any).styledTextSegments as any[] | undefined;
  const sharedEffects = buildTextEffectsFromNode(n);
  const effects = Object.keys(sharedEffects).length ? sharedEffects : undefined;
  if (Array.isArray(styledSegments) && styledSegments.length > 0) {
    const segments = styledSegments
      .map((segment): RichTextSegment | undefined => {
        const text = segment.characters ?? segment.text;
        if (!text) return undefined;
        const style = buildSegmentTextStyle(segment, baseStyle);
        return { text, style, effects };
      })
      .filter(isDefined);
    return segments.length > 0 ? segments : undefined;
  }

  const chars = (n as any).characters as string | undefined;
  const overrides = (n as any).characterStyleOverrides as number[] | undefined;
  const overrideTable = (n as any).styleOverrideTable as Record<number, any> | undefined;
  if (!chars || !overrides || !overrideTable || overrides.length === 0) {
    return undefined;
  }

  const length = Math.min(chars.length, overrides.length);
  const segments: RichTextSegment[] = [];
  let currentText = "";
  let currentStyleId = overrides[0];
  let currentStyle = mergeTextStyle(baseStyle, overrideTable[currentStyleId]);

  // 拆分为不同文本样式的对象
  for (let i = 0; i < length; i++) {
    const styleId = overrides[i];
    // 样式发生改变时，将当前文本样式对象加入结果数组(合并样式相同的文本)
    if (styleId !== currentStyleId) {
      if (currentText) {
        segments.push({ text: currentText, style: currentStyle, effects });
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
    segments.push({ text: currentText, style: currentStyle, effects });
  }

  return segments.length > 0 ? segments : undefined;
}

// override是 figma 原始字段，与 base 合并需要转换
function mergeTextStyle(base: SimplifiedTextStyle, override: any): SimplifiedTextStyle {
  if (!override) return { ...base };
  const merged: SimplifiedTextStyle = { ...base };
  applyTextStyleOverrides(merged, override);
  return merged;
}

function resolveOpenTypeFeatures(input: any): { SUBS?: boolean; SUPS?: boolean } | undefined {
  if (!input || typeof input !== "object") return undefined;
  const subs = input.SUBS === true;
  const sups = input.SUPS === true;
  if (!subs && !sups) return undefined;
  return { SUBS: subs, SUPS: sups };
}

function extractSolidColorFromFills(fills: any): any | undefined {
  if (!Array.isArray(fills) || fills.length === 0) {
    return undefined;
  }
  const fill = fills[0];
  if (fill && fill.type === "SOLID" && fill.visible !== false) {
    const variableName = resolveVariableColorName(fill);
    const fallbackColor = htmlColor(fill.color, fill.opacity ?? 1);
    if (variableName) {
      return `var(--${variableName}, ${fallbackColor})`;
    }
    return fill.color;
  }
  if (
    fill &&
    (fill.type === "GRADIENT_LINEAR" ||
      fill.type === "GRADIENT_RADIAL" ||
      fill.type === "GRADIENT_ANGULAR" ||
      fill.type === "GRADIENT_DIAMOND") &&
    Array.isArray(fill.gradientStops) &&
    fill.gradientStops.length > 0 &&
    fill.visible !== false
  ) {
    const firstStop = fill.gradientStops[0];
    const variableName = resolveVariableColorName(firstStop);
    const fallbackColor = htmlColor(firstStop.color, fill.opacity ?? 1);
    if (variableName) {
      return `var(--${variableName}, ${fallbackColor})`;
    }
    return fallbackColor;
  }
  return undefined;
}

function buildSegmentTextStyle(segment: any, base: SimplifiedTextStyle): SimplifiedTextStyle {
  const merged: SimplifiedTextStyle = { ...base };
  applyTextStyleOverrides(merged, segment);
  return merged;
}

function applyTextStyleOverrides(target: SimplifiedTextStyle, source: any) {
  if (!source) return;
  const fontName = source.fontName;
  if (fontName?.family) target.fontFamily = fontName.family;
  if (fontName?.style) target.fontStyle = resolveFontStyle(fontName.style);
  if (source.fontFamily) target.fontFamily = source.fontFamily;
  if (source.fontWeight) target.fontWeight = source.fontWeight;
  if (source.fontSize) target.fontSize = source.fontSize;
  if (source.lineHeightPx) {
    target.lineHeight = `${source.lineHeightPx}px`;
  } else if (source.lineHeight) {
    target.lineHeight = resolveLineHeight(source.lineHeight, target.fontSize);
  }
  if (source.letterSpacing !== undefined) {
    target.letterSpacing = resolveLetterSpacing(source.letterSpacing, target.fontSize);
  }
  if (source.textCase) target.textCase = source.textCase;
  if (source.textDecoration) target.textDecoration = source.textDecoration;
  if (source.textAlignHorizontal) target.textAlignHorizontal = source.textAlignHorizontal;
  if (source.textAlignVertical) target.textAlignVertical = source.textAlignVertical;
  const overrideOpenType = resolveOpenTypeFeatures(source.openTypeFeatures);
  if (overrideOpenType) target.openTypeFeatures = overrideOpenType;
  const color = extractSolidColorFromFills(source.fills);
  if (color) target.color = color;
  if (source.leadingTrim === "CAP_HEIGHT") {
    target.textBoxTrim = "trim-both";
    target.textBoxEdge = "cap alphabetic";
  }
  if (source.fontStyle && !target.fontStyle) {
    target.fontStyle = resolveFontStyle(source.fontStyle);
  }
}

export function buildTextEffectsFromNode(n: FigmaDocumentNode): SimplifiedEffects {
  const effects = hasValue("effects", n) ? n.effects.filter((e) => e.visible) : [];
  const dropShadows = effects
    .filter((e: any) => e.type === "DROP_SHADOW")
    .map((e: any) => `${e.offset.x}px ${e.offset.y}px ${e.radius}px ${e.spread ?? 0}px ${htmlColor(e.color, e.color.a)}`);
  const innerShadows = effects
    .filter((e: any) => e.type === "INNER_SHADOW")
    .map((e: any) => `inset ${e.offset.x}px ${e.offset.y}px ${e.radius}px ${e.spread ?? 0}px ${htmlColor(e.color, e.color.a)}`);
  const textShadow = [...dropShadows, ...innerShadows].join(", ");
  const filterBlurValues = effects
    .filter((e: any) => e.type === "LAYER_BLUR")
    .map((e: any) => `blur(${e.radius}px)`)
    .join(" ");
  const backdropFilterValues = effects
    .filter((e: any) => e.type === "BACKGROUND_BLUR")
    .map((e: any) => `blur(${e.radius}px)`)
    .join(" ");
  const result: SimplifiedEffects = {};
  if (textShadow) result.textShadow = textShadow;
  if (filterBlurValues) result.filter = filterBlurValues;
  if (backdropFilterValues) result.backdropFilter = backdropFilterValues;
  return result;
}
