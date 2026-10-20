import type { VisualStyle } from "../visual-style";

export const ACADEMIC_CHART_COLORS = {
  structure: "#173f9e",
  primary: "#2455b5",
  secondary: "#6f8fc9",
  supporting: "#b6c7e7",
  decisive: "#b3262e",
  ink: "#2d3748",
  muted: "#5c6675",
  grid: "#dde3ed",
  surface: "#f2f5fb",
  white: "#ffffff",
  categorical: ["#2455b5", "#b3262e", "#7868a6", "#b77b26"] as readonly string[],
  sequential: ["#f2f5fb", "#91aedc", "#2455b5"] as readonly string[],
  diverging: ["#b3262e", "#f8fafd", "#2455b5"] as readonly string[],
  /** Legacy alias; choose sequential/diverging explicitly in new charts. */
  heatmap: ["#b3262e", "#f8fafd", "#2455b5"] as readonly string[],
} as const;

/** Palette used by the optional engineering skin.  Values are deliberately
 * restrained so the chart remains evidence-first rather than decorative. */
export const TECH_ENGINEERING_DARK_CHART_COLORS = {
  structure: "#51dfff",
  primary: "#20b9ff",
  secondary: "#438dff",
  supporting: "#3157ae",
  decisive: "#ffe393",
  ink: "#e8f5ff",
  muted: "#91b4e4",
  grid: "#214580",
  surface: "#04184c",
  white: "#f5fbff",
  danger: "#ff9b97",
  categorical: ["#20b9ff", "#ffe393", "#c4adff", "#ff9b97"] as readonly string[],
  sequential: ["#09265c", "#146bc0", "#51dfff"] as readonly string[],
  diverging: ["#ff9b97", "#19305a", "#51dfff"] as readonly string[],
  /** Legacy alias; choose sequential/diverging explicitly in new charts. */
  heatmap: ["#081c59", "#0a58b8", "#20b9ff", "#ffe393"] as readonly string[],
} as const;

export const ZUEL_ACADEMIC_CHART_THEME: Record<string, unknown> = {
  color: [ACADEMIC_CHART_COLORS.primary, ACADEMIC_CHART_COLORS.secondary, ACADEMIC_CHART_COLORS.supporting, ACADEMIC_CHART_COLORS.decisive],
  backgroundColor: "transparent",
  textStyle: { color: ACADEMIC_CHART_COLORS.ink, fontFamily: '"Source Han Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif', fontSize: 15 },
  title: { textStyle: { color: "#0e2f73", fontSize: 19, fontWeight: 700 }, subtextStyle: { color: ACADEMIC_CHART_COLORS.muted, fontSize: 14 } },
  legend: { top: 2, right: 8, textStyle: { color: ACADEMIC_CHART_COLORS.ink, fontSize: 14 }, itemWidth: 16, itemHeight: 8 },
  tooltip: { backgroundColor: "rgba(255,255,255,.98)", borderColor: "#9fb9e8", borderWidth: 1, textStyle: { color: ACADEMIC_CHART_COLORS.ink, fontSize: 14 }, extraCssText: "box-shadow:0 8px 24px rgba(24,63,135,.15);max-width:360px" },
  categoryAxis: { axisLine: { lineStyle: { color: "#9fb9e8" } }, axisTick: { show: false }, axisLabel: { color: ACADEMIC_CHART_COLORS.ink, fontFamily: '"Source Han Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif', fontSize: 14 }, splitLine: { show: false } },
  valueAxis: { axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: ACADEMIC_CHART_COLORS.ink, fontFamily: '"Source Han Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif', fontSize: 14 }, splitLine: { lineStyle: { color: ACADEMIC_CHART_COLORS.grid, width: 1, type: "dashed" } } },
  line: { symbolSize: 7, lineStyle: { width: 3 }, itemStyle: { borderWidth: 2 } },
  bar: { itemStyle: { borderRadius: 0 } },
};

export const TECH_ENGINEERING_DARK_CHART_THEME: Record<string, unknown> = {
  color: [TECH_ENGINEERING_DARK_CHART_COLORS.primary, TECH_ENGINEERING_DARK_CHART_COLORS.secondary, TECH_ENGINEERING_DARK_CHART_COLORS.supporting, TECH_ENGINEERING_DARK_CHART_COLORS.decisive],
  backgroundColor: "transparent",
  textStyle: { color: TECH_ENGINEERING_DARK_CHART_COLORS.ink, fontFamily: '"Source Han Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif', fontSize: 15 },
  title: { textStyle: { color: "#e8f5ff", fontSize: 19, fontWeight: 700 }, subtextStyle: { color: TECH_ENGINEERING_DARK_CHART_COLORS.muted, fontSize: 14 } },
  legend: { textStyle: { color: TECH_ENGINEERING_DARK_CHART_COLORS.ink, fontSize: 14 }, itemWidth: 18, itemHeight: 9 },
  tooltip: { backgroundColor: "#071f59", borderColor: "#3989e8", borderWidth: 1, textStyle: { color: TECH_ENGINEERING_DARK_CHART_COLORS.ink, fontSize: 14 }, extraCssText: "box-shadow:0 8px 24px rgba(0,0,0,.28);max-width:360px" },
  categoryAxis: { axisLine: { lineStyle: { color: "#3989e8" } }, axisTick: { lineStyle: { color: "#3989e8" } }, axisLabel: { color: TECH_ENGINEERING_DARK_CHART_COLORS.ink, fontSize: 14 }, splitLine: { lineStyle: { color: "#214580", width: 1 } } },
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
