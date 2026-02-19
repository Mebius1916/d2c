import type { CodegenContext } from "../context.js";
import { generateGlobalCSS } from "./builders/css-builder.js";

export function generateCSS(context: CodegenContext): string {
  return generateGlobalCSS(context.globalVars);
}
