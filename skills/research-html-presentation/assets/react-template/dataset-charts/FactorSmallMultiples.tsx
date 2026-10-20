"use client";
import { useCallback } from "react";
import type { DatasetChartCommonProps, DatasetChartState } from "./DatasetChartFrame";
import { DatasetChartFrame } from "./DatasetChartFrame";

export function FactorSmallMultiples({ data, valueLabel, ...props }: Omit<DatasetChartCommonProps, "buildOption" | "series"> & { data: Array<{ factor: string; group: string; value: number }>; valueLabel: string }) {
  const factors = [...new Set(data.map((item) => item.factor))]; const groups = [...new Set(data.map((item) => item.group))];
  const buildOption = useCallback((state: DatasetChartState) => ({ grid: { left: 130, right: 50, top: 50, bottom: 48, containLabel: true }, tooltip: { trigger: "axis" }, legend: { top: 4 }, xAxis: { type: "value", name: valueLabel }, yAxis: { type: "category", inverse: true, data: factors }, series: groups.map((group) => ({ name: group, type: "bar", data: factors.map((factor) => data.find((item) => item.factor === factor && item.group === group)?.value ?? null), itemStyle: { opacity: !state.series || state.series === group ? .88 : .22 } })) }), [data, factors, groups, valueLabel]);
  return <DatasetChartFrame {...props} series={groups} buildOption={buildOption} />;
}
