"use client";
import { useCallback } from "react";
import type { DatasetChartCommonProps, DatasetChartState } from "./DatasetChartFrame";
import { DatasetChartFrame } from "./DatasetChartFrame";
import { chartPaletteForVisualStyle, currentVisualStyle } from "../chart-adapters/academic-theme";

export function CorrelationMatrix({ labels, values, ...props }: Omit<DatasetChartCommonProps, "buildOption" | "series"> & { labels: string[]; values: Array<Array<number | null>> }) {
  const palette = chartPaletteForVisualStyle(props.visualStyle ?? currentVisualStyle());
  if (values.length !== labels.length || values.some(row => row.length !== labels.length)) throw new Error("CorrelationMatrix requires a square matrix matching labels");
  if (values.some(row => row.some(v => v !== null && (!Number.isFinite(v) || v < -1 || v > 1)))) throw new Error("Correlation must be finite in [-1, 1], or null for missing");
  const cells = values.flatMap((row, y) => row.flatMap((value, x) => value === null ? [] : [[x, y, value]]));
  const buildOption = useCallback((_state: DatasetChartState) => ({ grid: { left: 110, right: 72, top: 36, bottom: 76, containLabel: true }, tooltip: { formatter: (item: { value: [number, number, number] }) => `${labels[item.value[1]]} × ${labels[item.value[0]]}: ${item.value[2]}` }, xAxis: { type: "category", data: labels, axisLabel: { rotate: labels.length > 8 ? 35 : 0 } }, yAxis: { type: "category", data: labels }, visualMap: { min: -1, max: 1, orient: "horizontal", left: "center", bottom: 8, calculable: false, inRange: { color: palette.diverging } }, series: [{ type: "heatmap", data: cells, label: { show: labels.length <= 10, formatter: ({ value }: { value: [number, number, number] }) => value[2].toFixed(2) }, emphasis: { itemStyle: { borderColor: palette.structure, borderWidth: 2 } } }] }), [cells, labels, palette]);
  return <DatasetChartFrame {...props} buildOption={buildOption} />;
}
