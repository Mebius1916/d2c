import { v4 as uuidv4 } from "uuid";

export type StyleId = `${string}_${string}` & { __brand: "StyleId" };

/**
 * Remove keys with empty arrays or empty objects from an object.
 * @param input - The input object or value.
 * @returns The processed object or the original value.
 */
export function removeEmptyKeys<T>(input: T): T {
  // If not an object type or null, return directly
  if (typeof input !== "object" || input === null) {
    return input;
  }

  // Handle array type
  if (Array.isArray(input)) {
    return input.map((item) => removeEmptyKeys(item)) as T;
  }

  // Handle object type
  const result = {} as T;
  for (const key in input) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      const value = input[key];

      // Recursively process nested objects
      const cleanedValue = removeEmptyKeys(value);

      // Skip empty arrays and empty objects
      if (
        cleanedValue !== undefined &&
        !(Array.isArray(cleanedValue) && cleanedValue.length === 0) &&
        !(
          typeof cleanedValue === "object" &&
          cleanedValue !== null &&
          Object.keys(cleanedValue).length === 0
        )
      ) {
        result[key] = cleanedValue;
      }
    }
  }

  return result;
}

/**
 * Generate a UUID v4 variable ID
 * @param prefix - ID prefix
 */
export function generateVarId(prefix: string): string {
  // Use crypto.randomUUID if available (Node.js/Modern Browsers), fallback to uuidv4
  // In our environment we use uuid package
  return `${prefix}_${uuidv4().replace(/-/g, "").slice(0, 8)}`;
}

/**
 * Check if a Figma node is visible
 */
export function isVisible(node: any): boolean {
  return node.visible !== false;
}

/**
 * Round a pixel value to 2 decimal places to avoid floating point errors
 */
export function pixelRound(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Generate CSS shorthand string for padding/margin/stroke
 * Supports object input: { top, right, bottom, left }
 * Or individual args: (top, right, bottom, left)
 */
export function generateCSSShorthand(
  arg1: number | { top?: number; right?: number; bottom?: number; left?: number },
  arg2?: number,
  arg3?: number,
  arg4?: number,
  unit = "px"
): string {
  let top = 0,
    right = 0,
    bottom = 0,
    left = 0;

  if (typeof arg1 === "object" && arg1 !== null) {
    top = arg1.top ?? 0;
    right = arg1.right ?? 0;
    bottom = arg1.bottom ?? 0;
    left = arg1.left ?? 0;
  } else if (typeof arg1 === "number") {
    top = arg1;
    right = arg2 ?? 0;
    bottom = arg3 ?? 0;
    left = arg4 ?? 0;
  }

  if (top === right && top === bottom && top === left) {
    return `${top}${unit}`;
  }
  if (top === bottom && right === left) {
    return `${top}${unit} ${right}${unit}`;
  }
  return `${top}${unit} ${right}${unit} ${bottom}${unit} ${left}${unit}`;
}

