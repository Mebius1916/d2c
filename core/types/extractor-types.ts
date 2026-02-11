import type { Node as FigmaDocumentNode, Style } from "@figma/rest-api-spec";
import type { 
  SimplifiedTextStyle, 
  SimplifiedLayout, 
  SimplifiedFill, 
  SimplifiedStroke, 
  SimplifiedEffects 
} from "./simplified-types.js";
import type {
  ComponentProperties,
  SimplifiedComponentDefinition,
  SimplifiedComponentSetDefinition,
} from "../transformers/component.js";

export type StyleTypes =
  | SimplifiedTextStyle
  | SimplifiedFill[]
  | SimplifiedLayout
  | SimplifiedStroke
  | SimplifiedEffects
  | string;

export interface GlobalVars {
  styles: Record<string, StyleTypes>;
  styleCache?: Map<string, string>;
}

export interface TraversalContext {
  globalVars: GlobalVars & { extraStyles?: Record<string, Style> };
  currentDepth: number;
  parent?: FigmaDocumentNode;
}

/**
 * An extractor function that extracts specific properties from a Figma node.
 * It returns a Partial<SimplifiedNode> which will be merged into the final result.
 * It should NOT modify the 'children' property.
 *
 * @param node - The current Figma node being processed
 * @param context - Traversal context including globalVars and parent info.
 * @returns Partial object containing extracted properties
 */
export type ExtractorFn = (
  node: FigmaDocumentNode,
  context: TraversalContext,
) => Partial<Omit<SimplifiedNode, "children">>;

export interface SimplifiedDesign {
  name: string;
  nodes: SimplifiedNode[];
  components: Record<string, SimplifiedComponentDefinition>;
  componentSets: Record<string, SimplifiedComponentSetDefinition>;
  globalVars: GlobalVars;
}

export interface SimplifiedNode {
  id: string;
  name: string;
  type: string; // e.g. FRAME, TEXT, INSTANCE, RECTANGLE, SVG, IMAGE etc.
  semanticTag?: string; // e.g. "icon", "button", "input"
  src?: string; // For IMAGE nodes
  // Geometry for occlusion detection
  absRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  // text
  text?: string;
  textStyle?: string;
  // appearance
  fills?: string;
  styles?: string;
  strokes?: string;
  // Non-stylable stroke properties are kept on the node when stroke uses a named color style
  strokeWeight?: string;
  strokeDashes?: number[];
  strokeWeights?: string;
  effects?: string;
  opacity?: number;
  borderRadius?: string;
  rotation?: number; // degrees
  transform?: string; // css transform string
  // Vector Paths (for SVG)
  vectorPaths?: string[]; // SVG path data strings
  // layout & alignment
  layout?: string;
  layoutMode?: "absolute" | "relative"; // Inferred layout positioning
  // for rect-specific strokes, etc.
  componentId?: string;
  componentProperties?: ComponentProperties[];
  // children
  children?: SimplifiedNode[];
  // visual fingerprint for list inference
  visualSignature?: string;
}

export type { BoundingBox } from "./simplified-types.js";
