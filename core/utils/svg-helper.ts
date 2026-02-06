import type { SimplifiedNode } from "../extractors/types.js";
import type { Node as FigmaDocumentNode } from "@figma/rest-api-spec";

/**
 * Node types that can be exported as SVG images.
 * When a FRAME, GROUP, or INSTANCE contains only these types, we can collapse it to IMAGE-SVG.
 * Note: FRAME/GROUP/INSTANCE are NOT included here—they're only eligible if collapsed to IMAGE-SVG.
 */
export const SVG_ELIGIBLE_TYPES = new Set([
  "IMAGE-SVG", // VECTOR nodes are converted to IMAGE-SVG, or containers that were collapsed
  "STAR",
  "LINE",
  "ELLIPSE",
  "REGULAR_POLYGON",
  "RECTANGLE",
]);

/**
 * afterChildren callback that collapses SVG-heavy containers to IMAGE-SVG.
 *
 * If a FRAME, GROUP, or INSTANCE contains only SVG-eligible children, the parent
 * is marked as IMAGE-SVG and children are omitted, reducing payload size.
 *
 * @param node - Original Figma node
 * @param result - SimplifiedNode being built
 * @param children - Processed children
 * @returns Children to include (empty array if collapsed)
 */
export function collapseSvgContainers(
  node: FigmaDocumentNode,
  result: SimplifiedNode,
  children: SimplifiedNode[],
): SimplifiedNode[] {
  const allChildrenAreSvgEligible = children.every((child) =>
    SVG_ELIGIBLE_TYPES.has(child.type),
  );

  if (
    (node.type === "FRAME" || node.type === "GROUP" || node.type === "INSTANCE") &&
    allChildrenAreSvgEligible
  ) {
    // Collapse to IMAGE-SVG and omit children
    result.type = "IMAGE-SVG";
    return [];
  }

  // Include all children normally
  return children;
}
