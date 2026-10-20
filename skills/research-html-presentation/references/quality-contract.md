# Density, geometry, and capability quality contract

This reference turns the visual and editing requirements into checks that can be evaluated in a browser. It is normative for new projects and for `stage: "complete"`. Prototype projects may report ordinary warnings while the same checks are being iterated, but extreme sparsity, an undersized dominant visual, an empty lower body, or unreadable ordinary copy is blocking before user review.

## Browser-authoritative V2 thresholds

For fixed-canvas decks at complete stage, recompute status from the latest browser metrics; never trust a handwritten `pass`. Fail when `contentOccupancy < 0.70`, `paintDensity < 0.38` without an auditable density exception, `paintToLayoutRatio < 0.45` without that exception, numeric evidence `internalOccupancy < 0.60`, numeric text-led `moduleInternalOccupancy < 0.30`, `lowerHalfCoverage < 0.45` without an auditable exception, or `repeatedEqualRegionCount >= 3` without a comparison rationale. A comparison rationale does not excuse an underfilled equal-card wall: when three or more equal regions are justified, numeric `moduleInternalOccupancy < 0.50` still fails. Backgrounds, full-canvas wrappers, empty frames, and audit surfaces do not count as substantive content.

For fixed-canvas decks, browser-derived geometry is authoritative for cross-page variety. Normalize the top-level substantive body regions to the safe body, quantize their `x/y/width/height`, and record a `layoutSignature`. More than two substantive pages in the same signature cluster fails complete stage, even when their Manifest layout names, silhouette names, CSS classes, or role labels differ. This gate applies across the deck, not only to adjacent pages.

Every Type A unit needs a recognizable chart host and numeric `plotOccupancy`. `not-applicable` must agree with evidence type, visual center, and DOM structure. Browser errors override manual review state. Complete review notes may not contain “等待浏览器测量”, “等待真实内容”, or equivalent placeholders. V2 review entries record `bodySilhouette`, `silhouetteStatus`, and `chartSemanticFitStatus` where applicable.

## 1. Authoring capability

New projects are authoring-enabled by default. The manifest records:

```json
{
  "requestedCapabilities": { "authoring": "required" },
  "authoring": {
    "enabled": true,
    "mode": "browser-with-local-fallback",
    "registry": "presentation-edit-registry.json"
  }
}
```

`--no-authoring` is the explicit opt-out for a new read-only project. Existing manifests remain compatible: an explicit `authoring.enabled: false` is preserved, and an omitted field is not silently migrated.

When authoring is enabled, every ordinary browser delivery (local development, static build, or `file://`) must expose a compact `编辑 E` entry on the same bottom control row as deck navigation/fullscreen/Presenter controls; the full workspace is initially collapsed and has no footprint over the slide. It must expose stable text/image targets for all ordinary audience-visible copy, reverse-scan coverage, Save/Reload/Undo/Redo/Reset, the narrow Patch model, and any evidence-review state. Local text saving is not blocked by semantic correctness, evidence importance, or layout warnings: the local project endpoint is preferred, then a namespaced browser-local fallback is used, and a technical failure must identify the unavailable store. Presenter View, `?print=1`, and PDF/report print hide editor controls while retaining effective content.

## 2. Occupancy metrics

For substantive fixed-canvas deck slides, the browser audit measures:

```text
contentOccupancy = union(qualified semantic module geometry) / safe body area
paintDensity = union(visible glyph, line, bar, image, SVG, Canvas, and table-cell paint) / safe body area
paintToLayoutRatio = paintDensity / contentOccupancy; this exposes oversized semantic boxes whose visible content occupies only a small part of the declared layout
internalOccupancy = union(visible evidence descendants) / evidence wrapper inner area
lowerHalfCoverage = substantive painted area in the lower half / lower-half area
dominantVisualRatio = largest real figure/chart/table/structure area / safe body area, or `not-applicable` when the declared visual center is a text-only hierarchy/argument board
plotOccupancy = painted SVG/Canvas/HTML-CSS plot area / declared plot host, or `not-applicable` when the page has no plot
moduleInternalOccupancy = minimum content-span area ratio among sizeable visible leaf text/structure modules, excluding separately audited chart and process hosts
largestEmptyRegionRatio = largest measured empty tail/region / safe body area
evidenceWeightBalance = largest evidence-region area / smallest comparable evidence-region area
repeatedEqualRegionCount = count of peer audited regions with the same geometry without a comparison rationale
layoutSignature = quantized normalized geometry of top-level substantive body regions, independent of layout names and semantic role labels
layoutClusterSize = number of substantive pages sharing the same browser-derived layoutSignature
layoutFamilySignature = coarse browser-derived body family such as left-dominant/right-aside, balanced two-column, or three-column, ignoring bottom strips and cosmetic labels
layoutFamilyClusterSize = number of substantive pages sharing that body family
```

`contentOccupancy` measures composition coverage, not literal ink. A semantic region qualifies only when it contains visible substantive descendants; an empty frame never qualifies. `paintDensity` and `paintToLayoutRatio` are separate anti-gaming gates: they prevent a large card, oversized row, or full-body wrapper from passing merely because its geometry fills the canvas. Text-led `moduleInternalOccupancy` measures the bounding span of real descendant text/visuals, not its background. It is distinct from evidence-wrapper painted occupancy, so its base threshold is 0.30 rather than 0.60; justified equal-region comparisons use the stricter 0.50 floor above.

For substantive deck pages, discover meaningful visible leaf modules from semantic regions and their rendered descendants, not only hand-authored `[data-audit-box]` wrappers. A page with sizeable structure/evidence modules may not report `moduleInternalOccupancy: "not-applicable"` merely because those wrappers were omitted. Compute equal-region repetition from the same visible module set. A high semantic `contentOccupancy` paired with low painted content is a review trigger, not proof of density; do not automatically pass a wall of mostly empty cards. Apply 0.30 to the measured text-led content span and retain 0.60 for real evidence wrappers, allowing a documented scientific/narrative exception rather than a silent `not-applicable` escape.

Exclude logos, navigation, page counters, backgrounds, rules, empty wrappers, and decorative-only cards. Unless a manifest layout rationale explicitly permits another composition:

- `contentOccupancy >= 0.70` passes;
- `paintDensity >= 0.38` and `paintToLayoutRatio >= 0.45` are required at complete stage unless an auditable density exception explains why the visibly sparse area is scientifically or narratively necessary;
- `0.60 <= contentOccupancy < 0.70` warns in prototype and fails complete;
- `contentOccupancy < 0.60` fails complete;
- chart/table/evidence `internalOccupancy >= 0.60` passes; sizeable text-led leaf modules need `moduleInternalOccupancy >= 0.30`;
- `lowerHalfCoverage >= 0.45` passes.
- A complete audit must emit finite numeric values for every applicable metric. `plotOccupancy` may be `not-applicable` only when the page's declared visual center is not a chart/plot; `dominantVisualRatio` may also be `not-applicable` for a text-led structural center. The visual review must record the reason for either exception.
- A page that passes because a wrapper or background fills the canvas is invalid. The audit measures text glyph/line boxes, painted image/SVG/Canvas/HTML-CSS bounds, bars, table cells, metric cards, progress tracks, formulas, and evidence strips—not outer `[data-substantive-region]`, `[data-structure-panel]`, `[data-evidence-content]`, AuditSurface/background layers, borders, shadows, or empty figure wrappers. A structural panel is only a measurement boundary: its own fill, gradient, border, radius, and shadow contribute zero substantive area. `moduleInternalOccupancy` is computed from its painted descendants so a full-height panel with copy only in its upper half fails. Inactive slides and hidden runtime controls are excluded from the current-page geometry pass.
- `repeatedEqualRegionCount >= 3` requires an explicit comparison rationale, and the least-filled equal module must still reach `moduleInternalOccupancy >= 0.50`; rationale text cannot turn hollow cards into a valid comparison.
- Type A deck pages require numeric `dominantVisualRatio >= 0.40`. The painted chart bounds must exclude full-area SVG background rectangles, audit surfaces, and chart-host backplates.
- every substantive deck page records `layoutSignature`, `layoutClusterSize`, `layoutFamilySignature`, and `layoutFamilyClusterSize`; any exact-geometry or coarse-family cluster size above two is a complete-stage failure.

A correctly identified `[data-flow-id]` process host is not a chart/table evidence wrapper and does not use the generic `internalOccupancy >= 0.60` gate. It instead passes the FlowSpec geometry gates: drawable connected edges, endpoint continuity, no label/node overlap, sufficient label gap, main node span, balanced outer margins, process-host size, node occupancy, readable labels, and compact connection to supporting evidence. A flow nested inside `[data-evidence-visual]` remains exempt from generic wrapper fill only when these flow checks run successfully.

Prototype hard floors apply before representative pages are shown:

- `contentOccupancy < 0.45`, numeric `internalOccupancy < 0.25`, numeric `moduleInternalOccupancy < 0.15`, or unexcepted `lowerHalfCoverage < 0.20` is an error, not a warning;
- substantive content ending before 64% of total slide height is an error;
- ordinary body copy below 18 px is an error in both prototype and complete stages;
- `process-board` additionally requires process width/body width `>= 0.80`, process height/body height `>= 0.28`, node union/process host `>= 0.30`, process labels `>= 18 px`, and no more than 36 px between the process host and the next supporting region.

An intentional exception must be declared on the manifest unit as `layoutRationale` or `densityException`. The auditable form contains a non-empty `reason` plus `reviewedBy` or one or more `basisIds`; the runtime exposes it as `data-density-exception="true"`. An exception records why the empty region is scientifically or narratively necessary—it is not a way to pad a weak page.

Cover, closing, and an explicitly declared section transition are exempt from body occupancy thresholds. A metric switcher cannot make all non-default MUST_SHOW evidence unavailable in the default or print state.

## Report-specific quality

Content-driven reports use report height, empty-tail, readable text, real evidence dimensions, no horizontal overflow, header/control safety and deterministic print checks. They do not use fixed-canvas 70% content occupancy, lower-half 45% or cross-slide geometry quotas. Record applicable browser metrics and reasons for non-applicable chart metrics; a text-only section does not require a fabricated numeric plot. Dataset evidence and existing provenance remain enforced. General report full-width copy is normally 17–21px, with smaller table/label/source text only where legible; do not inflate short sections to viewport height.

## 3. Visual choice and repetition

Each chart declares the analytical question it answers. For dataset narratives, long-term change uses a trend, ranking uses a sorted bar/rank table, a two-metric relationship uses at most one key scatter, regional differences use grouped comparison, and structure uses share/sorted bars. Consecutive visuals with the same functional form are a composition failure unless the page records a comparison rationale; a repeated scatter is never a substitute for a missing question.

For V2 decks, every substantive body exposes visible `data-silhouette-role` landmarks that prove the declared silhouette. Examples: `comparison-bridge` requires `comparison-left`, `comparison-right`, and `bridge`; `figure-support-matrix` requires `dominant` and `support`; `process-board` requires `process-flow`. Hierarchy, synthesis, and multi-panel silhouettes also declare repeated node/cell/panel roles. A manifest label without these rendered landmarks fails browser audit; changing the label, L ID, or CSS class does not create a new silhouette.

Role landmarks prove that required pieces exist; they do not prove that pages are visually distinct. The browser geometry cluster check runs after every page is measured and rejects a repeated left-main/right-aside, equal-row, card-wall, or other body template family when it appears on more than two substantive pages. A different title, color, evidence type, role name, or card copy does not change the cluster.

## 4. Title geometry

Every content title declares `data-title-mode="single-line"` or `data-title-mode="two-line"` and exposes `data-safe`, `data-check-text`, and `data-title-audit`. A single-line title must not wrap. A two-line title may use at most two lines and must use the two-line header geometry variables. The browser audit checks the title against the painted logo, header rule, lead, body, and control hint; any intersection, clipping, orphan line, or unexpected wrap fails complete.

## 5. Derived navigation state

Header page numbers, current/total, progress, chapter ranges, Presenter View state, and print order derive from the shared slide/section array. Content renderers must receive an index from runtime context rather than a manually authored page number.

## 6. Evidence-to-page mapping

Every substantive page maps to exactly one primary `NarrativeUnit`. Its title basis, substantive contribution, claims, findings, data facts, methods, results, and visual provenance must resolve to the page's actual content. Generic dataset-scope claims may not be reused as the sole authority for unrelated result pages.

## 7. Review artifact

Complete projects record a `visual-review.json` artifact with one entry per manifest slide/section, including composition review, detail review, density, title, plot occupancy, evidence weight, overflow, and reviewer notes. A complete project cannot claim visual QA when any substantive unit is absent from the review artifact.

The artifact also records `renderFingerprint`, `reviewedAt`, and at least one project-relative `reviewEvidence` screenshot/contact-sheet path. The fingerprint covers output-relevant source, data, manifest, styles, local figures, and runtime files but excludes generated render folders and the review artifact itself. Any later change that alters this fingerprint invalidates `compositionReviewed` and `detailReviewed` until the new render is inspected. Browser audit may update measurements and `currentRenderFingerprint`; it must never rewrite placeholder notes into a claim that human review is complete. Deck review metrics include browser-derived `paintDensity`, `paintToLayoutRatio`, exact and family layout signatures, and both cluster sizes; handwritten statuses cannot replace them. Flow pages additionally record `flowGeometryStatus`; audited brand roles record `brandPlacementStatus`; deck pages record `scaledPreviewStatus` after the required viewport sweep.

For a complete paper-led literature review, `visual-review.json` also contains `deckReview`: `contactSheet` (existing project-relative all-page artifact), `speakingArc` (the full question→design→result→interpretation→appraisal→synthesis sequence), `crossPageAssessment` (concrete adjacent-body rhythm findings and corrections), and `sourceVisuals` (one disposition per numbered source figure/table, including slide IDs when used). If there are genuinely no numbered visuals, record `noNumberedVisualsReason`. A short `pass` or Boolean `compositionReviewed` cannot certify these judgments. Reconcile this record against the paper and full-deck storyboard; prototype approval alone does not satisfy either check.

When a reference visual contract exists, `referenceCalibration.status="reviewed"` additionally requires canonical checks for `titleGeometry`, `bodySilhouette`, `dominantVisual`, `imageTextRatio`, `sharedEdgeBehavior`, `accentPolicy`, and `prohibitedTraits`, plus at least one evidence path to a rendered side-by-side screenshot or contact sheet. The audit may create only a `pending` record; it must never manufacture a reviewed calibration.

In complete stage, every required status must be resolved (`pass`, `warning`, or an explicitly documented non-applicable status); `pending`, `unknown`, and blocking (`fail`/`error`) statuses do not pass.
