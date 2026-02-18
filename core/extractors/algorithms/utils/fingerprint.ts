import type { SimplifiedNode } from "../../../types/extractor-types.js";
import { quantizeSize } from "./dynamic-threshold.js";

const FNV_OFFSET_BASIS_32 = 2166136261;
const FNV_PRIME_32 = 16777619;
const nodeHashCache = new WeakMap<SimplifiedNode, number>();

// 生成节点可视化签名的主函数
export function generateVisualSignature(node: SimplifiedNode): string {
  let hash = buildNodeHash(node);
  if (node.children && node.children.length > 0) {
    hash = addKeyValue(hash, "children", buildChildrenSignature(node.children));
  }
  return (hash >>> 0).toString(16);
}

// 只计算“节点自身属性”的哈希指纹
function buildNodeHash(node: SimplifiedNode): number {
  const cached = nodeHashCache.get(node);
  if (cached !== undefined) return cached;
  let hash = FNV_OFFSET_BASIS_32;
  hash = addKeyValue(hash, "type", node.type);
  for (const [key, value] of buildTypeSignatureParts(node)) {
    hash = addKeyValue(hash, key, value);
  }
  nodeHashCache.set(node, hash);
  return hash;
}

// 聚合直接子节点的哈希指纹
function buildChildrenSignature(children: SimplifiedNode[]): string {
  const signatures = children.map((child) =>
    (buildNodeHash(child) >>> 0).toString(16),
  );
  signatures.sort();
  return `${children.length}:${signatures.join("|")}`;
}

// 构建尺寸与宽高比的指纹片段
function buildSizeParts(node: SimplifiedNode): Array<[string, string]> {
  const width = node.absRect?.width ?? 0;
  const height = node.absRect?.height ?? 0;
  const qWidth = quantizeSize(width);
  const qHeight = quantizeSize(height);
  const ratio = height > 0 ? Math.round((width / height) * 100) / 100 : 0;

  return [
    ["w", String(qWidth)],
    ["h", String(qHeight)],
    ["ar", String(ratio)],
  ];
}

// 规范化圆角并输出用于指纹的稳定片段
function buildRadiusSignature(borderRadius?: string): string {
  if (!borderRadius) return "0";

  const matches = borderRadius.match(/-?\d+(\.\d+)?/g);
  if (!matches || matches.length === 0) return "0";

  const normalized = matches.map((val) => {
    const num = Number(val);
    if (Number.isNaN(num)) return "0";
    return String(quantizeSize(num));
  });

  return normalized.join("_");
}

// 对复杂对象做稳定序列化，保证 key 顺序与数值精度一致
function stableStringify(value: any): string {
  if (value === null || value === undefined) return "na";
  if (typeof value === "number") return String(Math.round(value * 100) / 100);
  if (typeof value === "string") return value.trim();
  if (typeof value === "boolean") return value ? "1" : "0";
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    const pairs = keys.map((key) => `${key}:${stableStringify(value[key])}`);
    return `{${pairs.join(",")}}`;
  }
  return String(value);
}

// 统一规范化数值或样式值，确保不同来源序列化结果稳定
function normalizeValue(value: any, mode: "size" | "style"): string {
  if (value === undefined || value === null) return "na";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") {
    if (mode === "size") return String(quantizeSize(value));
    return String(Math.round(value * 100) / 100);
  }
  return stableStringify(value);
}

// 构建文字相关的指纹片段（字体、字号、字重、颜色）
function buildTextSignature(node: SimplifiedNode): Array<[string, string]> {
  if (node.textStyle && typeof node.textStyle === "object") {
    const style = node.textStyle as any;
    const fontFamily = normalizeValue(style.fontFamily, "style");
    const fontSize = normalizeValue(style.fontSize, "size");
    const fontWeight = normalizeValue(style.fontWeight, "size");
    const color = normalizeValue(style.color || node.fills, "style");

    return [
      ["font", fontFamily],
      ["size", fontSize],
      ["weight", fontWeight],
      ["color", color],
    ];
  }

  const styleKey = normalizeValue(node.textStyle, "style");
  const colorKey = normalizeValue(node.fills, "style");
  return [
    ["style", styleKey],
    ["color", colorKey],
  ];
}

// 按节点类型构建对应的指纹片段
function buildTypeSignatureParts(node: SimplifiedNode): Array<[string, string]> {
  if (node.type === "TEXT") {
    return buildTextSignature(node);
  }

  if (node.type === "SVG") {
    return [
      ...buildSizeParts(node),
      ["fill", normalizeValue(node.fills || node.strokes, "style")],
    ];
  }

  if (node.type === "CONTAINER" || node.type === "IMAGE") {
    return [
      ...buildSizeParts(node),
      ["radius", buildRadiusSignature(node.borderRadius)],
    ];
  }

  return buildSizeParts(node);
}

// 将 key/value 以固定分隔注入到哈希中
function addKeyValue(hash: number, key: string, value: string): number {
  let next = hash;
  next = updateHash(next, key);
  next = updateHash(next, ":");
  next = updateHash(next, value);
  next = updateHash(next, "|");
  return next;
}

// 以 FNV-1a 规则更新哈希值
function updateHash(hash: number, input: string): number {
  let next = hash;
  for (let i = 0; i < input.length; i++) {
    next ^= input.charCodeAt(i);
    next = Math.imul(next, FNV_PRIME_32);
  }
  return next;
}
