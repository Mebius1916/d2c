import type { SimplifiedDesign } from "../types/extractor-types.js";

export interface CodegenContext {
  design: SimplifiedDesign;
  globalVars: { styles: Record<string, any>; styleCache?: Map<string, string> };
}

export function createCodegenContext(design: SimplifiedDesign): CodegenContext {
  return {
    design,
    globalVars: { styles: { ...design.globalVars.styles } },
  };
}
