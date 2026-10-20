import type { ChartAction } from "../EvidenceVisualizationTypes";
import { chartHookAttributes } from "../chart-adapters/chart-events";

export function ChartTooltip({ visualId, hookId, label = "精确值", value, action = "tooltip" }: { visualId: string; hookId: string; label?: string; value?: string; action?: Extract<ChartAction, "tooltip" | "fold-tooltip"> }) {
  return <div className="chart-tooltip-summary" data-chart-tooltip="true" tabIndex={0} {...chartHookAttributes({ visualId, hookId, action })} role="status" aria-live="polite"><b>{label}</b><span>{value ?? "使用键盘或指针聚焦数据标记以查看精确值"}</span></div>;
}
