import type { SimplifiedNode } from "../../../types/extractor-types.js";
import type { SimplifiedEffects } from "../../../types/simplified-types.js";
import { resolveStyleObject } from "../builders/css-builder.js";
import { findOrCreateVar } from "../../../utils/style-helper.js";

export function getTextSegmentStyleId(
  segmentStyle: any,
  node: SimplifiedNode,
  globalVars?: { styles: Record<string, any>; styleCache?: Map<string, string> },
  segmentEffects?: SimplifiedEffects
): string | undefined {
  if (!globalVars) return undefined;
  const segmentStyleId = segmentStyle
    ? findOrCreateVar(globalVars as any, segmentStyle as any, "text")
    : undefined;
  const effectStyleId = getTextEffectStyleId(node, globalVars);
  const segmentEffectId = segmentEffects
    ? findOrCreateVar(globalVars as any, segmentEffects as any, "effect")
    : undefined;
  const refs = [segmentStyleId, effectStyleId, segmentEffectId].filter(Boolean) as string[];
  if (refs.length > 1) {
    return findOrCreateVar(globalVars as any, { refs } as any, "style");
  }
  return refs[0];
}

function getTextEffectStyleId(
  node: SimplifiedNode,
  globalVars?: { styles: Record<string, any>; styleCache?: Map<string, string> }
): string | undefined {
  if (!globalVars || !node.styles) return undefined;
  const style = globalVars.styles[node.styles];
  if (!style) return undefined;
  const resolved = resolveStyleObject(style, globalVars.styles, new Set());
  const effects: Record<string, string> = {};
  if (resolved["text-shadow"]) effects["textShadow"] = resolved["text-shadow"];
  if (resolved["filter"]) effects["filter"] = resolved["filter"];
  if (resolved["backdrop-filter"]) effects["backdropFilter"] = resolved["backdrop-filter"];
  if (Object.keys(effects).length === 0) return undefined;
  return findOrCreateVar(globalVars as any, effects as any, "effect");
}
