import type { BoundingBox } from "../types/simplified-types.js";

export type { BoundingBox };

/**
 * Calculates the area of a bounding box.
 */
export function getRectArea(rect: BoundingBox | undefined | null): number {
  if (!rect) return 0;
  return rect.width * rect.height;
}

/**
 * Checks if rect 'parent' fully contains rect 'child'.
 * @param epsilon Tolerance for floating point errors or small misalignments (default: 1px)
 */
export function isRectContained(parent: BoundingBox, child: BoundingBox, epsilon = 1): boolean {
  return (
    child.x >= parent.x - epsilon &&
    child.y >= parent.y - epsilon &&
    child.x + child.width <= parent.x + parent.width + epsilon &&
    child.y + child.height <= parent.y + parent.height + epsilon
  );
}

/**
 * Checks if two rects are touching or overlapping within a specified gap.
 * @param gap Max distance to consider touching (default: 0)
 */
export function areRectsTouching(a: BoundingBox, b: BoundingBox, gap = 0): boolean {
  return (
    a.x < b.x + b.width + gap &&
    a.x + a.width + gap > b.x &&
    a.y < b.y + b.height + gap &&
    a.y + a.height + gap > b.y
  );
}

/**
 * Calculates the union bounding box of multiple rects.
 */
export function getUnionRect(rects: BoundingBox[]): BoundingBox {
  if (rects.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const rect of rects) {
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Subtracts rect B from rect A, returning a list of remaining rects.
 * This is used for precise occlusion culling.
 * The result is a set of non-overlapping rects that cover the area of (A - B).
 */
export function subtractRect(subject: BoundingBox, clipper: BoundingBox): BoundingBox[] {
  // 1. If no intersection, return original subject
  if (!areRectsTouching(subject, clipper)) {
    return [subject];
  }

  // 2. If clipper fully contains subject, return empty
  // 先查看是否完全遮挡
  if (isRectContained(clipper, subject)) {
    return [];
  }

  // 3. Calculate intersection
  const x1 = Math.max(subject.x, clipper.x);
  const y1 = Math.max(subject.y, clipper.y);
  const x2 = Math.min(subject.x + subject.width, clipper.x + clipper.width);
  const y2 = Math.min(subject.y + subject.height, clipper.y + clipper.height);

  const result: BoundingBox[] = [];

  // 4. Split subject into up to 4 rects around the intersection
  // Top
  if (subject.y < y1) {
    result.push({
      x: subject.x,
      y: subject.y,
      width: subject.width,
      height: y1 - subject.y,
    });
  }
  // Bottom
  if (subject.y + subject.height > y2) {
    result.push({
      x: subject.x,
      y: y2,
      width: subject.width,
      height: (subject.y + subject.height) - y2,
    });
  }
  // Left (bounded by y1 and y2 vertically)
  if (subject.x < x1) {
    result.push({
      x: subject.x,
      y: y1,
      width: x1 - subject.x,
      height: y2 - y1,
    });
  }
  // Right (bounded by y1 and y2 vertically)
  if (subject.x + subject.width > x2) {
    result.push({
      x: x2,
      y: y1,
      width: (subject.x + subject.width) - x2,
      height: y2 - y1,
    });
  }

  return result;
}
