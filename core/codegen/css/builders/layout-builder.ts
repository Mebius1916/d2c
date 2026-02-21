
import type { SimplifiedLayout } from "../../../types/simplified-types.js";
import { px } from "../utils/css-color.js";

// 布局构造器
export const layoutBuilder = (layout: SimplifiedLayout): Record<string, string> => {
  const styles: Record<string, string> = {};

  if (layout.mode === "none") {
    styles["position"] = "relative";
    return styles;
  }

  styles["display"] = "flex";
  styles["flex-direction"] = layout.mode;
  if (layout.wrap) styles["flex-wrap"] = "wrap";

  // Alignment
  if (layout.justifyContent && layout.justifyContent !== "flex-start") {
    styles["justify-content"] = layout.justifyContent;
  }
  if (layout.alignItems && layout.alignItems !== "flex-start") {
    styles["align-items"] = layout.alignItems;
  }

  // Spacing
  if (layout.gap) styles["gap"] = layout.gap;
  if (layout.padding) styles["padding"] = layout.padding;
  if (layout.alignSelf) styles["align-self"] = layout.alignSelf;

  if (layout.minWidth !== undefined) styles["min-width"] = px(layout.minWidth);
  if (layout.maxWidth !== undefined) styles["max-width"] = px(layout.maxWidth);
  if (layout.minHeight !== undefined) styles["min-height"] = px(layout.minHeight);
  if (layout.maxHeight !== undefined) styles["max-height"] = px(layout.maxHeight);

  // Sizing
  const sizing = layout.sizing;
  const textAutoResize = layout.textAutoResize;
  const allowWidth = textAutoResize !== "WIDTH_AND_HEIGHT";
  const allowHeight = textAutoResize === "NONE" || textAutoResize === "TRUNCATE";
  if (sizing) {
    if (sizing.horizontal === "fill") {
      if (layout.parentMode === "row") {
        styles["flex"] = "1 1 0";
      } else if (allowWidth) {
        if (layout.maxWidth !== undefined) {
          styles["width"] = "100%";
        } else {
          styles["align-self"] = "stretch";
        }
      }
    } else if (sizing.horizontal === "hug") {
      if (allowWidth) styles["width"] = "max-content";
    } else if (layout.dimensions?.width && sizing.horizontal === "fixed") {
      if (allowWidth) styles["width"] = px(layout.dimensions.width);
    }

    if (sizing.vertical === "fill") {
      if (layout.parentMode === "column") {
        styles["flex"] = "1 1 0";
      } else if (allowHeight) {
        if (layout.maxHeight !== undefined) {
          styles["height"] = "100%";
        } else {
          styles["align-self"] = "stretch";
        }
      }
    } else if (sizing.vertical === "hug") {
      if (allowHeight) styles["height"] = "max-content";
    } else if (layout.dimensions?.height && sizing.vertical === "fixed") {
      if (allowHeight) styles["height"] = px(layout.dimensions.height);
    }
  }

  // Positioning
  if (layout.position === "absolute") {
    styles["position"] = "absolute";
    if (layout.locationRelativeToParent) {
      const { x, y } = layout.locationRelativeToParent;
      styles["left"] = px(x);
      styles["top"] = px(y);
    }
  }

  if (layout.overflowScroll && layout.overflowScroll.length > 0) {
    const hasX = layout.overflowScroll.includes("x");
    const hasY = layout.overflowScroll.includes("y");
    if (hasX && hasY) {
      styles["overflow"] = "auto";
    } else {
      if (hasX) styles["overflow-x"] = "auto";
      if (hasY) styles["overflow-y"] = "auto";
    }
  }

  if (layout.textTruncation && layout.maxLines && layout.maxLines > 0) {
    styles["overflow"] = "hidden";
    styles["display"] = "-webkit-box";
    styles["-webkit-box-orient"] = "vertical";
    styles["-webkit-line-clamp"] = String(layout.maxLines);
    styles["text-overflow"] = "ellipsis";
  }

  return styles;
};
