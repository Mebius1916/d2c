import type {
  RGBA,
  Transform,
} from "@figma/rest-api-spec";
import type { CSSRGBAColor, CSSHexColor } from "../../utils/identity.js";
import type { SimplifiedImageFill } from "../../types/simplified-types.js";
export { convertGradientToCss } from "./gradient-utils.js";

export interface ColorValue {
  hex: CSSHexColor;
  opacity: number;
}

/**
 * Translate Figma scale modes to CSS properties based on usage context
 *
 * @param scaleMode - The Figma scale mode (FILL, FIT, TILE, STRETCH)
 * @param isBackground - Whether this image will be used as background-image (true) or <img> tag (false)
 * @param scalingFactor - For TILE mode, the scaling factor relative to original image size
 * @returns Object containing CSS properties and processing metadata
 */
export function translateScaleMode(
  scaleMode: "FILL" | "FIT" | "TILE" | "STRETCH",
  hasChildren: boolean,
  scalingFactor?: number,
): {
  css: Partial<SimplifiedImageFill>;
  processing: NonNullable<SimplifiedImageFill["imageDownloadArguments"]>;
} {
  const isBackground = hasChildren;

  switch (scaleMode) {
    case "FILL":
      // Image covers entire container, may be cropped
      return {
        css: isBackground
          ? { backgroundSize: "cover", backgroundRepeat: "no-repeat", isBackground: true }
          : { objectFit: "cover", isBackground: false },
        processing: { needsCropping: false, requiresImageDimensions: false },
      };

    case "FIT":
      // Image fits entirely within container, may have empty space
      return {
        css: isBackground
          ? { backgroundSize: "contain", backgroundRepeat: "no-repeat", isBackground: true }
          : { objectFit: "contain", isBackground: false },
        processing: { needsCropping: false, requiresImageDimensions: false },
      };

    case "TILE":
      // Image repeats to fill container at specified scale
      // Always treat as background image (can't tile an <img> tag)
      return {
        css: {
          backgroundRepeat: "repeat",
          backgroundSize: scalingFactor
            ? `calc(var(--original-width) * ${scalingFactor}) calc(var(--original-height) * ${scalingFactor})`
            : "auto",
          isBackground: true,
        },
        processing: { needsCropping: false, requiresImageDimensions: true },
      };

    case "STRETCH":
      // Figma calls crop "STRETCH" in its API.
      return {
        css: isBackground
          ? { backgroundSize: "100% 100%", backgroundRepeat: "no-repeat", isBackground: true }
          : { objectFit: "fill", isBackground: false },
        processing: { needsCropping: false, requiresImageDimensions: false },
      };

    default:
      return {
        css: {},
        processing: { needsCropping: false, requiresImageDimensions: false },
      };
  }
}

/**
 * Generate a short hash from a transform matrix to create unique filenames
 * @param transform - The transform matrix to hash
 * @returns Short hash string for filename suffix
 */
function generateTransformHash(transform: Transform): string {
  const values = transform.flat();
  const hash = values.reduce((acc, val) => {
    // Simple hash function - convert to string and create checksum
    const str = val.toString();
    for (let i = 0; i < str.length; i++) {
      acc = ((acc << 5) - acc + str.charCodeAt(i)) & 0xffffffff;
    }
    return acc;
  }, 0);

  // Convert to positive hex string, take first 6 chars
  return Math.abs(hash).toString(16).substring(0, 6);
}

/**
 * Handle imageTransform for post-processing (not CSS translation)
 *
 * When Figma includes an imageTransform matrix, it means the image is cropped/transformed.
 * This function converts the transform into processing instructions for Sharp.
 *
 * @param imageTransform - Figma's 2x3 transform matrix [[scaleX, skewX, translateX], [skewY, scaleY, translateY]]
 * @returns Processing metadata for image cropping
 */
export function handleImageTransform(
  imageTransform: Transform,
): NonNullable<SimplifiedImageFill["imageDownloadArguments"]> {
  const transformHash = generateTransformHash(imageTransform);
  return {
    needsCropping: true,
    requiresImageDimensions: false,
    cropTransform: imageTransform,
    filenameSuffix: `${transformHash}`,
  };
}

/**
 * Convert hex color value and opacity to rgba format
 * @param hex - Hexadecimal color value (e.g., "#FF0000" or "#F00")
 * @param opacity - Opacity value (0-1)
 * @returns Color string in rgba format
 */
export function hexToRgba(hex: string, opacity: number = 1): string {
  // Remove possible # prefix
  hex = hex.replace("#", "");

  // Handle shorthand hex values (e.g., #FFF)
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  // Convert hex to RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Ensure opacity is in the 0-1 range
  const validOpacity = Math.min(Math.max(opacity, 0), 1);

  return `rgba(${r}, ${g}, ${b}, ${validOpacity})`;
}

/**
 * Convert color from RGBA to { hex, opacity }
 *
 * @param color - The color to convert, including alpha channel
 * @param opacity - The opacity of the color, if not included in alpha channel
 * @returns The converted color
 **/
export function convertColor(color: RGBA, opacity = 1): ColorValue {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);

  // Alpha channel defaults to 1. If opacity and alpha are both and < 1, their effects are multiplicative
  const a = Math.round(opacity * color.a * 100) / 100;

  const hex = ("#" +
    ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()) as CSSHexColor;

  return { hex, opacity: a };
}

/**
 * Convert color from Figma RGBA to rgba(#, #, #, #) CSS format
 *
 * @param color - The color to convert, including alpha channel
 * @param opacity - The opacity of the color, if not included in alpha channel
 * @returns The converted color
 **/
export function formatRGBAColor(color: RGBA, opacity = 1): CSSRGBAColor {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  // Alpha channel defaults to 1. If opacity and alpha are both and < 1, their effects are multiplicative
  const a = Math.round(opacity * color.a * 100) / 100;

  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function numberToFixedString(num: number): string {
  return num.toFixed(2).replace(/\.00$/, "");
}

export function htmlColor(color: RGBA, alpha: number = 1): string {
  if (color.r === 1 && color.g === 1 && color.b === 1 && alpha === 1) {
    return "white";
  }
  if (color.r === 0 && color.g === 0 && color.b === 0 && alpha === 1) {
    return "black";
  }
  if (alpha === 1) {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    const toHex = (num: number) => num.toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  }
  const r = numberToFixedString(color.r * 255);
  const g = numberToFixedString(color.g * 255);
  const b = numberToFixedString(color.b * 255);
  const a = numberToFixedString(alpha);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
