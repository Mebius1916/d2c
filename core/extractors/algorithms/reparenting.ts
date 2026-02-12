/**
 * Reparenting Algorithm (Strict Layer-Based Recursive)
 */

import type { SimplifiedNode } from "../../types/extractor-types.js";
import { getRectArea, isRectContained, areRectsTouching } from "../../utils/geometry.js";

export function reparentNodes(rootNodes: SimplifiedNode[]): SimplifiedNode[] {
  // 我们创建一个虚拟根节点来统一处理顶层，简化递归逻辑
  const virtualRoot: SimplifiedNode = {
    id: "virtual-root",
    name: "Root",
    type: "FRAME",
    children: [...rootNodes], // 浅拷贝
    layoutMode: "relative"
  };

  // 开始递归处理
  processContainer(virtualRoot);

  return virtualRoot.children || [];
}

function processContainer(container: SimplifiedNode) {
  if (!container.children || container.children.length === 0) return;

  // 1. 预处理：确保子节点按 Z-Index 从低到高排序 (Bottom -> Top)
  let nodes = [...container.children]; 
  
  // 用于存储处理后的新子节点列表 (未被吃掉的节点)
  const remainingNodes: SimplifiedNode[] = [];
  
  // 2. 核心循环：贪心 "大背景吃小内容"
  while (nodes.length > 0) {
    // 取出当前层级最低的节点 (Candidate Parent, e.g. Card Background)
    const parent = nodes.shift()!;
    
    // 如果它没有资格当爸爸，就直接放进结果里
    if (!canBeParent(parent) || !parent.absRect) {
      remainingNodes.push(parent);
      continue;
    }

    // 尝试在剩余的节点 (层级比它高的，即浮在它上面的) 中寻找孩子
    const childrenToAdopt: SimplifiedNode[] = [];
    const nonChildren: SimplifiedNode[] = [];

    for (const potentialChild of nodes) {
      if (!potentialChild.absRect) {
        nonChildren.push(potentialChild);
        continue;
      }

      if (isRectContained(parent.absRect, potentialChild.absRect) && 
          getRectArea(parent.absRect) >= getRectArea(potentialChild.absRect)) {
        
        // 找到了孩子！
        childrenToAdopt.push(potentialChild);
      } else {
        // 不是孩子，保留在当前层级
        nonChildren.push(potentialChild);
      }
    }

    if (childrenToAdopt.length > 0) {
      if (!parent.children) parent.children = [];
      parent.children.push(...childrenToAdopt);
    }

    // 更新当前层级剩余待处理的节点 (剔除了被吃掉的孩子)
    nodes = nonChildren;
    
    // Parent 处理完毕，放入结果集
    remainingNodes.push(parent);
  }

  // 3. 后处理：绝对定位检测 (仅在当前层级)
  detectAbsoluteChildrenInList(remainingNodes);

  // 4. 恢复顺序并写回
  container.children = remainingNodes;
}

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
    "IMAGE", 
    "VECTOR", 
    "ELLIPSE", 
    "RECTANGLE", 
    "LINE", 
    "STAR", 
    "POLYGON",
    "BOOLEAN_OPERATION"
  ]);
  
  if (NON_CONTAINERS.has(node.type)) return false;
  if (node.semanticTag === "icon") return false;
  
  return true;
}
