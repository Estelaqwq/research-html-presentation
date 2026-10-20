"use client";

import type { ReactNode } from "react";
import type { VisualEvidenceRecord } from "./EvidenceVisualizationTypes";
import { visualClaimIds } from "./EvidenceVisualizationTypes";

export function ScientificEvidenceFigure({
  visual,
  caption,
  sourceLabel,
  ready = true,
  defaultStateLabel,
  resetStateLabel,
  reducedMotionStateLabel,
  printStateLabel,
  captionEditId,
  children,
  className = "",
}: {
  visual: VisualEvidenceRecord;
  caption: string;
  sourceLabel?: string;
  ready?: boolean;
  defaultStateLabel?: string;
  resetStateLabel?: string;
  reducedMotionStateLabel?: string;
  printStateLabel?: string;
  captionEditId?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <figure
      className={`scientific-evidence-figure ${className}`}
      data-audit-box
      data-evidence-visual="true"
      data-visual-id={visual.visualId}
      data-visual-kind={visual.visualKind ?? (visual.evidenceType === "A" ? "data-evidence" : visual.evidenceType === "B" ? "explanatory-structure" : "scientific-evidence")}
      data-evidence-type={visual.evidenceType}
      data-treatment-level={visual.treatmentLevel}
      data-evidence-status={visual.evidenceStatus}
      data-representation-status={visual.representationStatus}
      data-claim-ids={visualClaimIds(visual)}
      data-pixel-immutable={visual.evidenceType === "C" && visual.pixelImmutable ? "true" : undefined}
      data-visual-ready={ready ? "true" : "false"}
      data-default-state={defaultStateLabel ?? (visual.defaultState ? JSON.stringify(visual.defaultState) : undefined)}
      data-reset-state={resetStateLabel ?? (visual.resetState ? JSON.stringify(visual.resetState) : undefined)}
      data-reduced-motion-state={reducedMotionStateLabel ?? (visual.reducedMotionState ? JSON.stringify(visual.reducedMotionState) : undefined)}
      data-print-state={printStateLabel ?? (visual.printState ? JSON.stringify(visual.printState) : undefined)}
    >
      <div className="scientific-evidence-stage">{children}</div>
      <figcaption>
        <span>{caption}</span>
        {sourceLabel ? <small>{sourceLabel}</small> : null}
      </figcaption>
    </figure>
  );
}
