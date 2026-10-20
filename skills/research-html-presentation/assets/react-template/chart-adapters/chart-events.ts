import type { ChartAction } from "../EvidenceVisualizationTypes";

export type ChartRuntimeEvent = { visualId: string; action: ChartAction; hookId: string; payload?: unknown };

export function chartHookAttributes(event: Omit<ChartRuntimeEvent, "payload">) {
  return {
    "data-runtime-hook": event.hookId,
    "data-chart-action": event.action,
    "data-visual-id": event.visualId,
  };
}

export function emitChartRuntimeEvent(target: EventTarget, detail: ChartRuntimeEvent) {
  target.dispatchEvent(new CustomEvent<ChartRuntimeEvent>("research-chart-action", { bubbles: true, detail }));
}

export function prefersReducedChartMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}
