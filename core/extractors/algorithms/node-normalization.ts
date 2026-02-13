import type { Node as FigmaDocumentNode } from "@figma/rest-api-spec";
import { isIcon } from "../../transformers/icon.js";
import { isImageNode } from "../../transformers/image.js";

export type NormalizedNodeType = 
  | "SVG"         // Vector/Icon
  | "IMAGE"       // Bitmap Image
  | "TEXT"        // Text Block
  | "CONTAINER";  // Frame, Group, Component, etc.

export interface NormalizedNodeResult {
  type: NormalizedNodeType;
  isLeaf: boolean; // If true, we stop recursion (e.g. Icon, Image)
}

/**
 * Analyzes a raw Figma node and determines its semantic role in the D2C system.
 * This maps Figma's 30+ node types into our 4 standard types:
 * - SVG (Icon)
 * - IMAGE (Bitmap)
 * - TEXT
 * - CONTAINER
 */
export function normalizeNodeType(node: FigmaDocumentNode): NormalizedNodeResult {
  // 1. Check for Icon (SVG)
  if (isIcon(node)) {
    return {
      type: "SVG",
      isLeaf: true,
    };
  }

  // 2. Check for Image
  // Images are treated as atomic leaf nodes
  if (isImageNode(node)) {
    return {
      type: "IMAGE",
      isLeaf: true,
    };
  }

  // 3. Check for Text
  if (node.type === "TEXT") {
    return {
      type: "TEXT",
      isLeaf: true,
    };
  }

  // 4. Default to Container
  return {
    type: "CONTAINER",
    isLeaf: false,
  };
}
