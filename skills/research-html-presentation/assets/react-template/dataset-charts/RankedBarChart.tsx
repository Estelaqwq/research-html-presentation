"use client";
import { useCallback } from "react";
import type { DatasetChartCommonProps, DatasetChartState } from "./DatasetChartFrame";
import { DatasetChartFrame } from "./DatasetChartFrame";
import { chartPaletteForVisualStyle, currentVisualStyle } from "../chart-adapters/academic-theme";

export function RankedBarChart({ data, valueLabel, domain, baseline, ...props }: Omit<DatasetChartCommonProps, "buildOption" | "series"> & { data: Array<{ category: string; value: number }>; valueLabel: string; domain?: [number, number]; baseline?: number }) {
  const palette = chartPaletteForVisualStyle(props.visualStyle ?? currentVisualStyle());
  const buildOption = useCallback((_state: DatasetChartState) => ({
    grid: { left: 150, right: 64, top: 40, bottom: 48, containLabel: true }, tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    xAxis: { type: "value", name: valueLabel, min: domain?.[0] ?? 0, max: domain?.[1] }, yAxis: { type: "category", data: data.map((item) => item.category), inverse: true },
    series: [{ name: valueLabel, type: "bar", data: data.map((item, index) => ({ value: item.value, itemStyle: { color: index === 0 ? palette.decisive : palette.primary, opacity: index === 0 ? 1 : .78 } })), label: { show: true, position: "right", fontSize: 14 }, markLine: baseline === undefined ? undefined : { silent: true, symbol: "none", label: { formatter: `${props.spec.comparisonBaseline}: {c}` }, data: [{ xAxis: baseline }] } }],
  }), [baseline, data, domain, palette, props.spec.comparisonBaseline, valueLabel]);
  return <DatasetChartFrame {...props} series={[valueLabel]} buildOption={buildOption} />;
}
