"use client";
import { useCallback } from "react";
import type { DatasetChartCommonProps, DatasetChartState } from "./DatasetChartFrame";
import { DatasetChartFrame } from "./DatasetChartFrame";
import { chartPaletteForVisualStyle, currentVisualStyle } from "../chart-adapters/academic-theme";

export function ThemeMatrix({ rows, columns, cells, valueLabel, ...props }: Omit<DatasetChartCommonProps, "buildOption" | "series"> & { rows: string[]; columns: string[]; cells: Array<{ row: string; column: string; value: number; label?: string }>; valueLabel: string }) {
  const palette = chartPaletteForVisualStyle(props.visualStyle ?? currentVisualStyle());
  const values = cells.map((cell) => cell.value);
  const buildOption = useCallback((_state: DatasetChartState) => ({ grid: { left: 120, right: 60, top: 36, bottom: 72, containLabel: true }, tooltip: { formatter: (item: { data: { value: number[]; label?: string } }) => `${rows[item.data.value[1]]} × ${columns[item.data.value[0]]}: ${item.data.label ?? item.data.value[2]}` }, xAxis: { type: "category", data: columns }, yAxis: { type: "category", data: rows }, visualMap: { min: Math.min(...values), max: Math.max(...values), orient: "horizontal", bottom: 8, left: "center", text: [valueLabel, ""], inRange: { color: palette.sequential } }, series: [{ type: "heatmap", data: cells.map((cell) => ({ value: [columns.indexOf(cell.column), rows.indexOf(cell.row), cell.value], label: cell.label })), emphasis: { itemStyle: { borderColor: palette.structure, borderWidth: 2 } } }] }), [cells, columns, palette, rows, valueLabel, values]);
  return <DatasetChartFrame {...props} buildOption={buildOption} />;
}
