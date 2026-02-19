import { layoutBuilder } from "./layout-builder.js";
import { typographyBuilder } from "./typography-builder.js";
import { visualBuilder } from "./visual-builder.js";
import { hashClassName } from "../../../utils/hash.js";

// 将样式对象解析为可写入 CSS 的 "prop: value;" 字符串
export function formatStyleBody(style: any, stylesMap: Record<string, any> = {}): string {
  if (!style) return "";
  const styles = resolveStyleObject(style, stylesMap, new Set());
  return Object.entries(styles)
    .filter(([_, value]) => value !== undefined && value !== "")
    .map(([prop, value]) => `${prop}: ${value}`)
    .join("; ") + (Object.keys(styles).length > 0 ? ";" : "");
}

// 基于全局样式表生成所有 class 的 CSS 规则
export function generateGlobalCSS(globalVars: Record<string, any>): string {
  const styles = globalVars.styles || {};
  let css = "";

  Object.entries(styles).forEach(([id, styleObj]) => {
    const className = hashClassName(id);
    const body = formatStyleBody(styleObj, styles);
    if (body) css += `.${className} { ${body} }\n`;
  });

  return css;
}

// 构建节点级样式（透明度、圆角、transform）
function nodeStyleBuilder(style: any): Record<string, string> {
  const styles: Record<string, string> = {};
  if (style.opacity !== undefined) {
    styles["opacity"] = typeof style.opacity === "number" ? style.opacity.toFixed(2) : String(style.opacity);
  }
  if (style.borderRadius) {
    styles["border-radius"] = style.borderRadius;
  }
  if (style.transform) {
    styles["transform"] = style.transform;
  }
  return styles;
}

// 构建效果样式（阴影、模糊）
function effectsStyleBuilder(style: any): Record<string, string> {
  const styles: Record<string, string> = {};
  if (style.textShadow) styles["text-shadow"] = style.textShadow;
  if (style.boxShadow) styles["box-shadow"] = style.boxShadow;
  if (style.filter) styles["filter"] = style.filter;
  if (style.backdropFilter) styles["backdrop-filter"] = style.backdropFilter;
  return styles;
}

const styleHandlers: Array<{
  match: (style: any) => boolean;
  build: (style: any) => Record<string, string>;
}> = [
  { match: (style) => style && "mode" in style, build: layoutBuilder },
  {
    match: (style) =>
      style &&
      ("fontFamily" in style ||
        "fontSize" in style ||
        "fontWeight" in style ||
        "lineHeight" in style ||
        "letterSpacing" in style),
    build: typographyBuilder,
  },
  { match: (style) => Array.isArray(style), build: visualBuilder.fills },
  { match: (style) => style && "colors" in style && "strokeWeight" in style, build: visualBuilder.strokes },
  {
    match: (style) => style && ("opacity" in style || "borderRadius" in style || "transform" in style),
    build: nodeStyleBuilder,
  },
  {
    match: (style) => style && ("textShadow" in style || "boxShadow" in style || "filter" in style || "backdropFilter" in style),
    build: effectsStyleBuilder,
  },
  {
    match: (style) => {
      if (!style) return false;
      const arr = Array.isArray(style) ? style : [style];
      return arr.length > 0 && (arr[0]?.type?.includes("SHADOW") || arr[0]?.type?.includes("BLUR"));
    },
    build: visualBuilder.effects,
  },
];

// 递归解析样式对象与引用，输出最终 CSS 属性字典
export function resolveStyleObject(
  style: any,
  stylesMap: Record<string, any>,
  seen: Set<string>
): Record<string, string> {
  if (!style) return {};
  if (style.refs && Array.isArray(style.refs)) {
    return style.refs.reduce((acc: Record<string, string>, ref: string) => {
      if (seen.has(ref)) return acc;
      seen.add(ref);
      const child = stylesMap[ref];
      const childStyles = resolveStyleObject(child, stylesMap, seen);
      return { ...acc, ...childStyles };
    }, {});
  }

  for (const handler of styleHandlers) {
    if (handler.match(style)) return handler.build(style);
  }

  return {};
}
