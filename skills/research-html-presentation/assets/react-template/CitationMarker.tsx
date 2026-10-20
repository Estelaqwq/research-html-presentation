import type { CitationRecord } from "./CitationTypes";
import { citationHref, citationLabel } from "./CitationTypes";

export function CitationMarker({ citation }: { citation: CitationRecord }) {
  const href = citationHref(citation);
  const label = `[${citationLabel(citation)}]`;
  return href ? <a data-citation-id={citation.citationId} className="citation-marker" href={href} target="_blank" rel="noreferrer">{label}</a> : <span data-citation-id={citation.citationId} className="citation-marker">{label}</span>;
}
