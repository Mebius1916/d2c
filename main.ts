import type {
  GetFileResponse,
  GetFileNodesResponse,
} from "@figma/rest-api-spec";
import { simplifyRawFigmaObject } from "./core/extractors/pipeline/design-extractor.js";
import { allExtractors } from "./core/extractors/attributes/built-in.js";
import type { SimplifiedDesign } from "./core/extractors/types.js";

/**
 * Main Entry Point for the D2C Engine.
 * Converts raw Figma API response into a simplified, semantic JSON structure.
 *
 * @param figmaData - The raw response from Figma API (GET /v1/files/:key)
 * @returns SimplifiedDesign - Cleaned, structured data ready for LLM or Code Gen
 */
export function extractFigmaAsJSON(
  figmaData: GetFileResponse | GetFileNodesResponse,
): SimplifiedDesign {
  // Use the "Full Blood" configuration with all extractors enabled
  return simplifyRawFigmaObject(figmaData, allExtractors);
}
