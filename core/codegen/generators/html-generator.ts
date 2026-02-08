import type { SimplifiedDesign, SimplifiedNode } from "../../extractors/types.js";
import { generateGlobalCSS } from "../formatters/css-formatter.js";

/**
 * Generate a complete HTML file from SimplifiedDesign
 */
export function generateHTML(design: SimplifiedDesign): string {
  const css = generateGlobalCSS(design.globalVars);
  
  const bodyContent = design.nodes.map(node => generateNode(node)).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${design.name}</title>
    <style>
        body { margin: 0; padding: 0; font-family: sans-serif; }
        * { box-sizing: border-box; }
        
        /* Global Styles */
        ${css}
    </style>
</head>
<body>
    ${bodyContent}
</body>
</html>`;
}

/**
 * Recursive function to generate HTML string for a node
 */
function generateNode(node: SimplifiedNode): string {
  // 1. Determine tag name based on semantics or type
  const tagName = getTagName(node);
  
  // 2. Build class list
  const classes: string[] = [];
  if (node.layout) classes.push(sanitizeId(node.layout as string));
  if (node.fills) classes.push(sanitizeId(node.fills as string));
  if (node.textStyle) classes.push(sanitizeId(node.textStyle as string));
  if (node.strokes) classes.push(sanitizeId(node.strokes as string));
  if (node.effects) {
      if (Array.isArray(node.effects)) {
          node.effects.forEach(e => classes.push(sanitizeId(e as string)));
      } else {
          classes.push(sanitizeId(node.effects as string));
      }
  }

  // 3. Build inline styles (for absolute positioning override)
  let inlineStyle = "";
  if (node.absRect && !node.layout) { // Only use absRect if no layout engine is controlling it (or if parent is absolute)
      // Actually, in our model, if 'layout' prop exists, it might be AutoLayout. 
      // But we need to check parent context for absolute positioning.
      // For simplicity in this v0, let's just dump inline styles if it looks like absolute.
      // But better rely on CSS classes generated from 'layout'.
  }

  const classAttr = classes.length > 0 ? `class="${classes.join(" ")}"` : "";
  const styleAttr = inlineStyle ? `style="${inlineStyle}"` : "";

  // 4. Generate content
  let content = "";
  if (node.type === "TEXT") {
    content = escapeHTML(node.text || "");
  } else if (node.children) {
    content = node.children.map(child => generateNode(child)).join("\n");
  }

  // 5. Return HTML
  return `<${tagName} ${classAttr} ${styleAttr}>${content}</${tagName}>`;
}

function getTagName(node: SimplifiedNode): string {
  if (node.semanticTag === "list") return "ul";
  if (node.semanticTag === "list-item") return "li";
  if (node.semanticTag === "button") return "button";
  if (node.type === "TEXT") {
      // Simple heuristic for headings
      if (node.name.toLowerCase().includes("heading")) return "h2";
      return "div"; // span might break block layout, use div for safety or p
  }
  if (node.type === "IMAGE") return "div"; // We use background-image for now in CSS
  return "div";
}

function sanitizeId(id: string): string {
    if (!id || typeof id !== 'string') return "";
    return id.replace(/[^a-zA-Z0-9-_]/g, '_');
}

function escapeHTML(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/\n/g, "<br>");
}
