"use client";
import { useCallback } from "react";
import type { DatasetChartCommonProps, DatasetChartState } from "./DatasetChartFrame";
import { DatasetChartFrame } from "./DatasetChartFrame";
import { distributionValue } from "./scientific-models";

export function DistributionChart({ bins, xLabel, yLabel = "频数", missingPolicy = "gap", ...props }: Omit<DatasetChartCommonProps, "buildOption" | "series"> & { bins: Array<{ bin: string; count: number | null; group?: string }>; xLabel: string; yLabel?: string; missingPolicy?: "gap" | "zero" }) {
  const groups = [...new Set(bins.map((item) => item.group ?? "总体"))];
  const categories = [...new Set(bins.map((item) => item.bin))];
  const buildOption = useCallback((state: DatasetChartState) => ({ grid: { left: 72, right: 36, top: 48, bottom: 64, containLabel: true }, tooltip: { trigger: "axis" }, legend: { show: groups.length > 1, top: 4 }, xAxis: { type: "category", name: xLabel, data: categories }, yAxis: { type: "value", name: yLabel, min: 0 }, series: groups.map((group) => ({ name: group, type: "bar", barGap: "8%", itemStyle: { opacity: !state.series || state.series === group ? .9 : .24 }, data: categories.map((bin) => distributionValue(bins, bin, group, missingPolicy)) })) }), [bins, categories, groups, xLabel, yLabel, missingPolicy]);
  return <DatasetChartFrame {...props} series={groups} buildOption={buildOption} />;
}
