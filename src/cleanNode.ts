import { figmaRGBToHex } from '@figma-plugin/helpers';

export interface CleanLayer {
  id: string;
  name: string;
  type: string;
  box: { x: number; y: number; w: number; h: number };
  style?: Record<string, any>;
  children?: CleanLayer[];
  text?: string;
}

// 检查是否为无视觉样式的容器（需要解包）
function isTransparentContainer(node: SceneNode): boolean {
  if (node.type === 'GROUP') return true;
  if (node.type !== 'FRAME') return false;

  // 检查填充 (Fills)
  if ('fills' in node && Array.isArray(node.fills)) {
    const visibleFills = node.fills.filter(fill => fill.visible !== false);
    if (visibleFills.length > 0) return false;
  }

  // 检查描边 (Strokes)
  if ('strokes' in node && Array.isArray(node.strokes)) {
    const visibleStrokes = node.strokes.filter(stroke => stroke.visible !== false);
    if (visibleStrokes.length > 0) return false;
  }

  // 检查效果 (Effects - 阴影/模糊等)
  if ('effects' in node && Array.isArray(node.effects)) {
    const visibleEffects = node.effects.filter(effect => effect.visible !== false);
    if (visibleEffects.length > 0) return false;
  }

  // 检查圆角 (Corner Radius) - 只有当有背景或边框时圆角才有意义，但为了严谨，有圆角通常意味着它是一个有意义的容器
  if ('cornerRadius' in node && typeof node.cornerRadius === 'number' && node.cornerRadius > 0) {
    return false; // 有圆角，保留容器
  }
  
  // 混合圆角
  if ('topLeftRadius' in node && node.topLeftRadius > 0) return false;
    return true; // 无任何视觉样式，视为纯布局容器
  }

// 检查是否应该视为 SVG/图标
function isIconCandidate(node: SceneNode): boolean {
  const type = node.type;
  if (type === 'VECTOR' || type === 'STAR' || type === 'POLYGON' || type === 'ELLIPSE' || type === 'BOOLEAN_OPERATION') {
    return true;
  }
  
  const name = node.name.toLowerCase();
  if (name.includes('icon') || name.includes('logo') || name.includes('svg') || name.includes('vector')) {
    return true;
  }

  return false;
}

function extractStyles(node: SceneNode): Record<string, any> {
  const style: Record<string, any> = {};

  // 1. 颜色处理 (Fills)
  if ('fills' in node && Array.isArray(node.fills)) {
    const fill = node.fills.find(f => f.type === 'SOLID' && f.visible !== false);
    if (fill && fill.type === 'SOLID') {
      const hex = figmaRGBToHex(fill.color);
      const opacity = fill.opacity !== undefined ? fill.opacity : 1;
      style.backgroundColor = opacity < 1 
        ? hex + Math.round(opacity * 255).toString(16).padStart(2, '0')
        : hex;
    }
  }

  // 2. 文本样式
  if (node.type === 'TEXT') {
    style.fontSize = node.fontSize;
    if (typeof node.fontName !== 'symbol') {
      style.fontFamily = node.fontName.family;
      style.fontWeight = node.fontName.style;
    }
    style.textAlign = node.textAlignHorizontal;
    style.lineHeight = node.lineHeight;
    style.letterSpacing = node.letterSpacing;
    
    // 文本颜色
    if (Array.isArray(node.fills)) {
       const textFill = node.fills.find(f => f.type === 'SOLID' && f.visible !== false);
       if (textFill && textFill.type === 'SOLID') {
         style.color = figmaRGBToHex(textFill.color);
       }
    }
  }

  // 3. 边框 (Strokes)
  if ('strokes' in node && Array.isArray(node.strokes) && node.strokes.length > 0) {
    const stroke = node.strokes.find(s => s.visible !== false);
    if (stroke && stroke.type === 'SOLID') {
       style.borderColor = figmaRGBToHex(stroke.color);
       style.borderWidth = node.strokeWeight;
    }
  }

  // 4. 圆角 (Corner Radius)
  if ('cornerRadius' in node && typeof node.cornerRadius === 'number') {
    if (node.cornerRadius > 0) style.borderRadius = node.cornerRadius;
  }

  // 5. 透明度
  if ('opacity' in node && node.opacity < 1) {
    style.opacity = Math.round(node.opacity * 100) / 100;
  }

  return style;
}

export function serializeNode(node: SceneNode): CleanLayer | CleanLayer[] | null {
  // 1. 过滤不可见或过小节点
  if (node.visible === false) return null;
  if (node.width < 1 || node.height < 1) return null;

  // 2. 坐标归一化 (使用 absoluteBoundingBox)
  const box = node.absoluteBoundingBox ? {
    x: Math.round(node.absoluteBoundingBox.x),
    y: Math.round(node.absoluteBoundingBox.y),
    w: Math.round(node.absoluteBoundingBox.width),
    h: Math.round(node.absoluteBoundingBox.height)
  } : { x: 0, y: 0, w: 0, h: 0 };

  // 3. 解包无意义容器 (Transparent Group/Frame)
  // 如果是无样式的容器，直接返回其子节点的序列化结果数组（Flat Map）
  if (isTransparentContainer(node) && 'children' in node) {
    const childrenResults: CleanLayer[] = [];
    for (const child of node.children) {
      const result = serializeNode(child);
      if (result) {
        if (Array.isArray(result)) {
          childrenResults.push(...result);
        } else {
          childrenResults.push(result);
        }
      }
    }
    return childrenResults;
  }

  // 4. 图标/图片处理 (SVG Candidate)
  if (isIconCandidate(node)) {
    return {
      id: node.id,
      name: node.name,
      type: 'SVG_CANDIDATE',
      box,
      style: extractStyles(node),
    };
  }

  // 5. 标准节点处理
  const result: CleanLayer = {
    id: node.id,
    name: node.name,
    type: node.type,
    box,
    style: extractStyles(node)
  };

  // 文本内容
  if (node.type === 'TEXT') {
    result.text = node.characters;
  }

  // 6. 递归处理子节点
  if ('children' in node) {
    const children: CleanLayer[] = [];
    for (const child of node.children) {
      const childResult = serializeNode(child);
      if (childResult) {
        if (Array.isArray(childResult)) {
          children.push(...childResult);
        } else {
          children.push(childResult);
        }
      }
    }
    if (children.length > 0) {
      result.children = children;
    }
  }

  return result;
}
