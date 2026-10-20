import type { CitationRecord } from "./CitationTypes";
import { CitationMarker } from "./CitationMarker";

export function SourceFooter({ citations }: { citations: CitationRecord[] }) {
  if (!citations.length) return null;
  return <footer className="source-footer" aria-label="来源" data-small-text>{citations.map((citation) => <span key={citation.citationId}><CitationMarker citation={citation} />{citation.locator ? `，${citation.locator}` : ""}</span>)}</footer>;
}
