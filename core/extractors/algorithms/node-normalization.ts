import type { Node as FigmaDocumentNode } from "@figma/rest-api-spec";
import { isIcon } from "../../transformers/icon.js";
import { isImageNode } from "../../transformers/image.js";
import { isVisible } from "../../utils/common.js";

export type NormalizedNodeType = 
  | "SVG"         // Vector/Icon
  | "IMAGE"       // Bitmap Image
  | "TEXT"        // Text Block
  | "CONTAINER"   // Frame, Group, Component, etc.
  | "NULL";       // Skipped Node (Invisible, etc.)

export interface NormalizedNodeResult {
  type: NormalizedNodeType;
  originalType: string;
  isLeaf: boolean; // If true, we stop recursion (e.g. Icon, Image)
}

/**
 * Analyzes a raw Figma node and determines its semantic role in the D2C system.
 * This maps Figma's 30+ node types into our 4 standard types:
 * - SVG (Icon)
 * - IMAGE (Bitmap)
 * - TEXT
 * - CONTAINER
 * 
 * It also filters out invisible nodes by returning type: "NULL".
 */
export function normalizeNodeType(node: FigmaDocumentNode): NormalizedNodeResult {
  // 0. Pre-check: Visibility
  if (!isVisible(node)) {
    return {
      type: "NULL",
      originalType: node.type,
      isLeaf: true,
    };
  }

  // 1. Check for Icon (SVG)
  if (isIcon(node)) {
    return {
      type: "SVG",
      originalType: node.type,
      isLeaf: true,
    };
  }

  // 2. Check for Image
  // Images are treated as atomic leaf nodes
  if (isImageNode(node)) {
    return {
      type: "IMAGE",
      originalType: node.type,
      isLeaf: true,
    };
  }

  // 3. Check for Text
  if (node.type === "TEXT") {
    return {
      type: "TEXT",
      originalType: node.type,
      isLeaf: true,
    };
  }

  // 4. Default to Container
  return {
    type: "CONTAINER",
    originalType: node.type,
    isLeaf: false,
  };
}
