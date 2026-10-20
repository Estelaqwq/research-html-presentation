"use client";

import { chartHookAttributes, emitChartRuntimeEvent } from "../chart-adapters/chart-events";

export function ChartReset({ visualId, hookId, onReset, label = "重置" }: { visualId: string; hookId: string; onReset: () => void; label?: string }) {
  return <button type="button" className="chart-reset" {...chartHookAttributes({ visualId, hookId, action: "reset" })} onClick={(event) => { onReset(); emitChartRuntimeEvent(event.currentTarget, { visualId, hookId, action: "reset" }); }}>{label}</button>;
}
