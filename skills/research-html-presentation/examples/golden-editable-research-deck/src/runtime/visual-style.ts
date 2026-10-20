export const VISUAL_STYLES = ["academic-light", "tech-engineering-dark"] as const;

export type VisualStyle = (typeof VISUAL_STYLES)[number];

export function resolveVisualStyle(value: unknown): VisualStyle {
  return value === "tech-engineering-dark" ? "tech-engineering-dark" : "academic-light";
}
