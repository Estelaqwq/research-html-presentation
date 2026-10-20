"use client";
import { useCallback } from "react";
import type { DatasetChartCommonProps, DatasetChartState } from "./DatasetChartFrame";
import { DatasetChartFrame } from "./DatasetChartFrame";

export function TimeSeriesChart({ data, valueLabel, domain, ...props }: Omit<DatasetChartCommonProps, "buildOption" | "series"> & { data: Array<{ time: string | number; series: string; value: number }>; valueLabel: string; domain?: [number, number] }) {
  const times = [...new Set(data.map((item) => item.time))]; const names = [...new Set(data.map((item) => item.series))];
  const buildOption = useCallback((state: DatasetChartState) => ({ grid: { left: 76, right: 44, top: 52, bottom: 64, containLabel: true }, tooltip: { trigger: "axis" }, legend: { top: 4 }, xAxis: { type: "category", boundaryGap: false, data: times }, yAxis: { type: "value", name: valueLabel, min: domain?.[0], max: domain?.[1] }, series: names.map((name) => ({ name, type: "line", showSymbol: true, smooth: false, emphasis: { focus: "series" }, lineStyle: { width: state.series === name ? 4 : 3, opacity: !state.series || state.series === name ? 1 : .22 }, data: times.map((time) => data.find((item) => item.time === time && item.series === name)?.value ?? null) })) }), [data, domain, names, times, valueLabel]);
  return <DatasetChartFrame {...props} series={names} buildOption={buildOption} />;
}
