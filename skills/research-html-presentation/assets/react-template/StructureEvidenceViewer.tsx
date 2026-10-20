"use client";

import { useState } from "react";
import type { EvidenceAnnotation, VisualEvidenceRecord } from "./EvidenceVisualizationTypes";
import { EvidenceAnnotationLayer } from "./EvidenceAnnotationLayer";
import { ScientificEvidenceFigure } from "./ScientificEvidenceFigure";

export function StructureEvidenceViewer({
  visual,
  src,
  alt,
  caption,
  sourceLabel,
  nodes,
  activeNodeId,
  onNodeActivate,
}: {
  visual: VisualEvidenceRecord & { evidenceType: "B" };
  src: string;
  alt: string;
  caption: string;
  sourceLabel?: string;
  nodes: EvidenceAnnotation[];
  activeNodeId?: string;
  onNodeActivate?: (node: EvidenceAnnotation) => void;
}) {
  const [ready, setReady] = useState(false);
  const annotatedNodes = nodes.map((node) => ({ ...node, critical: node.critical || node.id === activeNodeId }));
  return (
    <ScientificEvidenceFigure visual={visual} caption={caption} sourceLabel={sourceLabel} ready={ready} className="structure-evidence-viewer">
      <div className="evidence-image-frame">
        <img src={src} alt={alt} data-scientific="true" onLoad={() => setReady(true)} onError={() => setReady(false)} />
        <EvidenceAnnotationLayer annotations={annotatedNodes} onActivate={onNodeActivate} label="科研结构节点" />
      </div>
    </ScientificEvidenceFigure>
  );
}
