import * as fs from "fs";
import * as path from "path";
import type { TraversalContext, SimplifiedNode } from "../../../types/extractor-types.js";

export function createSnapshotWriter(outputDir: string, fileName: string = "test.json") {
  fs.mkdirSync(outputDir, { recursive: true });
  return (stage: string, nodes: SimplifiedNode[], globalVars: TraversalContext["globalVars"]) => {
    const payload = {
      stage,
      nodes,
      globalVars: {
        styles: globalVars.styles,
        imageAssets: globalVars.imageAssets,
      },
    };
    fs.writeFileSync(path.join(outputDir, fileName), JSON.stringify(payload, null, 2), "utf8");
  };
}
