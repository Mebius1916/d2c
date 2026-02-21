
import type { SimplifiedNode } from "../../../types/extractor-types.js";
import { buildInlineSvg } from "../utils/svg.js";
import { hashClassName } from "../../../utils/hash.js";
import { getTextSegmentStyleId } from "../../css/utils/text-style.js";


/**
 * HtmlNodeBuilder class responsible for constructing HTML for a single node.
 * Handles semantic tag inference, attribute processing, and style generation.
 */
export class HtmlNodeBuilder {
  private node: SimplifiedNode;
  private globalVars?: { styles: Record<string, any>; styleCache?: Map<string, string> };
  private tagName: string = "div";
  private attributes: Record<string, string> = {};
  private classes: string[] = [];
  private children: string[] = [];
  private isSelfClosing: boolean = false;
  constructor(
    node: SimplifiedNode,
    globalVars?: { styles: Record<string, any>; styleCache?: Map<string, string> }
  ) {
    this.node = node;
    this.globalVars = globalVars;
    this.inferSemanticTag();
    this.processAttributes();
    this.processStyles();
  }

  // 1. Semantic Tag Inference
  private inferSemanticTag() {
    const { type, semanticTag } = this.node;

    // Priority 1: Explicit Semantic Tag (from Extractor)
    if (semanticTag) {
      if (semanticTag === "icon") this.tagName = "div";
      else if (semanticTag === "list") this.tagName = "div";
      else if (semanticTag === "group") this.tagName = "div";
      else this.tagName = semanticTag;
      return;
    }

    // Priority 2: Type-based
    if (type === "TEXT") {
      this.tagName = "p";
      return;
    }

    if (type === "IMAGE") {
      this.tagName = this.node.src ? "img" : "div";
      return;
    }

  }

  // 2. Attribute Processing
  private processAttributes() {
    this.attributes["data-id"] = this.node.id;
    
    if (this.tagName === "button") {
      this.attributes["type"] = "button";
    }
    
    // Input handling
    if (this.tagName === "input") {
      this.isSelfClosing = true;
      this.attributes["type"] = "text";
    }

    if (this.tagName === "img") {
      this.isSelfClosing = true;
      if (this.node.src) this.attributes["src"] = this.node.src;
    }

    if (this.node.semanticTag === "list" || 
        this.node.semanticTag === "group" || 
        this.node.semanticTag === "icon") {
      this.attributes["data-semantic"] = this.node.semanticTag;
    }
  }

  // 3. Style & Class Processing
  private processStyles() {
    const { node } = this;

    // Collect Classes (from Global CSS)
    const addClass = (id: string | undefined) => {
      if (id) this.classes.push(hashClassName(id));
    };
    if (node.styles) {
      addClass(node.styles);
    } else {
      if (typeof node.layout === "string") addClass(node.layout);
      addClass(node.fills);
      addClass(node.textStyle);
      addClass(node.strokes);
      if (Array.isArray(node.effects)) node.effects.forEach(e => addClass(e));
      else addClass(node.effects);
    }    
  }

  public addChild(html: string) {
    this.children.push(html);
  }

  public toString(): string {
    const classAttrName = "class";
    const classAttr = this.classes.length ? `${classAttrName}="${this.classes.join(" ")}"` : "";
    // 将 html 属性对象转化为 key="value" 序列
    const attrs = Object.entries(this.attributes)
      .map(([k, v]) => `${k}="${v}"`)
      .join(" ");

    // 拼接为 html 标签
    const openTag = `<${this.tagName} ${classAttr} ${attrs}`.replace(/\s+/g, " ").trim();

    // 是否自闭合
    if (this.isSelfClosing) {
      return `${openTag} />`;
    }

    // 直接返回内联 SVG
    if (this.node.type === "SVG" || this.node.semanticTag === "icon") {
      return buildInlineSvg(this.node, openTag, this.tagName);
    }

    // 富文本拼接
    let innerHTML = "";
    if (this.node.type === "TEXT" && Array.isArray(this.node.richText)) {
      innerHTML = this.node.richText.map((segment: any) => {
        const tagName = resolveRichTextTag(segment.style); // 判断富文本标签
        const segmentText = escapeHTML(segment.text).split("\n").join("<br/>"); // 转译 html 标签
        const segmentStyleId = getTextSegmentStyleId(segment.style, this.node, this.globalVars, segment.effects); // 获取文本样式 id
        const className = segmentStyleId ? hashClassName(segmentStyleId) : "";
        const segmentClassAttr = className ? ` class="${className}"` : "";
        return `<${tagName}${segmentClassAttr}>${segmentText}</${tagName}>`;
      }).join("");
    }
    
    if (!innerHTML) {
      innerHTML = this.children.length ? "\n" + this.children.join("\n") + "\n" : "";
    }
    
    return `${openTag}>${innerHTML}</${this.tagName}>`;
  }

}

// html标签转译
function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/\n/g, "<br>");
}

// 判断富文本标签
function resolveRichTextTag(style: any): string {
  const features = style?.openTypeFeatures;
  if (features?.SUBS) return "sub";
  if (features?.SUPS) return "sup";
  return "span";
}
