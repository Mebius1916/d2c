/**
  根据节点与其子节点的类型、语义标签、尺寸、关键样式（颜色、字号、圆角）
  以及递归结构指纹，生成唯一的视觉 Hash，并且做了模糊处理。
 */
import type { SimplifiedNode } from "../extractors/types.js";

export function generateVisualSignature(node: SimplifiedNode): string {
  const parts: string[] = [];

  // 1. Basic Type
  parts.push(node.type);

  // 2. Semantic Tag (if any)
  if (node.semanticTag) {
    parts.push(node.semanticTag);
  }

  // 3. Size (Tiered Quantization)
  // 分段量化
  if (node.absRect) {
    const w = quantizeSize(node.absRect.width);
    const h = quantizeSize(node.absRect.height);
    parts.push(`${w}x${h}`);
  }

  // 4. Critical Styles (simplified)
  
  // Text Styles
  if (node.type === "TEXT" && node.textStyle) {
    parts.push(node.textStyle);
  }

  // Fills (Color)
  if (node.fills) {
    parts.push(hashString(node.fills));
  }

  // Border Radius
  if (node.borderRadius) {
    parts.push(`r:${node.borderRadius}`);
  }

  if (node.children && node.children.length > 0) {
    const childSignatures = node.children.map(c => generateVisualSignature(c));
    parts.push(`[${childSignatures.join(",")}]`);
  }

  return parts.join("|");
}

function hashString(str: string): string {
  let hash = 0;
  if (str.length === 0) return "0";
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

/**
 * 分段量化尺寸 (Tiered Quantization)
 * 工业级 D2C 的最佳实践：避免单一阈值导致的过拟合或欠拟合
 */
function quantizeSize(val: number): number {
  if (val < 50) {
    // 小元素 (Icon, Badge): 高精度，2px 容错
    return Math.round(val / 2) * 2;
  } else if (val < 200) {
    // 中元素 (Button, Avatar): 中等精度，5px 容错
    return Math.round(val / 5) * 5;
  } else {
    // 大元素 (Card, Image): 低精度，10px 容错
    return Math.round(val / 10) * 10;
  }
}
