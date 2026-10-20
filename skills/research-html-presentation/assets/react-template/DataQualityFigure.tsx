import type { VisualEvidenceRecord } from "./EvidenceVisualizationTypes";
import { ScientificEvidenceFigure } from "./ScientificEvidenceFigure";

export function DataQualityFigure({ visual, caption, metrics }: {
  visual: VisualEvidenceRecord & { evidenceType: "A"; defaultState: Record<string, unknown>; printState: Record<string, unknown> };
  caption: string;
  metrics: Array<{ label: string; value: number; display: string; critical?: boolean }>;
}) {
  return (
    <ScientificEvidenceFigure visual={visual} caption={caption} className="data-quality-figure">
      <div className="data-quality-list">
        {metrics.map((metric) => (
          <div key={metric.label} className={metric.critical ? "is-critical" : ""}>
            <span>{metric.label}</span>
            <i aria-hidden="true"><b style={{ width: `${Math.max(0, Math.min(1, metric.value)) * 100}%` }} /></i>
            <strong>{metric.display}</strong>
          </div>
        ))}
      </div>
    </ScientificEvidenceFigure>
  );
}
