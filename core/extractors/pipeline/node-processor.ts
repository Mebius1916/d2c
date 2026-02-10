import type { Node as FigmaDocumentNode } from "@figma/rest-api-spec";
import { hasValue } from "../../utils/identity.js";
import { runReconstructionPipeline } from "./reconstruction.js";
import { normalizeNodeType } from "../algorithms/node-normalization.js";
import { allExtractors } from "../attributes/built-in.js";
import { isNodeEmpty } from "../../utils/node-check.js";
import type {
  TraversalContext,
  SimplifiedNode,
} from "../../types/extractor-types.js";

export function processNodeWithExtractors(
  node: FigmaDocumentNode,
  context: TraversalContext,
): SimplifiedNode | null {
  // 1. Normalize Node Type (Determine Semantic Role)
  const { type: normalizedType, isLeaf } = normalizeNodeType(node);

  if (normalizedType === "NULL") {
    return null;
  }

  // 2. Initialize Simplified Node
  const result: SimplifiedNode = {
    id: node.id,
    name: node.name,
    type:
      normalizedType === "CONTAINER"
        ? node.type === "VECTOR"
          ? "IMAGE-SVG"
          : node.type
        : normalizedType,
  };

  if (normalizedType === "SVG") {
    result.semanticTag = "icon";
  } else if (normalizedType === "IMAGE") {
    result.semanticTag = "image";
  }

  // 3. Apply Extractors (Function Composition)
  // Collect partial results from all extractors and merge them into the result
  const extractedProps = allExtractors.reduce((acc, extractor) => {
    const partial = extractor(node, context);
    return { ...acc, ...partial };
  }, {} as Partial<SimplifiedNode>);

  Object.assign(result, extractedProps);

  // 4. Traverse Children (Only for Containers)
  if (!isLeaf) {
    const childContext: TraversalContext = {
      ...context,
      currentDepth: context.currentDepth + 1,
      parent: node,
    };

    if (hasValue("children", node) && node.children.length > 0) {
      const children = node.children
        .map((child) => processNodeWithExtractors(child, childContext))
        .filter((child): child is SimplifiedNode => child !== null);

      if (children.length > 0) {
        // Apply full reconstruction pipeline to children
        const processedChildren = runReconstructionPipeline(children, context.globalVars);
        if (processedChildren.length > 0) {
          result.children = processedChildren;
        }
      }
    }
  }

  // 5. Early Pruning (Aggressive Pruning)
  if (result.type === "FRAME" || result.type === "GROUP") {
    const hasChildren = result.children && result.children.length > 0;
    
    if (!hasChildren) {
      if (isNodeEmpty(result)) {
        return null;
      }
    }
  }

  return result;
}

