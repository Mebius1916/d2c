import type { SimplifiedNode } from "../../../types/extractor-types.js";

export function buildInlineSvg(node: SimplifiedNode, openTag: string, tagName: string): string {
  if (node.svg) {
    return `${openTag}>${node.svg}</${tagName}>`;
  }
  const compositeSvg = buildCompositeSvg(node);
  if (compositeSvg) {
    return `${openTag}>${compositeSvg}</${tagName}>`;
  }
  return `${openTag}></${tagName}>`;
}

// 构建复合 SVG，将多个 SVG 碎片合并为一个 SVG 字符串
function buildCompositeSvg(node: SimplifiedNode): string | undefined {
  if (!node.children || node.children.length === 0) return undefined;
  const children = node.children.filter((child) => child.svg && child.absRect);
  if (children.length === 0) return undefined;

  const bounds = getCompositeBounds(node, children);
  if (!bounds) return undefined;

  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  if (width <= 0 || height <= 0) return undefined;

  const layers = children
    .map((child) => {
      const rect = child.absRect;
      if (!rect || !child.svg) return "";
      const { inner, viewBox, width: svgWidth, height: svgHeight } = extractSvgContent(child.svg);
      if (!inner) return "";
      const dx = rect.x - bounds.minX;
      const dy = rect.y - bounds.minY;
      const resolvedViewBox =
        viewBox || (svgWidth && svgHeight ? `0 0 ${svgWidth} ${svgHeight}` : `0 0 ${rect.width} ${rect.height}`);
      const viewBoxSize = parseViewBox(resolvedViewBox);
      if (!viewBoxSize) return "";
      const scaleX = rect.width / viewBoxSize.width;
      const scaleY = rect.height / viewBoxSize.height;
      const childSvg = `<svg viewBox="${resolvedViewBox}" width="${viewBoxSize.width}" height="${viewBoxSize.height}">${inner}</svg>`;
      return `<g transform="translate(${dx}, ${dy}) scale(${scaleX}, ${scaleY})">${childSvg}</g>`;
    })
    .filter(Boolean)
    .join("");

  if (!layers) return undefined;

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${layers}</svg>`;
}

// 获取所有碎片的总包围盒
function getCompositeBounds(
  node: SimplifiedNode,
  children: SimplifiedNode[]
): { minX: number; minY: number; maxX: number; maxY: number } | undefined {
  if (node.absRect) {
    const { x, y, width, height } = node.absRect;
    return { minX: x, minY: y, maxX: x + width, maxY: y + height };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  children.forEach((child) => {
    const rect = child.absRect;
    if (!rect) return;
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  });
  if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) return undefined;
  return { minX, minY, maxX, maxY };
}

// 从 SVG 文本中提取内容，用于小图标合并
function extractSvgContent(svgText: string): { inner: string; viewBox?: string; width?: number; height?: number } {
  const openTagMatch = svgText.match(/<svg\b[^>]*>/i);
  const viewBoxMatch = svgText.match(/viewBox="([^"]+)"/i);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : undefined;
  const widthMatch = svgText.match(/width="([^"]+)"/i);
  const heightMatch = svgText.match(/height="([^"]+)"/i);
  const width = widthMatch ? parseSvgNumber(widthMatch[1]) : undefined;
  const height = heightMatch ? parseSvgNumber(heightMatch[1]) : undefined;
  if (!openTagMatch) {
    return { inner: svgText, viewBox, width, height };
  }
  const inner = svgText
    .replace(/^[\s\S]*?<svg\b[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "");
  return { inner, viewBox, width, height };
}

// 解析 SVG 中的数字，支持 px 单位
function parseSvgNumber(value: string): number | undefined {
  const normalized = value.trim().replace(/px$/i, "");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}

// 解析 SVG viewBox 属性，返回 minX, minY, width, height 四元组
function parseViewBox(viewBox: string): { minX: number; minY: number; width: number; height: number } | undefined {
  const parts = viewBox.trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return undefined;
  const [minX, minY, width, height] = parts;
  if (width <= 0 || height <= 0) return undefined;
  return { minX, minY, width, height };
}
