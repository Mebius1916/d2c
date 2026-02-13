/**
 * Reparenting Algorithm (Strict Layer-Based Recursive)
 */

import type { SimplifiedNode } from "../../types/extractor-types.js";
import { getRectArea, isRectContained, areRectsTouching } from "../../utils/geometry.js";

export function reparentNodes(nodes: SimplifiedNode[]): SimplifiedNode[] {
  if (nodes.length === 0) return [];

  // 1. 预处理：确保节点按 Z-Index 从低到高排序 (Bottom -> Top)
  const processingNodes = [...nodes];
  
  // 用于存储处理后的新子节点列表 (未被吃掉的节点)
  const remainingNodes: SimplifiedNode[] = [];
  
  // 2. 核心循环：贪心 "大背景吃小内容"
  while (processingNodes.length > 0) {
    // 取出当前层级最低的节点 (Candidate Parent, e.g. Card Background)
    const parent = processingNodes.shift()!;
    
    if (!canBeParent(parent) || !parent.absRect) {
      remainingNodes.push(parent);
      continue;
    }

    // 尝试在剩余的节点 (层级比它高的，即浮在它上面的) 中寻找孩子
    const childrenToAdopt: SimplifiedNode[] = [];
    const nonChildren: SimplifiedNode[] = [];

    for (const potentialChild of processingNodes) {
      if (!potentialChild.absRect) {
        nonChildren.push(potentialChild);
        continue;
      }

      if (isRectContained(parent.absRect, potentialChild.absRect) && 
          getRectArea(parent.absRect) >= getRectArea(potentialChild.absRect)) {
        
        childrenToAdopt.push(potentialChild);
      } else {
        nonChildren.push(potentialChild);
      }
    }

    if (childrenToAdopt.length > 0) {
      if (!parent.children) parent.children = [];
      parent.children.push(...childrenToAdopt);
    }

    processingNodes.length = 0;
    processingNodes.push(...nonChildren);
    
    remainingNodes.push(parent);
  }

  detectAbsoluteChildrenInList(remainingNodes);

  return remainingNodes;
}

// AABB 碰撞检测，用于选出绝对定位的节点
function detectAbsoluteChildrenInList(nodes: SimplifiedNode[]) {
  if (nodes.length < 2) return;
  
  for (let i = 0; i < nodes.length; i++) {
    const nodeA = nodes[i];
    if (!nodeA.absRect) continue;
    
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeB = nodes[j];
      if (!nodeB.absRect) continue;
      
      // 只有实质性重叠才算 (gap = -1)
      if (areRectsTouching(nodeA.absRect, nodeB.absRect, -1)) { 
          // 冲突发生！面积小的变成 Absolute
          if (getRectArea(nodeA.absRect) < getRectArea(nodeB.absRect)) {
            nodeA.layoutMode = "absolute";
          } else {
            nodeB.layoutMode = "absolute";
          }
      }
    }
  }
}

function canBeParent(node: SimplifiedNode): boolean {
  const NON_CONTAINERS = new Set([
    "TEXT", 
    "SVG", 
    "IMAGE"
  ]);
  
  if (NON_CONTAINERS.has(node.type)) return false;
  
  return true;
}
