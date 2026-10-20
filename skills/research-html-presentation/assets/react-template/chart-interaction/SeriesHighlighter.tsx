"use client";

import { chartHookAttributes, emitChartRuntimeEvent } from "../chart-adapters/chart-events";

export function SeriesHighlighter({ visualId, hookId, series, active, onChange }: { visualId: string; hookId: string; series: string[]; active?: string; onChange: (series?: string) => void }) {
  return <div className="series-highlighter" role="group" aria-label="系列聚焦">{series.map((name) => <button key={name} type="button" aria-pressed={active === name} {...chartHookAttributes({ visualId, hookId, action: "series-highlight" })} onClick={(event) => { const next = active === name ? undefined : name; onChange(next); emitChartRuntimeEvent(event.currentTarget, { visualId, hookId, action: "series-highlight", payload: next }); }}>{name}</button>)}</div>;
}
