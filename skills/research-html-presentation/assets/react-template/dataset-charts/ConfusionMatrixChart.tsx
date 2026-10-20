"use client";
import { useCallback } from "react";
import type { DatasetChartCommonProps, DatasetChartState } from "./DatasetChartFrame";
import { DatasetChartFrame } from "./DatasetChartFrame";
import { chartPaletteForVisualStyle, currentVisualStyle } from "../chart-adapters/academic-theme";

export function ConfusionMatrixChart({ labels, matrix, valueLabel = "样本数", ...props }: Omit<DatasetChartCommonProps, "buildOption" | "series"> & { labels: string[]; matrix: number[][]; valueLabel?: string }) {
  const palette = chartPaletteForVisualStyle(props.visualStyle ?? currentVisualStyle());
  const cells = matrix.flatMap((row, actual) => row.map((value, predicted) => [predicted, actual, value])); const maximum = Math.max(...cells.map((cell) => cell[2]));
  const buildOption = useCallback((_state: DatasetChartState) => ({ grid: { left: 112, right: 60, top: 34, bottom: 78, containLabel: true }, tooltip: { formatter: (item: { value: number[] }) => `实际 ${labels[item.value[1]]} / 预测 ${labels[item.value[0]]}: ${item.value[2]} ${valueLabel}` }, xAxis: { type: "category", name: "预测类别", data: labels }, yAxis: { type: "category", name: "实际类别", data: labels }, visualMap: { min: 0, max: maximum, orient: "horizontal", bottom: 8, left: "center", inRange: { color: palette.sequential } }, series: [{ type: "heatmap", data: cells, label: { show: true, fontSize: 14 } }] }), [cells, labels, maximum, palette, valueLabel]);
  return <DatasetChartFrame {...props} buildOption={buildOption} />;
}
