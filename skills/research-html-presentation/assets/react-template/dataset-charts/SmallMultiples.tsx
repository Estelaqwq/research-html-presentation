"use client";
import { useCallback } from "react";
import type { DatasetChartCommonProps, DatasetChartState } from "./DatasetChartFrame";
import { DatasetChartFrame } from "./DatasetChartFrame";

export function SmallMultiples({ panels, valueLabel, sharedDomain, ...props }: Omit<DatasetChartCommonProps, "buildOption" | "series"> & { panels: Array<{ title: string; categories: string[]; values: number[] }>; valueLabel: string; sharedDomain?: [number, number] }) {
  const columns = Math.min(3, Math.max(1, panels.length)); const rows = Math.ceil(panels.length / columns);
  const buildOption = useCallback((_state: DatasetChartState) => ({ tooltip: { trigger: "axis" }, title: panels.map((panel, index) => ({ text: panel.title, left: `${(index % columns) * (100 / columns) + 2}%`, top: `${Math.floor(index / columns) * (100 / rows)}%`, textStyle: { fontSize: 15 } })), grid: panels.map((_panel, index) => ({ left: `${(index % columns) * (100 / columns) + 3}%`, top: `${Math.floor(index / columns) * (100 / rows) + 9}%`, width: `${100 / columns - 7}%`, height: `${100 / rows - 15}%`, containLabel: true })), xAxis: panels.map((panel, index) => ({ type: "category", gridIndex: index, data: panel.categories, axisLabel: { interval: 0, hideOverlap: true } })), yAxis: panels.map((_panel, index) => ({ type: "value", gridIndex: index, name: index === 0 ? valueLabel : undefined, min: sharedDomain?.[0], max: sharedDomain?.[1] })), series: panels.map((panel, index) => ({ type: "bar", name: panel.title, xAxisIndex: index, yAxisIndex: index, data: panel.values })) }), [columns, panels, rows, sharedDomain, valueLabel]);
  return <DatasetChartFrame {...props} buildOption={buildOption} />;
}
