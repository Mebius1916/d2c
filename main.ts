import type {
  GetFileResponse,
  GetFileNodesResponse,
} from "@figma/rest-api-spec";
import { simplifyRawFigmaObjectWithImages } from "./core/extractors/pipeline/design-extractor.js";
import type { SimplifiedDesign } from "./core/types/extractor-types.js";

/**
 * Main Entry Point for the D2C Engine.
 * Converts raw Figma API response into a simplified, semantic JSON structure.
 *
 * @param figmaData - The raw response from Figma API (GET /v1/files/:key)
 * @returns SimplifiedDesign - Cleaned, structured data ready for LLM or Code Gen
 */
export async function extractFigmaAsJSON(
  figmaData: GetFileResponse | GetFileNodesResponse,
  options: {
    fileKey: string;
    token: string;
    format?: "png" | "jpg" | "svg" | "pdf";
    scale?: number,
  },
): Promise<SimplifiedDesign> {
  return simplifyRawFigmaObjectWithImages(figmaData, options);
}
