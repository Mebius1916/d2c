
import type { SimplifiedFill, SimplifiedStroke, SimplifiedImageFill, SimplifiedGradientFill, SimplifiedPatternFill } from "../../../types/simplified-types.js";
import type { SimplifiedEffects } from "../../../types/simplified-types.js";
import { toCssColor } from "../utils/css-color.js";

// 可视化样式构造器
export const visualBuilder = {
  fills: (fills: SimplifiedFill[]): Record<string, string> => {
    const styles: Record<string, string> = {};
    if (fills.length === 0) return styles;

    const isColor = (f: SimplifiedFill) =>
      typeof f === "string" ||
      ("r" in f && "g" in f && "b" in f) ||
      ("type" in f && f.type === "SOLID");

    const toSolidColor = (f: SimplifiedFill) => {
      if (typeof f === "string" || ("r" in f && "g" in f && "b" in f)) {
        return toCssColor(f);
      }
      if ("type" in f && f.type === "SOLID") {
        return toCssColor((f as any).color);
      }
      return "";
    };

    // Optimization: Single solid color
    if (fills.length === 1 && isColor(fills[0])) {
      const color = toSolidColor(fills[0]);
      if (color) styles["background-color"] = color;
      return styles;
    }

    // Complex: Stacked backgrounds
    let objectFit: string | undefined;
    const sizeLayers: string[] = [];
    const repeatLayers: string[] = [];
    const positionLayers: string[] = [];
    const blendModeLayers: string[] = [];
    let hasSize = false;
    let hasRepeat = false;
    let hasPosition = false;
    let hasBlendMode = false;

    const bgLayers: string[] = [];
    fills.forEach((fill) => {
      let layer = "";
      let size = "";
      let repeat = "";
      let position = "";
      let blendMode = "normal";
      if (typeof fill === "string") {
        layer = `linear-gradient(0deg, ${fill}, ${fill})`;
      } else if ("r" in fill) {
        layer = `linear-gradient(0deg, ${toCssColor(fill)}, ${toCssColor(fill)})`;
      } else if (typeof fill === "object" && "type" in fill) {
        const typedFill = fill as SimplifiedImageFill | SimplifiedPatternFill | SimplifiedGradientFill | { type: "SOLID"; color: any; blendMode?: string };
        if ((typedFill as any).blendMode) {
          blendMode = (typedFill as any).blendMode;
          if (blendMode !== "normal") hasBlendMode = true;
        }
        if (typedFill.type === "SOLID") {
          const color = toSolidColor(typedFill as any);
          if (color) {
            layer = `linear-gradient(0deg, ${color}, ${color})`;
          }
        } else if (typedFill.type === "IMAGE") {
          const imageFill = typedFill as SimplifiedImageFill;
          if (imageFill.objectFit) objectFit = imageFill.objectFit;
          size = imageFill.backgroundSize || (imageFill.isBackground === false ? "" : "cover");
          repeat = imageFill.backgroundRepeat || (imageFill.isBackground === false ? "" : "no-repeat");
          position = (imageFill as any).backgroundPosition || "";
          layer = `url(${imageFill.imageRef || ""})`;
        } else if (typedFill.type === "PATTERN") {
          const patternFill = typedFill as SimplifiedPatternFill;
          size = patternFill.backgroundSize;
          repeat = patternFill.backgroundRepeat;
          position = patternFill.backgroundPosition;
          layer = `url(${patternFill.patternSource.url})`;
        } else if (typedFill.type.startsWith("GRADIENT")) {
          layer = (typedFill as SimplifiedGradientFill).gradient || "";
        }
      }

      if (layer) {
        bgLayers.push(layer);
        sizeLayers.push(size || "auto");
        repeatLayers.push(repeat || "repeat");
        positionLayers.push(position || "0% 0%");
        blendModeLayers.push(blendMode);
        if (size) hasSize = true;
        if (repeat) hasRepeat = true;
        if (position) hasPosition = true;
      }
    });

    if (bgLayers.length > 0) {
      styles["background-image"] = bgLayers.join(", ");
      if (hasSize) styles["background-size"] = sizeLayers.join(", ");
      if (hasRepeat) styles["background-repeat"] = repeatLayers.join(", ");
      if (hasPosition) styles["background-position"] = positionLayers.join(", ");
      if (hasBlendMode) styles["background-blend-mode"] = blendModeLayers.join(", ");
    }
    if (objectFit) {
      styles["object-fit"] = objectFit;
    }
    return styles;
  },

  strokes: (strokes: SimplifiedStroke): Record<string, string> => {
    const styles: Record<string, string> = {};
    if (!strokes.colors || strokes.colors.length === 0) return styles;

    const color = toCssColor(strokes.colors[0]);
    const width = strokes.strokeWeights || strokes.strokeWeight || "1px";
    const style = strokes.strokeDashes ? "dashed" : "solid";
    const isUniformWidth = !width.includes(" ");
    const align = strokes.strokeAlign;

    if (align && isUniformWidth && (align === "CENTER" || align === "INSIDE" || align === "OUTSIDE")) {
      styles["outline"] = `${width} ${style} ${color}`;
      if (align === "CENTER") {
        styles["outline-offset"] = `calc(${width} / -2)`;
      } else if (align === "INSIDE") {
        styles["outline-offset"] = `calc(${width} * -1)`;
      }
    } else if (isUniformWidth) {
      styles["border"] = `${width} ${style} ${color}`;
    } else {
      styles["border-style"] = style;
      styles["border-color"] = color;
      styles["border-width"] = width;
    }
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
