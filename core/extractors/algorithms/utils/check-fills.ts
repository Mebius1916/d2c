import type { SimplifiedNode, TraversalContext } from "../../../types/extractor-types.js";

// 拿着 styleId 去 globalVars 里找 fills
export function resolveNodeFills(
  node: SimplifiedNode,
  globalVars?: TraversalContext["globalVars"]
): any[] | string | undefined {
  if (Array.isArray(node.fills)) return node.fills;
  const key = node.fills as any;
  const styles = (globalVars as any)?.styles;
  if (typeof key !== "string" || !styles) return node.fills;
  const entry = styles[key];
  return Array.isArray(entry) ? entry : undefined;
}

// 判断 fills 数组是否全透明
export function isTransparentFillArray(fills: any[]): boolean {
  return fills.every((paint) => {
    if (!paint) return true;
    if (paint.visible === false) return true;
    if (typeof paint === "string") {
      const value = paint.trim().toLowerCase();
      if (value === "transparent") return true;
      if (value.startsWith("rgba(")) {
        const parts = value.replace("rgba(", "").replace(")", "").split(",");
        const alpha = Number(parts[3]);
        return !Number.isNaN(alpha) && alpha <= 0;
      }
      return false;
    }
    return (paint.opacity ?? 1) <= 0;
  });
}
