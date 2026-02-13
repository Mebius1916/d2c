import type { SimplifiedNode } from "../types/extractor-types.js";
import type { BoundingBox } from "../types/simplified-types.js";

// 获取节点的几何信息
export function getNodeBoundingBox(node: SimplifiedNode): BoundingBox | null {
  if (node.absRect) {
    return {
      x: node.absRect.x,
      y: node.absRect.y,
      width: node.absRect.width,
      height: node.absRect.height,
    };
  }
  return null;
}

// 计算矩形的面积
export function getRectArea(rect: BoundingBox | undefined | null): number {
  if (!rect) return 0;
  return rect.width * rect.height;
}

// 判断一个矩形是否完全包含在另一个矩形内
export function isRectContained(parent: BoundingBox, child: BoundingBox, epsilon = 1): boolean {
  return (
    child.x >= parent.x - epsilon &&
    child.y >= parent.y - epsilon &&
    child.x + child.width <= parent.x + parent.width + epsilon &&
    child.y + child.height <= parent.y + parent.height + epsilon
  );
}

// AABB 碰撞检测
export function areRectsTouching(a: BoundingBox, b: BoundingBox, gap = 0): boolean {
  return (
    a.x < b.x + b.width + gap &&
    a.x + a.width + gap > b.x &&
    a.y < b.y + b.height + gap &&
    a.y + a.height + gap > b.y
  );
}

// 寻找一个能把所有碎片包裹在内的最小矩形
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

// 四向分割算法
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
