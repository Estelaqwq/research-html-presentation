"use client";

import type { CSSProperties, KeyboardEvent } from "react";
import type { EvidenceAnnotation } from "./EvidenceVisualizationTypes";

function annotationStyle(annotation: EvidenceAnnotation): CSSProperties {
  return {
    left: `${annotation.x * 100}%`,
    top: `${annotation.y * 100}%`,
    width: `${(annotation.width ?? 0.04) * 100}%`,
    height: `${(annotation.height ?? 0.04) * 100}%`,
  };
}

export function EvidenceAnnotationLayer({ annotations, onActivate, label = "科研图像标注" }: {
  annotations: EvidenceAnnotation[];
  onActivate?: (annotation: EvidenceAnnotation) => void;
  label?: string;
}) {
  const activate = (annotation: EvidenceAnnotation) => onActivate?.(annotation);
  const onKeyDown = (event: KeyboardEvent<HTMLElement>, annotation: EvidenceAnnotation) => {
    if (!onActivate || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    activate(annotation);
  };

  return (
    <div className="evidence-annotation-layer" data-annotation-layer="true" aria-label={label}>
      {annotations.map((annotation, index) => (
        <span
          key={annotation.id}
          className={`evidence-annotation ${annotation.critical ? "is-critical" : ""}`}
          style={annotationStyle(annotation)}
          role={onActivate ? "button" : undefined}
          tabIndex={onActivate ? 0 : undefined}
          aria-label={annotation.label}
          onClick={() => activate(annotation)}
          onKeyDown={(event) => onKeyDown(event, annotation)}
        >
          <b>{index + 1}</b><em>{annotation.label}</em>
        </span>
      ))}
    </div>
  );
}
