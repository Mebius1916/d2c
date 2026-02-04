/*
  贪吃蛇算法：我们会维护一个遮罩层和一个可见节点数组，如果判断一个节点不透明且不被遮罩层遮挡，
  则将其加入可见节点数组，并且将其几何形状融合进遮罩层。
*/
import type { SimplifiedNode } from "./types.js";
import type { BoundingBox } from "../utils/geometry.js";
// @ts-ignore: martinez-polygon-clipping missing types
import * as martinez from "martinez-polygon-clipping";

type Point = [number, number];
type Polygon = Point[][];
type MultiPolygon = Polygon[];

export function removeOccludedNodes(nodes: SimplifiedNode[]): SimplifiedNode[] {
  if (nodes.length === 0) return [];
  
  const visibleNodes: SimplifiedNode[] = [];
  let occlusionMask: MultiPolygon = [];

  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    
    const rect = getNodeBoundingBox(node);
    if (!rect || rect.width <= 0 || rect.height <= 0) {
      continue;
    }

    const nodePoly = rectToPolygon(rect);

    let isOccluded = false;
    
    if (occlusionMask.length > 0) {
      try {
        // 查看当前节点是否被上层元素完全遮挡
        const visiblePoly = martinez.diff(nodePoly as any, occlusionMask as any) as MultiPolygon;
        if (!visiblePoly || visiblePoly.length === 0 || calculateArea(visiblePoly) < 1) {
          isOccluded = true;
        }
      } catch (e) {
        console.warn("Polygon clipping error", e);
      }
    }

    if (!isOccluded) {
      visibleNodes.unshift(node);
      if (isOpaque(node)) {
        try {
           // 合并当前遮挡 mask 与当前节点的多边形
           const newMask = martinez.union(occlusionMask as any, nodePoly as any) as MultiPolygon;
           if (newMask) {
             occlusionMask = newMask;
           }
        } catch (e) {
          console.warn("Polygon union error", e);
        }
      }
    }
  }

  return visibleNodes;
}

// 提取节点的几何信息
function getNodeBoundingBox(node: SimplifiedNode): BoundingBox | null {
  if (node.absRect) {
    return {
      x: node.absRect.x,
      y: node.absRect.y,
      width: node.absRect.width,
      height: node.absRect.height
    };
  }
  return null;
}

// 构造一个逆时针闭合的坐标环
function rectToPolygon(rect: BoundingBox): Polygon {
  const { x, y, width: w, height: h } = rect;
  return [[
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
    [x, y]
  ]];
}

// 计算多边形面积
function calculateArea(poly: MultiPolygon): number {
  let area = 0;
  const ringArea = (points: Point[]): number => {
    let area = 0;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      area += (points[j][0] + points[i][0]) * (points[j][1] - points[i][1]);
    }
    return area / 2;
  }
  for (const p of poly) {
    if (p.length > 0) {
      area += ringArea(p[0]);
      for (let i = 1; i < p.length; i++) {
        area -= Math.abs(ringArea(p[i]));
      }
    }
  }
  return Math.abs(area);
}

// 判断节点是否不透明
function isOpaque(node: SimplifiedNode): boolean {

  if (node.type === "TEXT") return false;
  if (node.type === "SVG") return false;
  if (node.type === "IMAGE") return true;
  if (node.opacity !== undefined && node.opacity < 1) return false;
  
  return false;
}
