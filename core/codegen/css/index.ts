import type { CodegenContext } from "../context/index.js";
import { generateGlobalCSS } from "./builders/css-builder.js";

export function generateCSS(context: CodegenContext): string {
  return generateGlobalCSS(context.globalVars);
}
