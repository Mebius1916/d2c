import type { Node as FigmaDocumentNode } from "@figma/rest-api-spec";
import { hasValue, isTruthy } from "../utils/identity.js";
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

// Keep other simple properties directly
export function extractNodeText(n: FigmaDocumentNode) {
  // @ts-ignore
  if (hasValue("characters", n, isTruthy)) {
    return (n as any).characters;
  }
}

export function extractTextStyle(n: FigmaDocumentNode) {
  if (hasTextStyle(n)) {
    const style = n.style;
    
    // Attempt to extract solid color from fills
    let color: any = undefined;
    if ("fills" in n && Array.isArray(n.fills) && n.fills.length > 0) {
      const fill = n.fills[0];
      if (fill.type === "SOLID" && fill.visible !== false) {
        color = fill.color;
      }
    }

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
      textAlignHorizontal: style.textAlignHorizontal,
      textAlignVertical: style.textAlignVertical,
      color: color
    };

    // Rich Text Extraction Simulation
    // Since we are not in a Plugin environment (likely processing REST API JSON),
    // we need to check for 'characterStyleOverrides' and 'styleOverrideTable'.
    // This is how Figma REST API exposes mixed styles.
    // @ts-ignore
    if (n.characterStyleOverrides && n.styleOverrideTable && n.characters) {
      const chars = (n as any).characters as string;
      const overrides = (n as any).characterStyleOverrides as number[];
      const overrideTable = (n as any).styleOverrideTable as Record<number, any>;

      const segments: { text: string; style: SimplifiedTextStyle }[] = [];
      
      let currentSegmentText = "";
      let currentStyleId = overrides[0];
      
      // Merge initial base style with first override
      let currentStyle = mergeStyles(textStyle, overrideTable[currentStyleId]);

      for (let i = 0; i < chars.length; i++) {
        const styleId = overrides[i];
        
        // If style changes, push current segment and start new one
        if (styleId !== currentStyleId) {
          if (currentSegmentText) {
            segments.push({ text: currentSegmentText, style: currentStyle });
          }
          currentSegmentText = chars[i];
          currentStyleId = styleId;
          // Merge base style with new override
          currentStyle = mergeStyles(textStyle, overrideTable[styleId]);
        } else {
          currentSegmentText += chars[i];
        }
      }
      
      // Push last segment
      if (currentSegmentText) {
        segments.push({ text: currentSegmentText, style: currentStyle });
      }

      if (segments.length > 0) {
        textStyle.richText = segments;
      }
    }

    return textStyle;
  }
}

// Helper to merge base style with overrides
function mergeStyles(base: SimplifiedTextStyle, override: any): SimplifiedTextStyle {
  if (!override) return { ...base };
  
  // Map override properties (which match Figma API names) to SimplifiedTextStyle keys
  // Note: REST API overrides often have same keys as 'style' object.
  const merged: SimplifiedTextStyle = { ...base };
  
  if (override.fontFamily) merged.fontFamily = override.fontFamily;
  if (override.fontWeight) merged.fontWeight = override.fontWeight;
  if (override.fontSize) merged.fontSize = override.fontSize;
  // Fills are tricky in overrides, often just 'fills' array. 
  // For simplicity, we assume solid color override if present.
  if (override.fills && override.fills.length > 0 && override.fills[0].type === 'SOLID') {
    merged.color = override.fills[0].color;
  }
  
  return merged;
}
