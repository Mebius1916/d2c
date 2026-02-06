import { layoutExtractor } from "./layout-extractor.js";
import { textExtractor } from "./text-extractor.js";
import { visualsExtractor } from "./visuals-extractor.js";
import { componentExtractor } from "./component-extractor.js";

export { collapseSvgContainers, SVG_ELIGIBLE_TYPES } from "../../utils/svg-helper.js";

export const allExtractors = [layoutExtractor, textExtractor, visualsExtractor, componentExtractor];

