export function resolveFontStyle(input?: string): string | undefined {
  if (!input) return undefined;
  if (input.toLowerCase().includes("italic")) return "italic";
  return undefined;
}

export function resolveLineHeight(lineHeight: any, fontSize?: number): string | undefined {
  if (!lineHeight) return undefined;
  if (typeof lineHeight === "number") return `${lineHeight}px`;
  if (typeof lineHeight === "string") return lineHeight;
  if (lineHeight.unit === "AUTO") return undefined;
  if (lineHeight.unit === "PIXELS" && typeof lineHeight.value === "number") {
    return `${lineHeight.value}px`;
  }
  if (lineHeight.unit === "PERCENT" && typeof lineHeight.value === "number") {
    if (fontSize) return `${(fontSize * lineHeight.value) / 100}px`;
    return undefined;
  }
  return undefined;
}

export function resolveLetterSpacing(letterSpacing: any, fontSize?: number): string | undefined {
  if (letterSpacing === undefined || letterSpacing === null) return undefined;
  if (typeof letterSpacing === "number") {
    return `${letterSpacing}px`;
  }
  if (typeof letterSpacing === "string") return letterSpacing;
  if (letterSpacing.unit === "PIXELS" && typeof letterSpacing.value === "number") {
    return `${letterSpacing.value}px`;
  }
  if (letterSpacing.unit === "PERCENT" && typeof letterSpacing.value === "number") {
    if (fontSize) return `${(fontSize * letterSpacing.value) / 100}px`;
    return undefined;
  }
  return undefined;
}

export function resolveVariableColorName(fill: any): string | undefined {
  const rawName = fill?.variableColorName;
  if (!rawName || typeof rawName !== "string") return undefined;
  return rawName;
}
