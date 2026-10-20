import type { EvidenceChartAdapter } from "../EvidenceVisualizationTypes";
import { ZUEL_ACADEMIC_CHART_THEME } from "./academic-theme";

type EChartsInstance = {
  setOption: (option: Record<string, unknown>, notMerge?: boolean) => void;
  dispatchAction?: (action: Record<string, unknown>) => void;
  on?: (name: string, handler: (payload: unknown) => void) => void;
  off?: (name: string, handler?: (payload: unknown) => void) => void;
  resize: () => void;
  dispose: () => void;
};
export type EChartsModule = {
  init: (element: HTMLElement, theme?: string | object, options?: { renderer?: "svg" | "canvas" }) => EChartsInstance;
  getInstanceByDom?: (element: HTMLElement) => EChartsInstance | undefined;
};

export function createEChartsAdapter(module: unknown): EvidenceChartAdapter {
  // The generated project imports its local `echarts` dependency and passes the module here.
  // Keeping the import outside this reusable file lets non-chart projects compile without ECharts.
  const candidate = module as EChartsModule | { default: EChartsModule };
  const echarts = "default" in candidate ? candidate.default : candidate;
  return {
    async render({ element, option, renderer, theme = ZUEL_ACADEMIC_CHART_THEME, events = [] }) {
      echarts.getInstanceByDom?.(element)?.dispose();
      const instance = echarts.init(element, theme, { renderer });
      instance.setOption(option, true);
      events.forEach(({ name, handler }) => instance.on?.(name, handler));
      return {
        dispose: () => {
          events.forEach(({ name, handler }) => instance.off?.(name, handler));
          instance.dispose();
        },
        resize: () => instance.resize(),
        setOption: (nextOption, replace = true) => instance.setOption(nextOption, replace),
        dispatchAction: (action) => instance.dispatchAction?.(action),
      };
    },
  };
}
