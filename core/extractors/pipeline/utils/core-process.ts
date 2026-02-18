import type { Node as FigmaDocumentNode } from "@figma/rest-api-spec";
import { hasValue } from "../../../utils/identity.js";
import { normalizeNodeType } from "../../algorithms/node-normalization.js";
import { allExtractors } from "../../attributes/built-in.js";
import { shouldPruneNode } from "../../../utils/node-check.js";
import { isVisible } from "../../../utils/common.js";

import type {
  TraversalContext,
  SimplifiedNode,
} from "../../../types/extractor-types.js";

export function processNodes(
  nodes: FigmaDocumentNode[],
  context: TraversalContext,
  postProcessor?: (nodes: SimplifiedNode[]) => SimplifiedNode[]
): SimplifiedNode[] {
  const results: SimplifiedNode[] = [];

  for (const node of nodes) {
    // 0. Pruning Phase (Early Exit for Empty/Invisible Nodes)
    if (!isVisible(node)) {
      continue;
    }

    // 1. Apply Extractors (Function Composition)
    const extractedProps = allExtractors.reduce((acc, extractor) => {
      const partial = extractor(node, context);
      return { ...acc, ...partial };
    }, {} as Partial<SimplifiedNode>);

    // 2. Normalize Node Type (Determine Semantic Role)
    const { type: normalizedType, isLeaf } = normalizeNodeType(node);

    // 3. Initialize Simplified Node
    const result: SimplifiedNode = {
      id: node.id,
      name: node.name,
      type: normalizedType as SimplifiedNode["type"],
      ...extractedProps,
    };

    // 4. Traverse Children (Recursive Step)
    if (!isLeaf) {
      const childContext: TraversalContext = {
        ...context,
        currentDepth: context.currentDepth + 1,
        parent: node,
      };

      if (hasValue("children", node) && node.children.length > 0) {
        const children = processNodes(node.children, childContext, postProcessor);
        // 5. Post-Process Children (Optional)
        const processedChildren = postProcessor ? postProcessor(children) : children;
        // 剪枝：移除空容器
        const prunedChildren = processedChildren.filter((child) => {
          if (child.type === "CONTAINER") {
            return !shouldPruneNode(child);
          }
          return true;
        });

        if (prunedChildren.length > 0) {
          result.children = prunedChildren;
        }
      }
    }

    // 5. Early Pruning (Aggressive Pruning)
    if (result.type === "CONTAINER") {
      if (shouldPruneNode(result)) {
        continue;
      }
    }

    results.push(result);
  }

  return results;
}
