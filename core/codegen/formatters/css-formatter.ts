
import { layoutBuilder } from "./builders/layout-builder.js";
import { typographyBuilder } from "./builders/typography-builder.js";
import { visualBuilder } from "./builders/visual-builder.js";


export function formatStyleBody(style: any): string {
  if (!style) return "";
  let styles: Record<string, string> = {};

  // Dispatch to builders
  if ("mode" in style) styles = layoutBuilder(style);
  else if ("fontFamily" in style) styles = typographyBuilder(style);
  else if (Array.isArray(style)) styles = visualBuilder.fills(style);
  else if ("colors" in style && "strokeWeight" in style) styles = visualBuilder.strokes(style);
  else if ("type" in style || (Array.isArray(style) && style[0]?.type)) {
      const arr = Array.isArray(style) ? style : [style];
      if (arr.length > 0 && (arr[0].type.includes("SHADOW") || arr[0].type.includes("BLUR"))) {
          styles = visualBuilder.effects(style);
      }
  }

  // Convert object to CSS string
  return Object.entries(styles)
    .filter(([_, value]) => value !== undefined && value !== "")
    .map(([prop, value]) => `${prop}: ${value}`)
    .join("; ") + (Object.keys(styles).length > 0 ? ";" : "");
}

export function generateGlobalCSS(globalVars: Record<string, any>): string {
  const styles = globalVars.styles || {};
  let css = "";

  Object.entries(styles).forEach(([id, styleObj]) => {
    const className = id.replace(/[^a-zA-Z0-9-_]/g, "_");
    const body = formatStyleBody(styleObj);
    if (body) css += `.${className} { ${body} }\n`;
  });

  return css;
}
