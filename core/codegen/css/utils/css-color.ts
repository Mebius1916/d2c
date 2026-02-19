export function toCssColor(color: any): string {
  if (!color) return "transparent";
  if (typeof color === "string") return color;
  if (typeof color === "object" && "r" in color) {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    if (color.a !== undefined && color.a < 0.99) {
      return `rgba(${r}, ${g}, ${b}, ${color.a.toFixed(2)})`;
    }
    const toHex = (n: number) => n.toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  }
  return "transparent";
}

export function px(value: number | undefined): string {
  if (value === undefined || value === 0) return "0";
  return `${value}px`;
}
