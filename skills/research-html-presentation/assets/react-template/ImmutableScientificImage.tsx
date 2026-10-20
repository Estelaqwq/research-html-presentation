"use client";

import { useState } from "react";
import type { EvidenceAnnotation, VisualEvidenceRecord } from "./EvidenceVisualizationTypes";
import { EvidenceAnnotationLayer } from "./EvidenceAnnotationLayer";
import { ScientificEvidenceFigure } from "./ScientificEvidenceFigure";

export function ImmutableScientificImage({
  visual,
  src,
  alt,
  caption,
  sourceLabel,
  annotations = [],
  onAnnotationActivate,
  className = "",
}: {
  visual: VisualEvidenceRecord & { evidenceType: "C"; pixelImmutable: true };
  src: string;
  alt: string;
  caption: string;
  sourceLabel?: string;
  annotations?: EvidenceAnnotation[];
  onAnnotationActivate?: (annotation: EvidenceAnnotation) => void;
  className?: string;
}) {
  const [ready, setReady] = useState(false);
  return (
    <ScientificEvidenceFigure visual={visual} caption={caption} sourceLabel={sourceLabel} ready={ready} className={`immutable-scientific-image ${className}`}>
      <div className="evidence-image-frame">
        <img
          src={src}
          alt={alt}
          data-scientific="true"
          data-pixel-immutable="true"
          onLoad={() => setReady(true)}
          onError={() => setReady(false)}
        />
        {annotations.length ? <EvidenceAnnotationLayer annotations={annotations} onActivate={onAnnotationActivate} /> : null}
      </div>
    </ScientificEvidenceFigure>
  );
}
