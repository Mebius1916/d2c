import type { Paint, Vector, RGBA } from "@figma/rest-api-spec";
import { resolveVariableColorName } from "./text-utils.js";

function numberToFixedString(num: number): string {
  return num.toFixed(2).replace(/\.00$/, "");
}

function gradientColorToCss(color: RGBA, alpha: number): string {
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
    const toHex = (n: number) => n.toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  }
  const r = numberToFixedString(color.r * 255);
  const g = numberToFixedString(color.g * 255);
  const b = numberToFixedString(color.b * 255);
  const a = numberToFixedString(alpha);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function resolveGradientStopColor(stop: any, opacityMultiplier: number): string {
  const variableName = resolveVariableColorName(stop);
  const fillOpacity = (stop?.color?.a ?? 1) * opacityMultiplier;
  const fallbackColor = gradientColorToCss(stop.color, fillOpacity);
  if (variableName) return `var(--${variableName}, ${fallbackColor})`;
  return fallbackColor;
}

function processGradientStops(
  stops: ReadonlyArray<any>,
  fillOpacity: number = 1,
  positionMultiplier: number = 100,
  unit: string = "%",
): string {
  return stops
    .map((stop) => {
      const cssColor = resolveGradientStopColor(stop, fillOpacity);
      return `${cssColor} ${(stop.position * positionMultiplier).toFixed(0)}${unit}`;
    })
    .join(", ");
}

function mapGradientStops(
  gradient: Extract<
    Paint,
    { type: "GRADIENT_LINEAR" | "GRADIENT_RADIAL" | "GRADIENT_ANGULAR" | "GRADIENT_DIAMOND" }
  >,
  opacityMultiplier: number = 1
): { stops: string; cssGeometry: string } {
  const handles = gradient.gradientHandlePositions;
  const [handle1, handle2, handle3] = handles;

  switch (gradient.type) {
    case "GRADIENT_LINEAR": {
      return mapLinearGradient(gradient.gradientStops, handle1, handle2, opacityMultiplier);
    }
    case "GRADIENT_RADIAL": {
      return mapRadialGradient(gradient.gradientStops, handle1, handle2, handle3, opacityMultiplier);
    }
    case "GRADIENT_ANGULAR": {
      return mapAngularGradient(gradient.gradientStops, handle1, handle3, opacityMultiplier);
    }
    case "GRADIENT_DIAMOND": {
      return { stops: "", cssGeometry: "" };
    }
    default: {
      const stops = processGradientStops(gradient.gradientStops, 1);
      return { stops, cssGeometry: "0deg" };
    }
  }
}

function mapLinearGradient(
  gradientStops: { position: number; color: RGBA }[],
  start: Vector,
  end: Vector,
  opacityMultiplier: number = 1,
): { stops: string; cssGeometry: string } {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  let angle = Math.atan2(dy, dx) * (180 / Math.PI);
  angle = (angle + 360) % 360;
  const cssAngle = (angle + 90) % 360;
  const stops = processGradientStops(gradientStops, opacityMultiplier);
  return { stops, cssGeometry: `${cssAngle.toFixed(0)}deg` };
}

function mapRadialGradient(
  stops: any[],
  h1: Vector,
  h2: Vector,
  h3: Vector,
  opacityMultiplier: number = 1
) {
  const mappedStops = processGradientStops(stops, opacityMultiplier);
  const cx = h1.x * 100;
  const cy = h1.y * 100;
  const rx = Math.sqrt((h2.x - h1.x) ** 2 + (h2.y - h1.y) ** 2) * 100;
  const ry = Math.sqrt((h3.x - h1.x) ** 2 + (h3.y - h1.y) ** 2) * 100;
  const cssGeometry = `ellipse ${rx.toFixed(2)}% ${ry.toFixed(2)}% at ${cx.toFixed(2)}% ${cy.toFixed(2)}%`;
  return { stops: mappedStops, cssGeometry };
}

function mapAngularGradient(
  stops: any[],
  center: Vector,
  startDirection: Vector,
  opacityMultiplier: number = 1
) {
  const mappedStops = processGradientStops(stops, opacityMultiplier, 360, "deg");
  const cx = center.x * 100;
  const cy = center.y * 100;
  const dx = startDirection.x - center.x;
  const dy = startDirection.y - center.y;
  let angle = Math.atan2(dy, dx) * (180 / Math.PI);
  angle = (angle + 360) % 360;
  const cssGeometry = `from ${angle.toFixed(0)}deg at ${cx.toFixed(2)}% ${cy.toFixed(2)}%`;
  return { stops: mappedStops, cssGeometry };
}

function buildDiamondGradient(stops: any[], opacityMultiplier: number = 1): string {
  const mappedStops = processGradientStops(stops, opacityMultiplier, 50, "%");
  const gradientConfigs = [
    { direction: "to bottom right", position: "bottom right" },
    { direction: "to bottom left", position: "bottom left" },
    { direction: "to top left", position: "top left" },
    { direction: "to top right", position: "top right" },
  ];
  return gradientConfigs
    .map(
      ({ direction, position }) =>
        `linear-gradient(${direction}, ${mappedStops}) ${position} / 50% 50% no-repeat`,
    )
    .join(", ");
}

export function convertGradientToCss(raw: any): string {
  const opacityMultiplier = typeof raw.opacity === "number" ? raw.opacity : 1;
  if (raw.type === "GRADIENT_DIAMOND") {
    return buildDiamondGradient(raw.gradientStops, opacityMultiplier);
  }
  const { stops, cssGeometry } = mapGradientStops(raw, opacityMultiplier);
  if (raw.type === "GRADIENT_LINEAR") return `linear-gradient(${cssGeometry}, ${stops})`;
  if (raw.type === "GRADIENT_RADIAL") return `radial-gradient(${cssGeometry}, ${stops})`;
  if (raw.type === "GRADIENT_ANGULAR") return `conic-gradient(${cssGeometry}, ${stops})`;
  return `linear-gradient(${stops})`;
}
