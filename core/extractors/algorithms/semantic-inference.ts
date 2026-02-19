import type { SimplifiedNode } from "../../types/extractor-types.js";

export function inferSemanticTags(nodes: SimplifiedNode[]): SimplifiedNode[] {
  return nodes.map(node => inferNode(node));
}

function inferNode(node: SimplifiedNode): SimplifiedNode {
  if (node.children && node.children.length > 0) {
    node.children = node.children.map(child => inferNode(child));
  }

  if (!node.semanticTag) {
    const lowerName = node.name.toLowerCase();
    const tagFromName = inferTagFromName(lowerName, node.type);
    if (tagFromName) {
      node.semanticTag = tagFromName;
    }
  }

  return node;
}

function inferTagFromName(name: string, type: SimplifiedNode["type"]): SimplifiedNode["semanticTag"] | undefined {
  if (type === "TEXT") {
    const headingMatch = name.match(/h([1-6])\b|heading/);
    if (headingMatch) {
      const level = headingMatch[1] || "2";
      return `h${level}` as SimplifiedNode["semanticTag"];
    }
    if (name.match(/para|desc|body/)) return "p";
  }

  if (name.includes("button") || name.includes("btn")) return "button";
  if (name.includes("input")) return "input";
  if (name.includes("section")) return "section";
  if (name.includes("header")) return "header";
  if (name.includes("footer")) return "footer";
  if (name.includes("nav")) return "nav";
  if (name.includes("article")) return "article";
  if (name.includes("aside")) return "aside";
  if (name.includes("main")) return "main";

  return undefined;
}
