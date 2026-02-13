import type { SimplifiedNode } from "../../../types/extractor-types.js";
export function walkTreePostOrder(
  nodes: SimplifiedNode[],
  visitor: (children: SimplifiedNode[]) => SimplifiedNode[]
): SimplifiedNode[] {
  // 1. 递归处理子节点
  nodes.forEach((node) => {
    if (node.children && node.children.length > 0) {
      node.children = walkTreePostOrder(node.children, visitor);
    }
  });

  // 2. 处理当前层
  return visitor(nodes);
}