import type { Node as FigmaNode } from "@figma/rest-api-spec";
// 基础图形
const ICON_PRIMITIVE_TYPES: Set<string> = new Set([
  "ELLIPSE",
  "RECTANGLE",
  "STAR",
  "POLYGON",
  "LINE",
]);

// 复杂矢量
const ICON_COMPLEX_VECTOR_TYPES: Set<string> = new Set([
  "VECTOR",
  "BOOLEAN_OPERATION",
]);

// 容器
const ICON_CONTAINER_TYPES: Set<string> = new Set([
  "FRAME",
  "GROUP",
  "COMPONENT",
  "INSTANCE",
]);

// 黑名单
const DISALLOWED_CHILD_TYPES: Set<string> = new Set([
  "FRAME",
  "COMPONENT",
  "INSTANCE",
  "TEXT",
  "SLICE",
  "CONNECTOR",
  "STICKY",
  "SHAPE_WITH_TEXT",
  "CODE_BLOCK",
  "WIDGET",
  "COMPONENT_SET",
]);

export function isIcon(node: FigmaNode): boolean {
  //  导出设置检测
  if ("exportSettings" in node && Array.isArray(node.exportSettings)) {
    if (node.exportSettings.some((setting) => setting.format === "SVG")) {
      return true;
    }
  }

  const isPrimitive = ICON_PRIMITIVE_TYPES.has(node.type);
  const isComplexVector = ICON_COMPLEX_VECTOR_TYPES.has(node.type);
  const isContainer = ICON_CONTAINER_TYPES.has(node.type);

  if (!isPrimitive && !isComplexVector && !isContainer) {
    return false;
  }

  const bbox = "absoluteBoundingBox" in node ? node.absoluteBoundingBox : null;
  const width = bbox?.width ?? 0;
  const height = bbox?.height ?? 0;
  
  if (width === 0 || height === 0) return false; // Invisible or empty

  if (isPrimitive) {
    if (width > 64 || height > 64) return false;
  }
  
  if (isComplexVector) {
    if (width > 120 || height > 120) return false;
  }

  if (isContainer) {
    if (width > 64 || height > 64) return false;
    // 命名检查
    const name = node.name.toLowerCase();
    if (name.includes("icon") || name.startsWith("ic_") || name.includes("svg") || name.includes("logo")) {
      return checkChildrenRecursively(node).isValidIcon;
    }

    // 递归检查子节点
    const checkResult = checkChildrenRecursively(node);
    if (!checkResult.isValidIcon) return false;
    return checkResult.hasVectorContent;
  }

  return true;
}

// 递归检查子节点
function checkChildrenRecursively(node: FigmaNode): { isValidIcon: boolean; hasVectorContent: boolean } {
  // 无子节点，直接返回
  if (!("children" in node) || !Array.isArray(node.children) || node.children.length === 0) {
    return { isValidIcon: true, hasVectorContent: false };
  }

  let hasVectorContent = false;

  for (const child of node.children) {
    if ("visible" in child && child.visible === false) continue;

    if (DISALLOWED_CHILD_TYPES.has(child.type)) {
      if (child.type === "GROUP") {
        const subCheck = checkChildrenRecursively(child);
        if (!subCheck.isValidIcon) return { isValidIcon: false, hasVectorContent: false };
        if (subCheck.hasVectorContent) hasVectorContent = true;
      } else {
        return { isValidIcon: false, hasVectorContent: false };
      }
    } else {
      // 遇到合法的 Vector/Shape
      hasVectorContent = true;
    }
  }

  return { isValidIcon: true, hasVectorContent };
}
