export type CitationSourceType = "paper" | "dataset" | "report" | "website" | "figure" | "table" | "software";

export type CitationRecord = {
  citationId: string;
  sourceType: CitationSourceType;
  title: string;
  authors?: string[];
  year?: number;
  doi?: string;
  url?: string;
  locator?: string;
  accessedAt?: string;
  claimIds: string[];
  visualIds?: string[];
};

export type CitationRegistry = { citations: CitationRecord[] };

/**
 * One project has exactly one logical audience-citation authority. JSON and a
 * strict JSON-literal typed module are current storage forms; embedded evidence
 * citations remain a legacy-only form when neither current form is present.
 */
export type CitationAuthority =
  | { kind: "json"; sourceRef: string; registry: CitationRegistry }
  | { kind: "typed-module"; sourceRef: string; registry: CitationRegistry }
  | { kind: "legacy-embedded"; sourceRef: string; registry: CitationRegistry };

export function citationHref(citation: CitationRecord): string | undefined {
  if (citation.url) return citation.url;
	  if (citation.doi) return `https://doi.org/${citation.doi.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")}`;
  return undefined;
}

export function citationLabel(citation: CitationRecord): string {
  const author = citation.authors?.[0];
  return [author, citation.year].filter(Boolean).join("，") || citation.title;
}
