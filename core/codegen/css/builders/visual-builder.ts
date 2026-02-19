
import type { SimplifiedFill, SimplifiedStroke, SimplifiedImageFill, SimplifiedGradientFill } from "../../../types/simplified-types.js";
import type { SimplifiedEffects } from "../../../types/simplified-types.js";
import { toCssColor } from "../utils/css-color.js";

/**
 * Builds CSS styles for Visual properties (Fills, Strokes, Effects)
 */
export const visualBuilder = {
  fills: (fills: SimplifiedFill[]): Record<string, string> => {
    const styles: Record<string, string> = {};
    if (fills.length === 0) return styles;

    const isColor = (f: SimplifiedFill) => typeof f === 'string' || ('r' in f && 'g' in f && 'b' in f);

    // Optimization: Single solid color
    if (fills.length === 1 && isColor(fills[0])) {
      styles["background-color"] = toCssColor(fills[0]);
      return styles;
    }

    // Complex: Stacked backgrounds
    const bgLayers = fills.map((fill) => {
      if (typeof fill === 'string') return `linear-gradient(0deg, ${fill}, ${fill})`;
      if ('r' in fill) return `linear-gradient(0deg, ${toCssColor(fill)}, ${toCssColor(fill)})`;
      
      if ('type' in fill) {
        if (fill.type === "IMAGE") return `url(${(fill as SimplifiedImageFill).imageRef || ""})`;
        if (fill.type.startsWith("GRADIENT")) return (fill as SimplifiedGradientFill).gradient || "";
      }
      return "";
    }).filter(Boolean);

    if (bgLayers.length > 0) {
      styles["background-image"] = bgLayers.join(", ");
      styles["background-size"] = "cover";
      styles["background-repeat"] = "no-repeat";
    }
    return styles;
  },

  strokes: (strokes: SimplifiedStroke): Record<string, string> => {
    const styles: Record<string, string> = {};
    if (!strokes.colors || strokes.colors.length === 0) return styles;

    const color = toCssColor(strokes.colors[0]);
    const width = strokes.strokeWeight || "1px";
    const style = strokes.strokeDashes ? "dashed" : "solid";

    styles["border"] = `${width} ${style} ${color}`;
    return styles;
  },

  effects: (effects: SimplifiedEffects): Record<string, string> => {
    const styles: Record<string, string> = {};
    const effectList = Array.isArray(effects) ? effects : [effects];
    const shadows: string[] = [];

    effectList.forEach((e) => {
      if (e.visible === false) return;
      if (e.type.includes("SHADOW")) {
        const inset = e.type === "INNER_SHADOW" ? "inset " : "";
        shadows.push(`${inset}${e.offset?.x ?? 0}px ${e.offset?.y ?? 0}px ${e.radius ?? 0}px ${e.spread ?? 0}px ${toCssColor(e.color)}`);
      }
      if (e.type === "LAYER_BLUR") styles["filter"] = `blur(${e.radius}px)`;
      if (e.type === "BACKGROUND_BLUR") styles["backdrop-filter"] = `blur(${e.radius}px)`;
    });

    if (shadows.length > 0) styles["box-shadow"] = shadows.join(", ");
    return styles;
  }
};
