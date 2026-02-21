import type { Transform } from "@figma/rest-api-spec";

/* -------------------------------------------------------------------------- */
/*                                Layout Types                                */
/* -------------------------------------------------------------------------- */

export interface SimplifiedLayout {
  mode: "none" | "row" | "column";
  parentMode?: "none" | "row" | "column";
  justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" | "baseline" | "stretch";
  alignItems?: "flex-start" | "flex-end" | "center" | "space-between" | "baseline" | "stretch";
  alignSelf?: "flex-start" | "flex-end" | "center" | "stretch";
  wrap?: boolean;
  gap?: string;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  locationRelativeToParent?: {
    x: number;
    y: number;
  };
  dimensions?: {
    width?: number;
    height?: number;
    aspectRatio?: number;
  };
  padding?: string;
  sizing?: {
    horizontal?: "fixed" | "fill" | "hug";
    vertical?: "fixed" | "fill" | "hug";
  };
  overflowScroll?: ("x" | "y")[];
  position?: "absolute";
  textAutoResize?: "WIDTH_AND_HEIGHT" | "HEIGHT" | "NONE" | "TRUNCATE";
  textTruncation?: string;
  maxLines?: number;
}

/* -------------------------------------------------------------------------- */
/*                                 Text Types                                 */
/* -------------------------------------------------------------------------- */

export interface SimplifiedTextStyle {
  fontFamily?: string;
  fontWeight?: number;
  fontSize?: number;
  lineHeight?: string;
  letterSpacing?: string;
  textCase?: string;
  textDecoration?: string;
  fontStyle?: string;
  textAlignHorizontal?: string;
  textAlignVertical?: string;
  openTypeFeatures?: {
    SUBS?: boolean;
    SUPS?: boolean;
  };
  textBoxTrim?: string;
  textBoxEdge?: string;
  color?: any; // CSSColor or string
  richText?: {
    text: string;
    style: SimplifiedTextStyle;
  }[];
}

/* -------------------------------------------------------------------------- */
/*                                Style Types                                 */
/* -------------------------------------------------------------------------- */

/**
 * Simplified image fill with CSS properties and processing metadata
 */
export interface SimplifiedImageFill {
  type: "IMAGE";
  imageRef: string;
  scaleMode: "FILL" | "FIT" | "TILE" | "STRETCH";
  blendMode?: string;
  /**
   * For TILE mode, the scaling factor relative to original image size
   */
  scalingFactor?: number;

  // CSS properties for background-image usage (when node has children)
  backgroundSize?: string;
  backgroundRepeat?: string;

  // CSS properties for <img> tag usage (when node has no children)
  isBackground?: boolean;
  objectFit?: string;

  // Image processing metadata (NOT for CSS translation)
  imageDownloadArguments?: {
    needsCropping: boolean;
    requiresImageDimensions: boolean;
    cropTransform?: Transform;
    filenameSuffix?: string;
  };
}

export interface SimplifiedGradientFill {
  type: "GRADIENT_LINEAR" | "GRADIENT_RADIAL" | "GRADIENT_ANGULAR" | "GRADIENT_DIAMOND";
  gradient: string;
  blendMode?: string;
}

export interface SimplifiedPatternFill {
  type: "PATTERN";
  patternSource: {
    type: "IMAGE-PNG";
    nodeId: string;
    url?: string;
  };
  backgroundRepeat: string;
  backgroundSize: string;
  backgroundPosition: string;
  blendMode?: string;
}

export interface SimplifiedSolidFill {
  type: "SOLID";
  color: string;
  blendMode?: string;
}

export interface SimplifiedNodeStyle {
  opacity?: number;
  borderRadius?: string;
  transform?: string;
  blendMode?: string;
  visibility?: string;
}

export interface SimplifiedCompositeStyle {
  refs: string[];
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type SimplifiedFill =
  | SimplifiedImageFill
  | SimplifiedSolidFill
  | SimplifiedGradientFill
  | SimplifiedPatternFill
  | string;

export interface SimplifiedStroke {
  colors: SimplifiedFill[];
  strokeWeight?: string;
  strokeDashes?: number[];
  strokeWeights?: string;
  strokeAlign?: "INSIDE" | "CENTER" | "OUTSIDE";
}

export interface SimplifiedVectorPath {
  path: string; // SVG path data 'd'
  stroke?: SimplifiedStroke;
  fill?: SimplifiedFill;
  windingRule?: "NONZERO" | "EVENODD";
}

/* -------------------------------------------------------------------------- */
/*                               Effect Types                                 */
/* -------------------------------------------------------------------------- */

export interface SimplifiedEffects {
  boxShadow?: string;
  filter?: string;
  backdropFilter?: string;
  textShadow?: string;
}
