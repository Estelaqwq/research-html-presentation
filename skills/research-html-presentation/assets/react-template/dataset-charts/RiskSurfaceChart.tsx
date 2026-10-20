"use client";
import { useCallback } from "react";
import type { DatasetChartCommonProps, DatasetChartState } from "./DatasetChartFrame";
import { DatasetChartFrame } from "./DatasetChartFrame";
import { chartPaletteForVisualStyle, currentVisualStyle } from "../chart-adapters/academic-theme";

export function RiskSurfaceChart({ points, xLabel, yLabel, riskLabel = "风险", domains, ...props }: Omit<DatasetChartCommonProps, "buildOption" | "series"> & { points: Array<{ x: number; y: number; risk: number; label?: string }>; xLabel: string; yLabel: string; riskLabel?: string; domains?: { x?: [number, number]; y?: [number, number]; risk?: [number, number] } }) {
  const palette = chartPaletteForVisualStyle(props.visualStyle ?? currentVisualStyle());
  const buildOption = useCallback((_state: DatasetChartState) => ({ grid: { left: 82, right: 92, top: 34, bottom: 62, containLabel: true }, tooltip: { formatter: (item: { data: { value: number[]; name?: string } }) => `${item.data.name ?? ""}<br>${xLabel}: ${item.data.value[0]}<br>${yLabel}: ${item.data.value[1]}<br>${riskLabel}: ${item.data.value[2]}` }, xAxis: { type: "value", name: xLabel, min: domains?.x?.[0], max: domains?.x?.[1] }, yAxis: { type: "value", name: yLabel, min: domains?.y?.[0], max: domains?.y?.[1] }, visualMap: { min: domains?.risk?.[0] ?? Math.min(...points.map((point) => point.risk)), max: domains?.risk?.[1] ?? Math.max(...points.map((point) => point.risk)), right: 4, top: "middle", inRange: { color: palette.sequential }, text: [riskLabel, ""] }, series: [{ type: "scatter", symbolSize: 16, data: points.map((point) => ({ name: point.label, value: [point.x, point.y, point.risk] })) }] }), [domains, palette, points, riskLabel, xLabel, yLabel]);
  return <DatasetChartFrame {...props} buildOption={buildOption} />;
}
