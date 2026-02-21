import type { SimplifiedDesign, GlobalVars } from "../../types/extractor-types.js";

export interface CodegenContext {
  design: SimplifiedDesign;
  globalVars: GlobalVars;
}

export function createCodegenContext(design: SimplifiedDesign): CodegenContext {
  return {
    design,
    globalVars: {
      styles: { ...design.globalVars.styles },
      imageAssets: design.globalVars.imageAssets,
      styleCache: design.globalVars.styleCache,
    },
  };
}
