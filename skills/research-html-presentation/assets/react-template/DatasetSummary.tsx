import type { ReactNode } from "react";
import type { VisualEvidenceRecord } from "./EvidenceVisualizationTypes";
import { visualClaimIds } from "./EvidenceVisualizationTypes";

export function DatasetSummary({ visual, datasetId, title = "数据集概况", items, className = "" }: {
  visual: VisualEvidenceRecord & { evidenceType: "A"; defaultState: Record<string, unknown>; printState: Record<string, unknown> };
  datasetId: string;
  title?: string;
  items: Array<{ label: string; value: ReactNode; detail?: ReactNode }>;
  className?: string;
}) {
  return (
    <article
      className={`dataset-summary ${className}`}
      data-audit-box
      data-evidence-visual="true"
      data-visual-id={visual.visualId}
      data-visual-kind="data-evidence"
      data-evidence-type="A"
      data-treatment-level={visual.treatmentLevel}
      data-evidence-status={visual.evidenceStatus}
      data-representation-status={visual.representationStatus}
      data-claim-ids={visualClaimIds(visual)}
      data-visual-ready="true"
      data-default-state={JSON.stringify(visual.defaultState)}
      data-print-state={JSON.stringify(visual.printState)}
      data-dataset-id={datasetId}
    >
      <h3>{title}</h3>
      <dl>
        {items.map((item) => <div key={item.label}><dt>{item.label}</dt><dd><strong>{item.value}</strong>{item.detail ? <span>{item.detail}</span> : null}</dd></div>)}
      </dl>
    </article>
  );
}
