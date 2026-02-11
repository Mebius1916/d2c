
import type { SimplifiedDesign, SimplifiedNode } from "../../types/extractor-types.js";
import { generateGlobalCSS } from "../formatters/css-formatter.js";
import { HtmlNodeBuilder } from "./html/html-node-builder.js";

/**
 * Enhanced HTML Generator
 * Orchestrates the generation of HTML using HtmlNodeBuilder and modular CSS generation.
 */

export function generateHTML(design: SimplifiedDesign): string {
  const css = generateGlobalCSS(design.globalVars);
  const bodyContent = design.nodes.map(node => generateNodeRecursive(node)).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${design.name}</title>
    <style>
        body { margin: 0; padding: 0; font-family: sans-serif; -webkit-font-smoothing: antialiased; }
        * { box-sizing: border-box; }
        /* Reset */
        button { border: none; background: none; padding: 0; cursor: pointer; }
        h1, h2, h3, h4, h5, h6, p { margin: 0; }
        /* Global Styles */
        ${css}
    </style>
</head>
<body>
    ${bodyContent}
</body>
</html>`;
}

function generateNodeRecursive(node: SimplifiedNode): string {
  const builder = new HtmlNodeBuilder(node);

  if (node.type === "TEXT") {
    builder.setContent(escapeHTML(node.text || ""));
  } else if (node.children && node.children.length > 0) {
    node.children.forEach(child => {
      builder.addChild(generateNodeRecursive(child));
    });
  }

  return builder.toString();
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
