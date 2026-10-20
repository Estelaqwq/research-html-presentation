# Citation and source rendering

## Canonical audience-facing citation contract

Keep exactly one logical `CitationRegistry` in `citations.json` or an equivalent typed module declared by the manifest. It supplements existing private provenance (`sourceRef`, hashes and source links); it does not create a second claim, finding, or conclusion system. The machine-readable structure is authoritative in [../schemas/citation-registry.schema.json](../schemas/citation-registry.schema.json); the TypeScript below is a compatible developer view, not another independently editable contract.

```ts
type CitationRecord = {
  citationId: string;
  sourceType: "paper" | "dataset" | "report" | "website" | "figure" | "table" | "software";
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

type CitationRegistry = { citations: CitationRecord[] };
```

`claimIds` resolve in the Shared Evidence Core claim registry; `visualIds`, when present, resolve in its visual registry. Evidence records may retain only `citationIds` for direct lookup; they must not copy editable CitationRecord metadata. Citation metadata is one source of truth for audience markers, source footers and the Reference List in both renderers.

New work chooses exactly one authority. Legacy version 0–2 projects that stored the registry only inside the evidence document remain readable, but they may not also declare an external or typed registry; validators must report two simultaneous registries as authority drift. Existing typed-module projects remain valid and are not forced to migrate to `citations.json`.

## Rendering rules

- Render a compact marker beside the supported claim, figure, table, chart or section. Render a source footer when a reader needs locator/context to interpret evidence. Render the full registry in a Reference List.
- DOI and URL must be real keyboard-accessible `<a>` links with an `href`, never plain-text pseudo-links. Prefer `https://doi.org/<doi>` for a DOI when no canonical URL is supplied.
- Preserve author, year, title and locator when supplied. Dataset entries may include publisher/version in title or locator. Figure/table/page/sheet/row locators must remain clear.
- Clearly distinguish a source-author claim, original source evidence, presenter summary and presenter evaluation in literature review copy.
- Do not expose absolute local paths, source hashes, credentials, tokens or private directories to the audience. Keep those only in private provenance.
- Place markers and footers outside axes, legends, scale bars, takeaways, controls and brand geometry. Print/PDF retains citations needed to interpret evidence; drawers and transient source UI do not print.
- A deck and scroll report that map the same Shared Evidence Core must consume the same Citation Registry; renderer-specific duplicated citation text is prohibited.

## Validation and release

Run `scripts/validate_citations.mjs <project>` whenever a citation registry or audience marker exists. It checks ID uniqueness, claim/visual resolution, link shape, local-path leakage, decisive external claims, and marker/reference consistency. It complements, rather than replaces, visual QA: inspect citation placement in the prototype and final render.
