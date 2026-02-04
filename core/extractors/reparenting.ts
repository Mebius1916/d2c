/**
  为每个节点尽可能的找到最小的父节点,判断是否为父节点的条件：
    1. 父节点必须是可包含子节点的矩形区域。
    2. 子节点必须完全包含在父节点内。
    3. 父节点的面积必须大于等于子节点的面积。
  同时需要判断改节点是否是绝对布局（脱离文档流），通过碰撞检测来判断，
  如果 A 和 B 重叠，则贪心判断面积小的为绝对布局节点。

 */
import type { SimplifiedNode } from "./types.js";
import { getRectArea, isRectContained, areRectsTouching } from "../utils/geometry.js";

export function reparentNodes(rootNodes: SimplifiedNode[]): SimplifiedNode[] {
  const flatNodes: SimplifiedNode[] = [];
  
  //  dfs 算法 将树结构拍平
  function flatten(nodes: SimplifiedNode[]) {
    for (const node of nodes) {
      const nodeCopy = { ...node, children: [] };
      flatNodes.push(nodeCopy);
      if (node.children && node.children.length > 0) {
        flatten(node.children);
      }
    }
  }
  flatten(rootNodes);
  
  const roots: SimplifiedNode[] = [];
  // 按面积从小到大排序, 确保子节点能找到父节点
  flatNodes.sort((a, b) => getRectArea(a.absRect) - getRectArea(b.absRect));

  const hasParent = new Set<string>();

  for (let i = 0; i < flatNodes.length; i++) {
    const node = flatNodes[i];
    // 跳过无效节点
    if (!node.absRect || node.absRect.width === 0 || node.absRect.height === 0) {
      roots.push(node); 
      continue;
    }

    let bestParent: SimplifiedNode | null = null;
    let minParentArea = Infinity;
    // 从当前节点后面开始查找父节点(最小父节点原则)
    for (let j = i + 1; j < flatNodes.length; j++) {
      const candidate = flatNodes[j];
  
      if (!candidate.absRect) continue;

      if (!canBeParent(candidate)) continue;
      // 检查是否包含关系
      if (isRectContained(candidate.absRect, node.absRect)) {
        const candidateArea = getRectArea(candidate.absRect);
        if (candidateArea <= getRectArea(node.absRect)) continue;
        
        if (candidateArea < minParentArea) {
          minParentArea = candidateArea;
          bestParent = candidate;
        }
      }
    }

    if (bestParent) {
      if (!bestParent.children) bestParent.children = [];
      bestParent.children.push(node);
      hasParent.add(node.id);
    } else {
      roots.push(node);
    }
  }

  const allContainers = [
    ...roots, 
    ...flatNodes.filter(n => n.children && n.children.length > 0)
  ];
  
  const uniqueContainers = new Set(allContainers);
  
  for (const container of uniqueContainers) {
    if (container.children && container.children.length > 1) {
      detectAbsoluteChildren(container);
    }
  }

  return roots;
}

function detectAbsoluteChildren(container: SimplifiedNode) {
  if (!container.children) return;
  
  const children = container.children;
  
  for (let i = 0; i < children.length; i++) {
    const childA = children[i];
    if (!childA.absRect) continue;
    
    for (let j = 0; j < children.length; j++) {
      if (i === j) continue;
      const childB = children[j];
      if (!childB.absRect) continue;
      
      if (areRectsTouching(childA.absRect, childB.absRect, -1)) { 
          if (getRectArea(childA.absRect) < getRectArea(childB.absRect)) {
            childA.layoutMode = "absolute";
          }
      }
    }
  }
}

function canBeParent(node: SimplifiedNode): boolean {
  const NON_CONTAINERS = new Set(["TEXT", "SVG", "IMAGE", "VECTOR", "ELLIPSE", "RECTANGLE", "LINE", "STAR", "POLYGON"]);
  
  if (NON_CONTAINERS.has(node.type)) return false;
  if (node.semanticTag === "icon") return false;
  
  return true;
}
