import * as fs from "fs";
import { generateHTML } from "./core/codegen/generators/html/html-generator.js";

async function runCodegen() {
  try {
    console.log("Reading test-result.json...");
    const rawData = fs.readFileSync("test-result.json", "utf8");
    const design = JSON.parse(rawData);

    console.log("Generating HTML...");
    const html = generateHTML(design);

    console.log("Writing output to output.html...");
    fs.writeFileSync("output.html", html);
    
    console.log("Success! Open output.html in your browser to see the result.");

  } catch (error) {
    console.error("Error running codegen:", error);
  }
}

runCodegen();
