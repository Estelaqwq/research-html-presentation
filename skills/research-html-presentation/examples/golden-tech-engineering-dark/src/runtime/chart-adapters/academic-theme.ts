import type { VisualStyle } from "../visual-style";

export const ACADEMIC_CHART_COLORS = {
  structure: "#184a70",
  primary: "#245f8c",
  secondary: "#7fa6bf",
  supporting: "#b8cedc",
  decisive: "#a62a30",
  ink: "#30363c",
  muted: "#5a646d",
  grid: "#dfe5e9",
  surface: "#f3f7fa",
  white: "#ffffff",
  heatmap: ["#a62a30", "#f3f7fa", "#245f8c"] as readonly string[],
} as const;

/** Palette used by the optional engineering skin.  Values are deliberately
 * restrained so the chart remains evidence-first rather than decorative. */
export const TECH_ENGINEERING_DARK_CHART_COLORS = {
  structure: "#65c8e8",
  primary: "#20a9d2",
  secondary: "#4c9fc2",
  supporting: "#1d5b7a",
  decisive: "#d7a34a",
  ink: "#e5f3fb",
  muted: "#93aebe",
  grid: "#24536f",
  surface: "#0b2239",
  white: "#f3f8fb",
  danger: "#d86b62",
  heatmap: ["#113956", "#1d6b8d", "#20a9d2", "#d7a34a"] as readonly string[],
} as const;

export const ZUEL_ACADEMIC_CHART_THEME: Record<string, unknown> = {
  color: [ACADEMIC_CHART_COLORS.primary, ACADEMIC_CHART_COLORS.secondary, ACADEMIC_CHART_COLORS.supporting, ACADEMIC_CHART_COLORS.decisive],
  backgroundColor: "transparent",
  textStyle: { color: ACADEMIC_CHART_COLORS.ink, fontFamily: '"Source Han Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif', fontSize: 15 },
  title: { textStyle: { color: "#123653", fontSize: 19, fontWeight: 700 }, subtextStyle: { color: ACADEMIC_CHART_COLORS.muted, fontSize: 14 } },
  legend: { textStyle: { color: ACADEMIC_CHART_COLORS.ink, fontSize: 14 }, itemWidth: 18, itemHeight: 9 },
  tooltip: { backgroundColor: "rgba(255,255,255,.98)", borderColor: "#9bbdd3", borderWidth: 1, textStyle: { color: ACADEMIC_CHART_COLORS.ink, fontSize: 14 }, extraCssText: "box-shadow:0 8px 24px rgba(18,54,83,.16);max-width:360px" },
  categoryAxis: { axisLine: { lineStyle: { color: "#9bbdd3" } }, axisTick: { lineStyle: { color: "#9bbdd3" } }, axisLabel: { color: ACADEMIC_CHART_COLORS.ink, fontSize: 14 }, splitLine: { show: false } },
  valueAxis: { axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: ACADEMIC_CHART_COLORS.ink, fontSize: 14 }, splitLine: { lineStyle: { color: ACADEMIC_CHART_COLORS.grid, width: 1 } } },
  line: { symbolSize: 7, lineStyle: { width: 3 }, itemStyle: { borderWidth: 2 } },
  bar: { itemStyle: { borderRadius: 0 } },
};

export const TECH_ENGINEERING_DARK_CHART_THEME: Record<string, unknown> = {
  color: [TECH_ENGINEERING_DARK_CHART_COLORS.primary, TECH_ENGINEERING_DARK_CHART_COLORS.secondary, TECH_ENGINEERING_DARK_CHART_COLORS.supporting, TECH_ENGINEERING_DARK_CHART_COLORS.decisive],
  backgroundColor: "transparent",
  textStyle: { color: TECH_ENGINEERING_DARK_CHART_COLORS.ink, fontFamily: '"Source Han Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif', fontSize: 15 },
  title: { textStyle: { color: "#f1cf86", fontSize: 19, fontWeight: 700 }, subtextStyle: { color: TECH_ENGINEERING_DARK_CHART_COLORS.muted, fontSize: 14 } },
  legend: { textStyle: { color: TECH_ENGINEERING_DARK_CHART_COLORS.ink, fontSize: 14 }, itemWidth: 18, itemHeight: 9 },
  tooltip: { backgroundColor: "rgba(8,26,44,.97)", borderColor: "#4c9fc2", borderWidth: 1, textStyle: { color: TECH_ENGINEERING_DARK_CHART_COLORS.ink, fontSize: 14 }, extraCssText: "box-shadow:0 8px 24px rgba(0,0,0,.28);max-width:360px" },
  categoryAxis: { axisLine: { lineStyle: { color: "#4c9fc2" } }, axisTick: { lineStyle: { color: "#4c9fc2" } }, axisLabel: { color: TECH_ENGINEERING_DARK_CHART_COLORS.ink, fontSize: 14 }, splitLine: { lineStyle: { color: "#24536f", width: 1 } } },
  valueAxis: { axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: TECH_ENGINEERING_DARK_CHART_COLORS.ink, fontSize: 14 }, splitLine: { lineStyle: { color: TECH_ENGINEERING_DARK_CHART_COLORS.grid, width: 1, type: "dashed" } } },
  line: { symbolSize: 7, lineStyle: { width: 3 }, itemStyle: { borderWidth: 2 } },
  bar: { itemStyle: { borderRadius: 0 } },
};

export const VISUAL_CHART_THEMES: Record<VisualStyle, Record<string, unknown>> = {
  "academic-light": ZUEL_ACADEMIC_CHART_THEME,
  "tech-engineering-dark": TECH_ENGINEERING_DARK_CHART_THEME,
};

export function chartThemeForVisualStyle(style: VisualStyle = "academic-light") {
  return VISUAL_CHART_THEMES[style] ?? ZUEL_ACADEMIC_CHART_THEME;
}

export type ChartPalette = typeof ACADEMIC_CHART_COLORS | typeof TECH_ENGINEERING_DARK_CHART_COLORS;

export function chartPaletteForVisualStyle(style: VisualStyle = "academic-light"): ChartPalette {
  return style === "tech-engineering-dark" ? TECH_ENGINEERING_DARK_CHART_COLORS : ACADEMIC_CHART_COLORS;
}

export function currentVisualStyle(): VisualStyle {
  if (typeof document === "undefined") return "academic-light";
  const rootStyle = document.documentElement.dataset.visualStyle;
  const renderedStyle = document.querySelector<HTMLElement>("[data-deck-runtime='DeckRuntime'][data-visual-style], [data-report-runtime='ReportRuntime'][data-visual-style], [data-visual-style]")?.dataset.visualStyle;
  return rootStyle === "tech-engineering-dark" || renderedStyle === "tech-engineering-dark" ? "tech-engineering-dark" : "academic-light";
}

export function academicMotion(reducedMotion: boolean, durationMs = 420) {
  return { animation: !reducedMotion, animationDuration: reducedMotion ? 0 : Math.max(300, Math.min(600, durationMs)), animationDurationUpdate: reducedMotion ? 0 : 320, animationEasing: "cubicOut", animationEasingUpdate: "cubicOut" };
}
