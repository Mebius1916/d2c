/**
  通过计算好的 hash 指纹来判断是否是同类型元素，
  如果是同类型元素则将其合并为一个虚拟列表节点
 */
import type { SimplifiedNode } from "./types.js";
import { generateVisualSignature } from "../utils/fingerprint.js";
import { createVirtualFrame } from "../utils/virtual-node.js";

export function inferListPatterns(nodes: SimplifiedNode[]): SimplifiedNode[] {
  if (nodes.length <= 1) return nodes;

  // 1. Compute signatures
  nodes.forEach(node => {
    if (!node.visualSignature) {
      node.visualSignature = generateVisualSignature(node);
    }
  });

  const result: SimplifiedNode[] = [];
  let i = 0;

  while (i < nodes.length) {
    // 尝试寻找最长的重复模式
    // 步长 k 从 1 到 nodes.length / 2
    // 比如 [A, B, A, B]，步长为 2 时，[A,B] == [A,B]
    
    let bestPatternLength = 0;
    let bestPatternCount = 0;

    // 贪心策略：优先匹配更长的模式 (比如 ABC ABC 优于 A A)
    // 限制最大步长为 4 (通常 UI 循环单元不会超过 4 个兄弟节点)
    const maxK = Math.min(4, Math.floor((nodes.length - i) / 2));

    for (let k = 1; k <= maxK; k++) {
      let count = 1;
      // 检查后续是否重复
      let p = i + k;
      while (p + k <= nodes.length) {
        // 比较 [i...i+k] 和 [p...p+k] 是否相等
        if (signaturesMatch(nodes, i, p, k)) {
          count++;
          p += k;
        } else {
          break;
        }
      }

      // 如果发现循环 (count >= 2)，且比之前的模式更优（更长或覆盖更多节点）
      if (count >= 2) {
        // 简单的打分：覆盖的总节点数越多越好
        if (count * k > bestPatternCount * bestPatternLength) {
          bestPatternLength = k;
          bestPatternCount = count;
        }
      }
    }

    if (bestPatternLength > 0) {
      // 找到了循环模式！
      // 模式长度: bestPatternLength (比如 2，即 AB)
      // 循环次数: bestPatternCount (比如 2，即 AB AB)
      
      const loopItems: SimplifiedNode[] = [];
      
      for (let c = 0; c < bestPatternCount; c++) {
        const start = i + c * bestPatternLength;
        const end = start + bestPatternLength;
        const chunk = nodes.slice(start, end);
        
        // 如果模式长度 > 1 (比如 AB)，需要先给这一组打个包 (Group)
        if (bestPatternLength > 1) {
          loopItems.push(createVirtualGroup(chunk));
        } else {
          loopItems.push(chunk[0]);
        }
      }
      
      // 把这些 Item (A, A 或 Group(AB), Group(AB)) 打包成 List
      flushRun(loopItems, result);
      
      // 跳过已处理的节点
      i += bestPatternLength * bestPatternCount;
    } else {
      // 没找到模式，当前节点作为散落节点加入结果
      result.push(nodes[i]);
      i++;
    }
  }

  return result;
}

function signaturesMatch(nodes: SimplifiedNode[], start1: number, start2: number, length: number): boolean {
  for (let j = 0; j < length; j++) {
    if (nodes[start1 + j].visualSignature !== nodes[start2 + j].visualSignature) {
      return false;
    }
  }
  return true;
}

/**
 * 当发现 A B A B 模式时，需要把 A B 打包成一个虚拟 Group
 */
function createVirtualGroup(children: SimplifiedNode[]): SimplifiedNode {
  return createVirtualFrame({
    name: "Item Group",
    type: "FRAME",
    layoutMode: "relative",
    children: children,
    visualSignature: children.map(c => c.visualSignature).join("+")
  });
}

function flushRun(run: SimplifiedNode[], result: SimplifiedNode[]) {
  if (run.length < 2) {
    result.push(...run);
    return;
  }

  const first = run[0];
  const second = run[1];
  // 根据水平和垂直的差值来判断列表排布方向，差值较大的方向即为列表排布方向
  const dy = Math.abs((first.absRect?.y || 0) - (second.absRect?.y || 0));
  const dx = Math.abs((first.absRect?.x || 0) - (second.absRect?.x || 0));
  
  const isVertical = dy > dx;
  
  const listNode = createVirtualList(run, isVertical);
  result.push(listNode);
}

function createVirtualList(children: SimplifiedNode[], isVertical: boolean): SimplifiedNode {
  // Infer item spacing (gap)
  let itemSpacing = 0;
  if (children.length >= 2) {
    const first = children[0];
    const second = children[1];
    if (first.absRect && second.absRect) {
      if (isVertical) {
        itemSpacing = second.absRect.y - (first.absRect.y + first.absRect.height);
      } else {
        itemSpacing = second.absRect.x - (first.absRect.x + first.absRect.width);
      }
      // Clamp to 0
      itemSpacing = Math.max(0, Math.round(itemSpacing));
    }
  }

  return createVirtualFrame({
    name: "List",
    type: "FRAME",
    semanticTag: "list",
    layout: {
      layoutMode: isVertical ? "VERTICAL" : "HORIZONTAL",
      primaryAxisAlignItems: "MIN",
      counterAxisAlignItems: "MIN",
      itemSpacing: itemSpacing,
    },
    children: children,
    visualSignature: children[0].visualSignature
  });
}
