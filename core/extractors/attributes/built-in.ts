import { layoutExtractor } from "./layout-extractor.js";
import { textExtractor } from "./text-extractor.js";
import { visualsExtractor } from "./visuals-extractor.js";
import { componentExtractor } from "./component-extractor.js";
import { imageExtractor } from "./image-extractor.js";

export const allExtractors = [
  layoutExtractor, 
  textExtractor, 
  imageExtractor,
  visualsExtractor, 
  componentExtractor
];
