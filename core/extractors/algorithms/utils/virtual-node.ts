import { v4 as uuidv4 } from "uuid";
import type { SimplifiedNode } from "../../../types/extractor-types.js";
import type { BoundingBox } from "../../../types/simplified-types.js";
import { getUnionRect } from "../../../utils/geometry.js";

export interface CreateVirtualFrameOptions {
  name?: string;
  type?: "CONTAINER";
  layoutMode?: "relative" | "absolute";
  layout?: {
    layoutMode: "HORIZONTAL" | "VERTICAL";
    primaryAxisAlignItems?: "MIN" | "MAX" | "CENTER" | "SPACE_BETWEEN";
    counterAxisAlignItems?: "MIN" | "MAX" | "CENTER";
    itemSpacing?: number;
  };
  children: SimplifiedNode[];
  // Additional props
  visualSignature?: string;
}

/**
 * Creates a standardized virtual container (Frame/Group) wrapping the provided children.
 * Automatically calculates the union bounding box.
 */
export function createVirtualFrame(options: CreateVirtualFrameOptions): SimplifiedNode {
  const { 
    name = "Virtual Container", 
    type = "CONTAINER",
    layoutMode = "relative",
    layout,
    children,
    visualSignature 
  } = options;

  const rects = children.map(c => c.absRect).filter((r): r is BoundingBox => !!r);
  const unionRect = getUnionRect(rects);

  const node: SimplifiedNode = {
    id: `virtual-${uuidv4()}`,
    name,
    type,
    layoutMode,
    absRect: unionRect,
    children,
    visualSignature
  };

  if (layout) {
    node.layout = {
      layoutMode: layout.layoutMode,
      primaryAxisAlignItems: layout.primaryAxisAlignItems || "MIN",
      counterAxisAlignItems: layout.counterAxisAlignItems || "MIN",
      itemSpacing: layout.itemSpacing || 0,
    } as any;
  }

  return node;
}
