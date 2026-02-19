
import type { SimplifiedLayout } from "../../../types/simplified-types.js";
import { px } from "../utils/css-color.js";

/**
 * Builds CSS styles for Layout properties (Flexbox, Positioning, Sizing)
 */
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

  // Sizing
  const sizing = layout.sizing;
  if (sizing) {
    if (sizing.horizontal === "fill") {
      styles["width"] = "100%";
      styles["flex"] = "1";
    } else if (sizing.horizontal === "hug") {
      styles["width"] = "max-content";
    } else if (layout.dimensions?.width && sizing.horizontal === "fixed") {
      styles["width"] = px(layout.dimensions.width);
    }

    if (sizing.vertical === "fill") {
      styles["height"] = "100%";
      styles["align-self"] = "stretch";
    } else if (sizing.vertical === "hug") {
      styles["height"] = "max-content";
    } else if (layout.dimensions?.height && sizing.vertical === "fixed") {
      styles["height"] = px(layout.dimensions.height);
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

  return styles;
};
