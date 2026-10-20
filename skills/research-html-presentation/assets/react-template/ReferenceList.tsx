import type { CitationRecord } from "./CitationTypes";
import { citationHref } from "./CitationTypes";

export function ReferenceList({ citations }: { citations: CitationRecord[] }) {
  return <section className="reference-list" aria-label="参考文献">{citations.map((citation) => {
    const href = citationHref(citation);
    const text = [citation.authors?.join(", "), citation.year, citation.title, citation.locator].filter(Boolean).join(". ");
    return <p key={citation.citationId} data-reference-id={citation.citationId}>{href ? <a href={href} target="_blank" rel="noreferrer">{text}</a> : text}</p>;
  })}</section>;
}
