import type { Node as FigmaNode } from "@figma/rest-api-spec";

export function isImageNode(node: FigmaNode): boolean {
  // 1. 自身包含图片填充
  if (hasImageFills(node)) {
    return true;
  }

  // 2. 遮罩组检测 (Mask Group)
  // 逻辑: 如果是容器，包含 Mask 节点，且不包含可编辑文本（避免误伤UI内容），则视为完整图片
  if (isMaskGroup(node) && !hasTextChild(node)) {
    return true;
  }

  // 3. 导出设置检测
  if ("exportSettings" in node && Array.isArray(node.exportSettings)) {
    if (node.exportSettings.some((setting) => ["PNG", "JPG"].includes(setting.format))) {
      if (!hasTextChild(node)) {
        return true;
      }
    }
  }

  // 4. 命名检测
  const name = node.name.toLowerCase();
  if (name.startsWith("bitmap") || name.startsWith("image") || name.startsWith("img_")) {
    return !hasTextChild(node);
  }
  return false;
}

// 检查是否为遮罩组
function isMaskGroup(node: FigmaNode): boolean {
  const containerTypes = ["FRAME", "GROUP", "COMPONENT", "INSTANCE"];
  if (!containerTypes.includes(node.type)) return false;

  if ("children" in node && Array.isArray(node.children)) {
    // 检查是否有子节点开启了 isMask
    // 注意: Figma API 中 isMask 属性可能在任何图层上
    return node.children.some((child: any) => child.isMask === true);
  }
  return false;
}

// 检查自身是否有图片填充
function hasImageFills(node: FigmaNode): boolean {
  if ("fills" in node && Array.isArray(node.fills)) {
    return node.fills.some((paint) => paint.type === "IMAGE");
  }
  return false;
}

// 查看节点是否有 text 节点
function hasTextChild(node: FigmaNode): boolean {
  if (node.type === "TEXT") return true;

  if ("children" in node && Array.isArray(node.children)) {
    return node.children.some((child) => hasTextChild(child));
  }

  return false;
}
