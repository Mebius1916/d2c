import type { SimplifiedNode } from "../../../types/extractor-types.js";

export function buildInlineSvg(node: SimplifiedNode, openTag: string, tagName: string): string {
  const bounds = collectVectorBounds(node); 
  const baseX = bounds?.minX ?? node.absRect?.x ?? 0;
  const baseY = bounds?.minY ?? node.absRect?.y ?? 0;
  const paths = collectVectorPaths(node, baseX, baseY);
  let pathContent = "";

  if (paths.length > 0) {
    // 把所有路径对象转成 SVG 的 <path> 标签字符串
    pathContent = paths.map(p => {
      const transformAttr = p.transform ? ` transform="${p.transform}"` : "";
      const fillAttr = p.fill ? ` fill="${p.fill}"` : ` fill="currentColor"`;
      return `<path d="${p.d}"${fillAttr}${transformAttr} />`;
    }).join("\n          ");
  }

  const width = bounds ? Math.max(bounds.maxX - bounds.minX, 1) : (node.absRect?.width || 24);
  const height = bounds ? Math.max(bounds.maxY - bounds.minY, 1) : (node.absRect?.height || 24);

  return `${openTag}>
        <!-- SVG: ${node.name} -->
        <svg viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          ${pathContent}
        </svg>
      </${tagName}>`;
}

function collectVectorPaths(
  node: SimplifiedNode,
  rootX: number,
  rootY: number
): { d: string; fill?: string; transform?: string }[] {
  const results: { d: string; fill?: string; transform?: string }[] = [];
  const baseX = rootX;
  const baseY = rootY;

  const currentX = node.absRect?.x || 0;
  const currentY = node.absRect?.y || 0;
  // 计算当前节点的相对位置
  const relativeX = parseFloat((currentX - baseX).toFixed(2));
  const relativeY = parseFloat((currentY - baseY).toFixed(2));

  if (node.vectorPaths && node.vectorPaths.length > 0) {
    const transform = (relativeX !== 0 || relativeY !== 0) ? `translate(${relativeX}, ${relativeY})` : undefined;
    node.vectorPaths.forEach(d => {
      results.push({ d, transform });
    });
  }

  if (node.children && node.children.length > 0) {
    node.children.forEach(child => {
      results.push(...collectVectorPaths(child, baseX, baseY));
    });
  }

  return results;
}

// 计算整个 SVG 的包围盒
function collectVectorBounds(node: SimplifiedNode): { minX: number; minY: number; maxX: number; maxY: number } | undefined {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let found = false;

  const visit = (current: SimplifiedNode) => {
    if (current.vectorPaths && current.vectorPaths.length > 0 && current.absRect) {
      const { x, y, width, height } = current.absRect;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
      found = true;
    }
    if (current.children && current.children.length > 0) {
      current.children.forEach(child => visit(child));
    }
  };

  visit(node);
  if (!found) return undefined;
  return { minX, minY, maxX, maxY };
}
