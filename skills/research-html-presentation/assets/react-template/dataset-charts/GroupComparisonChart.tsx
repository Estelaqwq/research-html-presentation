"use client";
import { useCallback } from "react";
import type { DatasetChartCommonProps, DatasetChartState } from "./DatasetChartFrame";
import { DatasetChartFrame } from "./DatasetChartFrame";

export function GroupComparisonChart({ data, valueLabel, valueLabels, domain, domains, metrics = [], ...props }: Omit<DatasetChartCommonProps, "buildOption" | "series" | "metrics"> & { data: Array<{ category: string; series: string; value: number; metric?: string }>; valueLabel: string; valueLabels?: Record<string, string>; domain?: [number, number]; domains?: Record<string, [number, number]>; metrics?: Array<{ value: string; label: string }> }) {
  const categories = [...new Set(data.map((item) => item.category))]; const names = [...new Set(data.map((item) => item.series))];
  const buildOption = useCallback((state: DatasetChartState) => { const metric = String(state.metric ?? metrics[0]?.value ?? ""); const selected = metric ? data.filter((item) => (item.metric ?? metric) === metric) : data; const axisLabel = valueLabels?.[metric] ?? valueLabel; const activeDomain = domains?.[metric] ?? domain; return { grid: { left: 76, right: 40, top: 52, bottom: 58, containLabel: true }, tooltip: { trigger: "axis" }, legend: { top: 4 }, xAxis: { type: "category", data: categories }, yAxis: { type: "value", name: axisLabel, min: activeDomain?.[0] ?? 0, max: activeDomain?.[1] }, series: names.map((name) => ({ name, type: "bar", data: categories.map((category) => selected.find((item) => item.category === category && item.series === name)?.value ?? null), itemStyle: { opacity: !state.series || state.series === name ? .9 : .22 } })) }; }, [categories, data, domain, domains, metrics, names, valueLabel, valueLabels]);
  return <DatasetChartFrame {...props} metrics={metrics} series={names} buildOption={buildOption} />;
}
