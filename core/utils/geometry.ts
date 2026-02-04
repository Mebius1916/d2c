export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
