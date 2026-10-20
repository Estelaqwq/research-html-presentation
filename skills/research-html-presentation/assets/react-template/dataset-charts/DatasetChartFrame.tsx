"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { ChartAction, ChartEvidenceSpec, EvidenceChartAdapter, VisualEvidenceRecord } from "../EvidenceVisualizationTypes";
import { StructuredEvidenceChart } from "../StructuredEvidenceChart";
import { academicMotion, chartPaletteForVisualStyle, chartThemeForVisualStyle, currentVisualStyle } from "../chart-adapters/academic-theme";
import type { VisualStyle } from "../visual-style";
import { chartHookAttributes, emitChartRuntimeEvent, prefersReducedChartMotion } from "../chart-adapters/chart-events";
import { ChartAnnotation, ChartReset, ChartTooltip, LinkedEvidencePanel, MetricSwitcher, SeriesHighlighter } from "../chart-interaction";

export type DatasetChartState = Record<string, unknown>;
export type DatasetChartCommonProps = {
  visual: VisualEvidenceRecord & { evidenceType: "A"; defaultState: Record<string, unknown>; printState: Record<string, unknown> };
  spec: ChartEvidenceSpec;
  adapter: EvidenceChartAdapter;
  caption: string;
  sourceLabel?: string;
  renderer?: "svg" | "canvas";
  visualStyle?: VisualStyle;
  metrics?: Array<{ value: string; label: string }>;
  series?: string[];
  linkedEvidence?: (state: DatasetChartState) => { title?: string; evidence: string; source?: string } | undefined;
  detailActions?: Partial<Record<Extract<ChartAction, "point-detail" | "cell-detail" | "confusion-detail" | "linked-evidence">, { label: string; onActivate: (state: DatasetChartState) => void }>>;
  buildOption: (state: DatasetChartState, reducedMotion: boolean) => Record<string, unknown>;
};

function hookFor(spec: ChartEvidenceSpec, action: ChartAction) {
  const index = spec.interactionSpec.actions.indexOf(action);
  return spec.interactionSpec.runtimeHooks[index] ?? `${spec.dataRef.analysisId ?? spec.dataRef.datasetId}:${action}`;
}

export function DatasetChartFrame({ visual, spec, adapter, caption, sourceLabel, renderer = "svg", metrics = [], series = [], linkedEvidence, detailActions = {}, buildOption, visualStyle }: DatasetChartCommonProps) {
  const [state, setState] = useState<DatasetChartState>(spec.defaultState);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [tooltipValue, setTooltipValue] = useState<string>();
  const printMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("print") === "1";
  const selectedVisualStyle = visualStyle ?? currentVisualStyle();
  const chartPalette = chartPaletteForVisualStyle(selectedVisualStyle);

  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(prefersReducedChartMotion());
    update();
    query?.addEventListener?.("change", update);
    return () => query?.removeEventListener?.("change", update);
  }, []);

  const liveState = printMode ? spec.printState : reducedMotion ? spec.reducedMotionState : state;
  const defaultOption = useMemo(() => ({ ...academicMotion(reducedMotion, spec.motionSpec.durationMs), ...buildOption(liveState, reducedMotion) }), [buildOption, liveState, reducedMotion, spec.motionSpec.durationMs]);
  const printOption = useMemo(() => ({ ...academicMotion(true, 0), ...buildOption(spec.printState, true) }), [buildOption, spec.printState]);
  const events = useMemo(() => [
    { name: "mouseover", handler: (payload: unknown) => { const item = payload as { name?: string; seriesName?: string; value?: unknown }; setTooltipValue([item.seriesName, item.name, Array.isArray(item.value) ? item.value.join(" · ") : item.value].filter((value) => value !== undefined && value !== "").join(" · ")); } },
    { name: "mouseout", handler: () => setTooltipValue(undefined) },
  ], []);
  const activeMetric = String(liveState.metric ?? metrics[0]?.value ?? "");
  const activeSeries = typeof liveState.series === "string" ? liveState.series : undefined;
  const evidence = linkedEvidence?.(liveState);
  const annotations = spec.annotationTargets;
  const switchAction: Extract<ChartAction, "metric-switch" | "model-switch"> = spec.interactionSpec.actions.includes("model-switch") ? "model-switch" : "metric-switch";
  const tooltipAction: Extract<ChartAction, "tooltip" | "fold-tooltip"> = spec.interactionSpec.actions.includes("fold-tooltip") ? "fold-tooltip" : "tooltip";

  const controls = spec.interactionSpec.enabled ? <>
    {metrics.length > 1 && spec.interactionSpec.actions.includes(switchAction) ? <MetricSwitcher visualId={visual.visualId} hookId={hookFor(spec, switchAction)} action={switchAction} label={switchAction === "model-switch" ? "模型" : "指标"} value={activeMetric} options={metrics} onChange={(metric) => setState((current) => ({ ...current, metric }))} /> : null}
    {series.length > 1 && spec.interactionSpec.actions.includes("series-highlight") ? <SeriesHighlighter visualId={visual.visualId} hookId={hookFor(spec, "series-highlight")} series={series} active={activeSeries} onChange={(nextSeries) => setState((current) => ({ ...current, series: nextSeries }))} /> : null}
    {spec.interactionSpec.actions.includes("reset") ? <ChartReset visualId={visual.visualId} hookId={hookFor(spec, "reset")} onReset={() => setState(spec.resetState)} /> : null}
    {(Object.entries(detailActions) as Array<[Extract<ChartAction, "point-detail" | "cell-detail" | "confusion-detail" | "linked-evidence">, { label: string; onActivate: (state: DatasetChartState) => void }]>).filter(([action]) => spec.interactionSpec.actions.includes(action)).map(([action, detail]) => <button key={action} type="button" {...chartHookAttributes({ visualId: visual.visualId, hookId: hookFor(spec, action), action })} onClick={(event) => { detail.onActivate(liveState); emitChartRuntimeEvent(event.currentTarget, { visualId: visual.visualId, hookId: hookFor(spec, action), action, payload: liveState }); }}>{detail.label}</button>)}
  </> : undefined;

  return <div className="dataset-chart-frame" data-chart-current-state={JSON.stringify(liveState)} data-chart-mode={printMode ? "print" : reducedMotion ? "reduced-motion" : "live"} data-visual-style={selectedVisualStyle} style={{ "--chart-decisive": chartPalette.decisive } as CSSProperties}>
    <StructuredEvidenceChart visual={{ ...visual, resetState: spec.resetState, reducedMotionState: spec.reducedMotionState }} adapter={adapter} defaultOption={defaultOption} printOption={printOption} caption={caption} sourceLabel={sourceLabel} accessibleSummary={spec.accessibleSummary} controls={controls} renderer={renderer} events={events} theme={chartThemeForVisualStyle(selectedVisualStyle)} />
    {spec.interactionSpec.actions.includes(tooltipAction) ? <ChartTooltip visualId={visual.visualId} hookId={hookFor(spec, tooltipAction)} action={tooltipAction} label={tooltipAction === "fold-tooltip" ? "折叠验证值" : "精确值"} value={tooltipValue} /> : null}
    {annotations.length ? <div className="chart-annotation-list">{annotations.map((annotation, index) => <ChartAnnotation key={annotation.id} label={annotation.label} detail={annotation.detail ?? (index === 0 ? spec.visualThesis : "")} critical={annotation.critical ?? index === 0} />)}</div> : null}
    {evidence ? <LinkedEvidencePanel {...evidence} /> : null}
  </div>;
}
