"use client";

import type { ChartAction } from "../EvidenceVisualizationTypes";
import { chartHookAttributes, emitChartRuntimeEvent } from "../chart-adapters/chart-events";

export function MetricSwitcher({ visualId, hookId, label = "指标", value, options, onChange, action = "metric-switch" }: { visualId: string; hookId: string; label?: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void; action?: Extract<ChartAction, "metric-switch" | "model-switch"> }) {
  return <label className="metric-switcher"><span>{label}</span><select value={value} {...chartHookAttributes({ visualId, hookId, action })} onChange={(event) => { onChange(event.target.value); emitChartRuntimeEvent(event.currentTarget, { visualId, hookId, action, payload: event.target.value }); }}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}
