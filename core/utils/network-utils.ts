import * as fs from "fs";
import * as path from "path";

/**
 * Download Figma image and save it locally
 * @param fileName - The filename to save as
 * @param localPath - The local path to save to
 * @param imageUrl - Image URL (images[nodeId])
 * @returns A Promise that resolves to the full file path where the image was saved
 * @throws Error if download fails
 */
export async function downloadFigmaImage(
  fileName: string,
  localPath: string,
  imageUrl: string,
): Promise<string> {
  try {
    // Ensure local path exists
    if (!fs.existsSync(localPath)) {
      fs.mkdirSync(localPath, { recursive: true });
    }

    // Build the complete file path
    const fullPath = path.join(localPath, fileName);

    // Use fetch to download the image
    const response = await fetch(imageUrl, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    // Create write stream
    const writer = fs.createWriteStream(fullPath);

    // Get the response as a readable stream and pipe it to the file
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Failed to get response body");
    }

    return new Promise((resolve, reject) => {
      // Process stream
      const processStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              writer.end();
              break;
            }
            writer.write(value);
          }
        } catch (err) {
          writer.end();
          fs.unlink(fullPath, () => {});
          reject(err);
        }
      };

      // Resolve only when the stream is fully written
      writer.on("finish", () => {
        resolve(fullPath);
      });

      writer.on("error", (err) => {
        reader.cancel();
        fs.unlink(fullPath, () => {});
        reject(new Error(`Failed to write image: ${err.message}`));
      });

      processStream();
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Error downloading image: ${errorMessage}`);
  }
}
