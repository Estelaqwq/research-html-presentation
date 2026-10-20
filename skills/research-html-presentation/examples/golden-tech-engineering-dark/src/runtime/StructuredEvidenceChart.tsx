"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { EvidenceChartAdapter, EvidenceChartController, VisualEvidenceRecord } from "./EvidenceVisualizationTypes";
import { ScientificEvidenceFigure } from "./ScientificEvidenceFigure";
import { chartThemeForVisualStyle, currentVisualStyle } from "./chart-adapters/academic-theme";

export function StructuredEvidenceChart({
  visual,
  adapter,
  defaultOption,
  printOption,
  caption,
  sourceLabel,
  accessibleSummary,
  controls,
  renderer = "svg",
  defaultStateLabel,
  resetStateLabel,
  reducedMotionStateLabel,
  printStateLabel,
  events = [],
  theme,
}: {
  visual: VisualEvidenceRecord & { evidenceType: "A"; defaultState: Record<string, unknown>; printState: Record<string, unknown> };
  adapter: EvidenceChartAdapter;
  defaultOption: Record<string, unknown>;
  printOption: Record<string, unknown>;
  caption: string;
  sourceLabel?: string;
  accessibleSummary: string;
  controls?: ReactNode;
  renderer?: "svg" | "canvas";
  defaultStateLabel?: string;
  resetStateLabel?: string;
  reducedMotionStateLabel?: string;
  printStateLabel?: string;
  events?: Array<{ name: string; handler: (payload: unknown) => void }>;
  theme?: string | object;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<EvidenceChartController | null>(null);
  const optionRef = useRef({ defaultOption, printOption });
  const eventsRef = useRef(events);
  const themeRef = useRef(theme ?? chartThemeForVisualStyle(currentVisualStyle()));
  optionRef.current = { defaultOption, printOption };
  eventsRef.current = events;
  themeRef.current = theme ?? chartThemeForVisualStyle(currentVisualStyle());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const element = hostRef.current;
    if (!element) return;
    let cancelled = false;
    const printMode = new URLSearchParams(window.location.search).get("print") === "1";
    const eventProxies = eventsRef.current.map(({ name }) => ({ name, handler: (payload: unknown) => eventsRef.current.find((event) => event.name === name)?.handler(payload) }));
    setReady(false);
    setError("");
    void adapter.render({ element, option: printMode ? optionRef.current.printOption : optionRef.current.defaultOption, renderer, theme: themeRef.current, events: eventProxies }).then((controller) => {
      if (cancelled) {
        controller.dispose();
        return;
      }
      controllerRef.current = controller;
      requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
    }).catch((reason) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
    });
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => controllerRef.current?.resize?.());
    observer?.observe(element);
    return () => {
      cancelled = true;
      observer?.disconnect();
      controllerRef.current?.dispose();
      controllerRef.current = null;
    };
  }, [adapter, renderer]);

  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller?.setOption) return;
    const printMode = new URLSearchParams(window.location.search).get("print") === "1";
    setReady(false);
    controller.setOption(printMode ? printOption : defaultOption, true);
    requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
  }, [defaultOption, printOption]);

  return (
    <ScientificEvidenceFigure
      visual={visual}
      caption={caption}
      sourceLabel={sourceLabel}
      ready={ready && !error}
      defaultStateLabel={defaultStateLabel}
      resetStateLabel={resetStateLabel}
      reducedMotionStateLabel={reducedMotionStateLabel}
      printStateLabel={printStateLabel}
      className="structured-evidence-chart"
    >
      {controls ? <div className="chart-control-bar" data-chart-control="true">{controls}</div> : null}
      <div ref={hostRef} className="evidence-chart-canvas" role="img" aria-label={accessibleSummary} />
      <p className="evidence-chart-summary" data-accessible-summary="true">{accessibleSummary}</p>
      {error ? <p className="evidence-visual-error" role="alert">图表未就绪：{error}</p> : null}
    </ScientificEvidenceFigure>
  );
}
