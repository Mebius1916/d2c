import type { SimplifiedDesign } from "../../../types/extractor-types.js";
import type { SimplifiedFill, SimplifiedImageFill, SimplifiedPatternFill, SimplifiedStroke } from "../../../types/simplified-types.js";

type ImageResolveOptions = {
  fileKey: string;
  token: string;
  format?: "png" | "jpg" | "svg" | "pdf";
  scale?: number;
};

type ImageMap = Record<string, string>;
type SvgMap = Record<string, string>;
type AssetMaps = { imageMap: ImageMap; svgMap: SvgMap };

export async function resolveImageAssetsFromFigma(
  design: SimplifiedDesign,
  options: ImageResolveOptions,
): Promise<SimplifiedDesign> {
  const imageAssets = design.globalVars.imageAssets;
  const hasNodeIds = imageAssets?.nodeIds?.length;
  const hasImageRefs = imageAssets?.imageRefs?.length;
  const hasSvgNodeIds = imageAssets?.svgNodeIds?.length;
  if (!imageAssets || (!hasNodeIds && !hasImageRefs && !hasSvgNodeIds)) {
    return design;
  }
  if (!options.fileKey || !options.token) {
    return design;
  }
  const { imageMap, svgMap } = await buildImageMap(imageAssets, options);
  return resolveImageAssets(design, imageMap, svgMap);
}

// 回填图片/svg映射表到设计中
function resolveImageAssets(
  design: SimplifiedDesign,
  imageMap?: ImageMap,
  svgMap?: SvgMap
): SimplifiedDesign {
  if (!imageMap && !svgMap) return design;
  applyImageMapToStyles(design.globalVars.styles, imageMap);
  applyImageMapToNodes(design.nodes, imageMap, svgMap);
  return design;
}

// 应用图片映射表到样式中
function applyImageMapToStyles(styles: Record<string, any>, imageMap?: ImageMap) {
  if (!imageMap) return;
  Object.values(styles).forEach((style) => {
    if (!style) return;
    if (Array.isArray(style)) {
      style.forEach((fill) => applyImageMapToFill(fill, imageMap));
      return;
    }
    if ("colors" in style) {
      const stroke = style as SimplifiedStroke;
      stroke.colors?.forEach((fill) => applyImageMapToFill(fill, imageMap));
    }
  });
}

// 应用图片/svg映射表到节点中
function applyImageMapToNodes(
  nodes: SimplifiedDesign["nodes"],
  imageMap?: ImageMap,
  svgMap?: SvgMap
) {
  nodes.forEach((node) => {
    if (node.type === "IMAGE" && !node.src && imageMap) {
      const mapped = imageMap[node.id];
      if (mapped) node.src = mapped;
    }
    if (node.type === "SVG" && !node.svg && svgMap) {
      const mapped = svgMap[node.id];
      if (mapped) node.svg = mapped;
    }
    if (node.children && node.children.length > 0) {
      applyImageMapToNodes(node.children, imageMap, svgMap);
    }
  });
}

// 构建图片映射表，将 Figma 节点 ID 和图片引用映射到实际的图片 URL
async function buildImageMap(
  imageAssets: NonNullable<SimplifiedDesign["globalVars"]["imageAssets"]>,
  options: ImageResolveOptions,
): Promise<AssetMaps> {
  const [nodeImageMap, imageFillMap, svgUrlMap] = await Promise.all([
    fetchNodeRenders(imageAssets.nodeIds, options), // image 资源
    fetchImageFills({ fileKey: options.fileKey, token: options.token }), // image fill 资源
    fetchNodeRenders(imageAssets.svgNodeIds || [], { ...options, format: "svg" }), // svg 资源
  ]);
  const svgMap = await fetchSvgMarkup(svgUrlMap);
  return { imageMap: { ...nodeImageMap, ...imageFillMap }, svgMap };
}

// 从 Figma API 中获取节点渲染图片/svg
async function fetchNodeRenders(nodeIds: string[], options: ImageResolveOptions): Promise<ImageMap> {
  if (nodeIds.length === 0) return {};
  const { fileKey, token, format = "png", scale } = options;
  const chunks = chunkIds(nodeIds, 100);
  const images: ImageMap = {};
  for (const chunk of chunks) {
    const params = new URLSearchParams({ ids: chunk.join(","), format });
    if (scale && Number.isFinite(scale)) params.set("scale", String(scale));
    const url = `https://api.figma.com/v1/images/${fileKey}?${params.toString()}`;
    const resp = await fetch(url, {
      headers: { "X-Figma-Token": token },
    });
    if (!resp.ok) {
      throw new Error(`Failed to fetch images: ${resp.status} ${resp.statusText}`);
    }
    const data = await resp.json();
    if (data?.images) {
      Object.assign(images, data.images);
    }
  }
  return images;
}

// 从 Figma API 中获取图片填充资源
async function fetchImageFills(options: { fileKey: string; token: string }): Promise<ImageMap> {
  const { fileKey, token } = options;
  const url = `https://api.figma.com/v1/files/${fileKey}/images`;
  const resp = await fetch(url, {
    headers: { "X-Figma-Token": token },
  });
  if (!resp.ok) {
    throw new Error(`Failed to fetch image fills: ${resp.status} ${resp.statusText}`);
  }
  const data = await resp.json();
  return data?.meta?.images || {};
}

// 
async function fetchSvgMarkup(svgUrlMap: ImageMap): Promise<SvgMap> {
  const entries = Object.entries(svgUrlMap);
  if (entries.length === 0) return {};
  const results: SvgMap = {};
  await Promise.all(
    entries.map(async ([nodeId, url]) => {
      if (!url) return;
      const resp = await fetch(url);
      if (!resp.ok) return;
      const svgText = await resp.text();
      results[nodeId] = svgText;
    })
  );
  return results;
}

// 应用图片映射表到填充中
function applyImageMapToFill(fill: SimplifiedFill, imageMap: ImageMap) {
  if (typeof fill === "string") return;
  if ("type" in fill) {
    if (fill.type === "IMAGE") {
      const imageFill = fill as SimplifiedImageFill;
      const mapped = imageMap[imageFill.imageRef];
      if (mapped) imageFill.imageRef = mapped;
      return;
    }
    if (fill.type === "PATTERN") {
      const patternFill = fill as SimplifiedPatternFill;
      const mapped = imageMap[patternFill.patternSource.nodeId];
      if (mapped) patternFill.patternSource.url = mapped;
    }
  }
}

// 图片分块，100张为一组
function chunkIds(ids: string[], size: number): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size));
  }
  return chunks;
}
