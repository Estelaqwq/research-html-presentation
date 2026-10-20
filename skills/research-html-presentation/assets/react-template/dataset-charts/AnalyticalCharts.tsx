"use client";

import { useCallback } from "react";
import type { DatasetChartCommonProps, DatasetChartState } from "./DatasetChartFrame";
import { DatasetChartFrame } from "./DatasetChartFrame";
import { slopeAxis } from "./scientific-models";
import { chartPaletteForVisualStyle, currentVisualStyle } from "../chart-adapters/academic-theme";

type BaseProps = Omit<DatasetChartCommonProps, "buildOption" | "series">;

export function LollipopChart({ data, valueLabel, ...props }: BaseProps & { data: Array<{ category: string; value: number }>; valueLabel: string }) {
  const palette = chartPaletteForVisualStyle(props.visualStyle ?? currentVisualStyle());
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const buildOption = useCallback((_state: DatasetChartState) => ({ grid: { left: 138, right: 64, top: 34, bottom: 48, containLabel: true }, tooltip: { trigger: "item" }, xAxis: { type: "value", name: valueLabel, min: 0 }, yAxis: { type: "category", inverse: true, data: sorted.map((item) => item.category) }, series: [{ type: "bar", data: sorted.map((item) => item.value), barWidth: 2, itemStyle: { color: palette.supporting }, silent: true }, { type: "scatter", symbolSize: 13, data: sorted.map((item, index) => ({ value: [item.value, index], itemStyle: { color: index === 0 ? palette.decisive : palette.primary }, label: { show: true, position: "right", formatter: String(item.value), fontSize: 14 } })) }] }), [palette, sorted, valueLabel]);
  return <DatasetChartFrame {...props} series={[valueLabel]} buildOption={buildOption} />;
}

export function ScatterEvidenceChart({ data, xLabel, yLabel, ...props }: BaseProps & { data: Array<{ x: number; y: number; label: string; decisive?: boolean }>; xLabel: string; yLabel: string }) {
  const palette = chartPaletteForVisualStyle(props.visualStyle ?? currentVisualStyle());
  const buildOption = useCallback((_state: DatasetChartState) => ({ grid: { left: 72, right: 44, top: 30, bottom: 58, containLabel: true }, tooltip: { formatter: (item: { data: { value: [number, number]; name: string } }) => `${item.data.name}<br/>${xLabel}: ${item.data.value[0]}<br/>${yLabel}: ${item.data.value[1]}` }, xAxis: { type: "value", name: xLabel, nameLocation: "middle", nameGap: 38 }, yAxis: { type: "value", name: yLabel }, series: [{ type: "scatter", symbolSize: 15, data: data.map((item) => ({ name: item.label, value: [item.x, item.y], itemStyle: { color: item.decisive ? palette.decisive : palette.primary }, label: { show: item.decisive, position: "top", formatter: item.label, fontSize: 14, fontWeight: 700 } })) }] }), [data, palette, xLabel, yLabel]);
  return <DatasetChartFrame {...props} series={[`${xLabel}×${yLabel}`]} buildOption={buildOption} />;
}

export function DumbbellChart({ data, leftLabel, rightLabel, ...props }: BaseProps & { data: Array<{ category: string; left: number; right: number }>; leftLabel: string; rightLabel: string }) {
  const palette = chartPaletteForVisualStyle(props.visualStyle ?? currentVisualStyle());
  const buildOption = useCallback((_state: DatasetChartState) => ({ grid: { left: 130, right: 58, top: 42, bottom: 48, containLabel: true }, tooltip: { trigger: "axis" }, legend: { data: [leftLabel, rightLabel] }, xAxis: { type: "value" }, yAxis: { type: "category", data: data.map((item) => item.category) }, series: [{ name: "差距", type: "custom", silent: true, renderItem: (params: any, api: any) => { const y = api.coord([0, api.value(2)])[1]; const a = api.coord([api.value(0), api.value(2)])[0]; const b = api.coord([api.value(1), api.value(2)])[0]; return { type: "line", shape: { x1: a, y1: y, x2: b, y2: y }, style: { stroke: palette.supporting, lineWidth: 5 } }; }, encode: { x: [0, 1], y: 2 }, data: data.map((item, index) => [item.left, item.right, index]) }, { name: leftLabel, type: "scatter", symbolSize: 12, itemStyle: { color: palette.secondary }, data: data.map((item, index) => [item.left, index]) }, { name: rightLabel, type: "scatter", symbolSize: 14, itemStyle: { color: palette.primary }, data: data.map((item, index) => [item.right, index]) }] }), [data, leftLabel, palette, rightLabel]);
  return <DatasetChartFrame {...props} series={[leftLabel, rightLabel]} buildOption={buildOption} />;
}

export function Slopegraph({ data, leftLabel, rightLabel, valueMode = "numeric", ...props }: BaseProps & { data: Array<{ category: string; left: number; right: number; decisive?: boolean }>; leftLabel: string; rightLabel: string; valueMode?: "numeric" | "rank" }) {
  const palette = chartPaletteForVisualStyle(props.visualStyle ?? currentVisualStyle());
  const buildOption = useCallback((_state: DatasetChartState) => ({ grid: { left: 86, right: 86, top: 48, bottom: 42, containLabel: true }, tooltip: { trigger: "item" }, xAxis: { type: "category", data: [leftLabel, rightLabel], position: "top", axisTick: { show: false } }, yAxis: slopeAxis(valueMode), series: data.map((item) => ({ name: item.category, type: "line", symbolSize: item.decisive ? 11 : 8, lineStyle: { width: item.decisive ? 4 : 2, color: item.decisive ? palette.decisive : palette.secondary }, itemStyle: { color: item.decisive ? palette.decisive : palette.primary }, label: { show: true, formatter: item.category, position: "right", fontSize: 13 }, data: [item.left, item.right] })) }), [data, leftLabel, palette, rightLabel, valueMode]);
  return <DatasetChartFrame {...props} series={data.map((item) => item.category)} buildOption={buildOption} />;
}

export function CorrelationDotPlot({ data, ...props }: BaseProps & { data: Array<{ variable: string; coefficient: number; decisive?: boolean }> }) {
  const palette = chartPaletteForVisualStyle(props.visualStyle ?? currentVisualStyle());
  const buildOption = useCallback((_state: DatasetChartState) => ({ grid: { left: 150, right: 70, top: 30, bottom: 52, containLabel: true }, tooltip: { formatter: (item: { name: string; value: number }) => `${item.name}: ${Number(item.value).toFixed(2)}` }, xAxis: { type: "value", min: -1, max: 1, name: "相关系数", splitNumber: 4 }, yAxis: { type: "category", data: data.map((item) => item.variable) }, series: [{ type: "scatter", symbolSize: 15, data: data.map((item, index) => ({ name: item.variable, value: [item.coefficient, index], itemStyle: { color: item.decisive ? palette.decisive : palette.primary }, label: { show: true, position: item.coefficient >= 0 ? "right" : "left", formatter: item.coefficient.toFixed(2), fontSize: 14 } })), markLine: { silent: true, symbol: "none", label: { show: false }, data: [{ xAxis: 0 }] } }] }), [data, palette]);
  return <DatasetChartFrame {...props} series={["相关系数"]} buildOption={buildOption} />;
}
