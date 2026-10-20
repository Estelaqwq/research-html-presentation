# HTML implementation contract

## V2 shared primitives

The shared light board exposes `RibbonHeader`, `NotchedLabel`, `OpenFrame`, `InsetEvidencePanel`, `DashedQuestionBox`, `EvidenceTriptych`, `FigureSupportMatrix`, `ComparisonBridge`, `ArrowStage`, `MiniEvidenceStrip`, `GradientConclusionBand`, `MetricAnnotation`, and `SectionRibbon`. They support nesting and shared boundaries and remain print-safe. Ordinary text stays discoverable/editable by the Authoring Layer; chart internals and official brand regions stay locked. Use a mixture of these forms, not one of each and not a new card wall.

## Contents

1. Template assets
2. Shared narrative and output metadata
3. Semantic and audit contract
4. Grid geometry
5. Scientific image contract
6. Project-variable and brand replacement
7. Framework integration
8. Output-specific presenter and print integration
9. Production rules
10. Shared Evidence Core and runtime gates
11. Visual style handoff

## 1. Template assets

Use the files in `assets/react-template/` as building blocks:

- `DeckRuntime.tsx`: runtime shell and navigation state.
- `PresenterView.tsx`: private current/next previews, notes, timer, connection state, and presenter controls.
- `SlidePrimitives.tsx`: semantic headers, evidence modules, figures, strips, synthesis, and closing components.
- `overflowAudit.ts`: development diagnostics.
- `presentation-core.css`: shared academic visual mechanics and the unchanged `academic-light` base skin.
- `layout-recipes.css`: evidence-led body, cover, agenda, synthesis, and closing compositions.
- `presenter-view.css`: isolated presenter-window layout; never use it to style audience slides.
- `print-export.css`: isolated all-slide print geometry for verified PDF export.
- `EvidenceVisualizationTypes.ts`: shared evidence, annotation, dataset-summary, and chart contracts.
- `ScientificEvidenceFigure.tsx`, `StructuredEvidenceChart.tsx`, `StructureEvidenceViewer.tsx`, and `ImmutableScientificImage.tsx`: Type A/B/C wrappers with common provenance and readiness hooks.
- `EvidenceAnnotationLayer.tsx`: separate normalized overlay for non-destructive annotations.
- `DatasetSummary.tsx`, `DataQualityFigure.tsx`, and `AccessibleDataSummary.tsx`: dataset-led evidence components.
- `chart-adapters/echarts.ts`: isolated local ECharts adapter for Type A charts.
- `chart-adapters/academic-theme.ts` and `chart-adapters/chart-events.ts`: selected academic chart styling and typed chart event/state bridge.
- `visual-styles/tech-engineering-dark.css`: scoped second skin; it overrides semantic appearance tokens and selected component surfaces without duplicating components or layout rules.
- `dataset-charts/`: ranked, distribution, group, time, factor, correlation, risk, theme, confusion-matrix, and small-multiple chart compositions that delegate rendering to the shared adapter.
- `chart-interaction/`: shared tooltip, metric switcher, series highlighter, annotation, linked-evidence, and reset controls.
- `evidence-visualization.css`: evidence component styling and deterministic print behavior.
- `report-runtime/`: shared ReportRuntime, semantic report primitives, sticky chapter navigation, scrollspy, hash/history, reading progress, and readiness.
- `report-runtime/AnalysisCompanion.tsx` and `analysis-companion.ts`: default collapsed reader exploration UI and deterministic aggregate query engine for new dataset scroll reports only; see [analysis-companion.md](analysis-companion.md).
- `report-styles/`: scroll-report layout, navigation, responsive behavior, and deterministic document print styles.
- `editor/`: local-development Authoring Layer with stable automatic content targets, plain-text and managed-image editing, narrow Patch application, evidence-review state, and storage adapters. New scaffold projects include it by default; a read-only project opts out explicitly. Its pure effective-content helpers may be used at build time, but toolbar, upload, authoring CSS, and keyboard handlers belong to the development authoring entry. Read [lightweight-editing.md](lightweight-editing.md) before copying or integrating it.

Copy them into an existing project or translate their contracts into the project's framework. Do not copy a successful topic project wholesale.

## 2. Shared narrative and output metadata

Represent each page with stable metadata:

```ts
type DeckSlide = {
  id: string;
  section: string;
  title: string;
  type?: "cover" | "content" | "synthesis" | "closing";
  layout?: string;
  fragments?: number;
  notes?: string | string[];
  className?: string;
  claimIds?: string[];
  visualIds?: string[];
  citationIds?: string[];
  findingIds?: string[];
  visualPlan?: VisualPlan;
  render: (context: SlideRenderContext) => React.ReactNode;
};

Use the `VisualPlan` and optional `referenceVisualContract` before mapping a unit to L01–L24. `compositionProfile` is passed through the same DeckRuntime/PrintDeck roots as `visualStyle`; it never creates a second runtime or evidence source. Use `FlowDiagram` only with a validated `FlowSpec` and keep its SVG topology complete in print.
```

Keep IDs unique and stable. Compute total pages, progress, last page, chapter ranges, and fragment maxima from the slide array. Do not repeat hard-coded page totals in HTML, JavaScript, CSS, build scripts, and manifests. When evidence records are used, add project-relative `evidenceRegistry` at manifest level and let each slide reference its `claimIds`, `visualIds`, and dataset `findingIds`.

The renderer must not accept a hand-entered page number (`page={4}`, `04`, or an equivalent literal). Header, footer, Presenter View, and print/PDF page labels derive from the shared slide/section source and receive the runtime index through context. Title geometry is explicit: every substantive title declares `data-title-mode="single-line"` or `data-title-mode="two-line"` plus `data-title-audit`; the two-line mode owns its header height and moves lead/body anchors together. Use the thresholds and complete-stage gates in [quality-contract.md](quality-contract.md).

For dataset analysis, prefer a neutral shared narrative record before renderer mapping:

```ts
type NarrativeUnit = {
  id: string;
  chapterId: string;
  role: "introduction" | "analysis-design" | "finding" | "deep-insight" | "application" | "boundary" | "synthesis" | "closing";
  title: string;
  findingIds: string[];
  claimIds: string[];
  chartSpecIds: string[];
  priority: "MUST_SHOW" | "SHOULD_SHOW" | "BACKUP";
  substantiveContribution: string;
  dataFactIds: string[];
  methodIds: string[];
  resultIds: string[];
  contentUtilityStatus: "keep" | "merge" | "remove";
};
```

Map these units to `DeckSlide[]` for `slide-deck` or `ReportSection[]` for explicit `scroll-report`. The mapping may change compression and boundaries but not calculations, finding statements, priorities, chart values, claim links, or limitations.

For every new `dataset-report`, record `datasetSemanticVersion: 3` from [../schemas/deck-manifest.schema.json](../schemas/deck-manifest.schema.json), `outputMode`, task-intent metadata, source/field coverage, actual preprocessing, fold-safe transforms where applicable, Finding Inventory, Content Utility, title/takeaway basis IDs, Audience Plain-Language records, and a structured `sharedPresentationLayer` declaration. A deck names `DeckRuntime`, the single `slides` source, PresenterView, imported deck styles, shared brand component, shared chart adapter, and preserved deck feature set. A scroll report names `ReportRuntime`, the single `sections` source, report styles, shared brand component, shared chart adapter, and report feature set. Versions 0–2 are accepted only for legacy reading/validation and never waive the v3 requirements for new projects. Treat metadata as an auditable handoff record only; the matching browser validator must still exercise the live DOM.

Use `deck-manifest.json` during planning when useful. Record the top-level `profile` when known; validation defaults to `thesis-defense` when it is absent. `outputMode` defaults to `slide-deck`. Record `stage: "prototype"` for the three-unit approval checkpoint and `stage: "complete"` after approval; an omitted stage remains backward-compatible as `complete`. Every deck manifest begins with an explicit `type: "cover"` and layout `L01`; an explicit scroll report begins with `role: "hero"`. Follow [prototype-review.md](prototype-review.md) and [presentation-profiles.md](presentation-profiles.md).

## 3. Semantic and audit contract

Use:

```html
<section class="slide" aria-roledescription="slide" aria-label="Slide 1: ...">
  <header class="slide-header">...</header>
  <p class="slide-lead" data-safe data-check-text>...</p>
  <div class="slide-body" data-safe>
    <article data-audit-box>...</article>
    <figure data-audit-box>...</figure>
  </div>
  <footer class="takeaway" data-safe data-check-text>...</footer>
</section>
```

- Use `section` per slide, `article` per independent module, and `figure + figcaption` for scientific figures.
- Mark primary scientific images with `data-scientific="true"`.
- Mark every new evidence wrapper with `data-evidence-visual`, a unique `data-visual-id`, linked `data-claim-ids`, `data-evidence-type`, `data-evidence-status`, and `data-representation-status`.
- Expose `data-visual-ready="true"` only after the image, SVG, Canvas, or HTML chart has completed rendering from its declared data source.
- Type A charts must expose serialized `data-default-state` and `data-print-state`; Type C wrappers must expose `data-pixel-immutable="true"`.
- Interactive Type A charts must additionally expose serialized reset/reduced-motion states and stable `data-runtime-hook` controls for each declared action. Static Type A charts declare their rationale in the registry.
- Mark a scientifically harmless crop with `data-crop-safe="true"`; otherwise default to contain.
- Mark intentional caption/footer-size text with `data-small-text` when runtime font checks should exclude it.
- Mark peer modules with `data-audit-box` when overlap diagnostics should compare them.
- Give every zoomable image contextual alt and caption.
- Set non-current slides to `aria-hidden="true"` and prevent interaction.
- Announce page changes with low-priority `aria-live="polite"`.

## 4. Grid geometry

For complex pages, explicitly define:

- body available height;
- row heights and gaps whose sum matches that height;
- `grid-column` and `grid-row` for every primary module;
- figure and caption heights;
- bottom evidence or implication band;
- overlay exclusions from safe-area checks.

Do not rely on auto-flow for layouts with spanning sidebars, two-dimensional evidence matrices, bottom proof strips, or unequal module weights. Use `minmax(0, 1fr)` to prevent content-driven track overflow.

## 5. Scientific image contract

Record original dimensions, aspect ratio, must-preserve labels, crop safety, and intended display ratio before coding.

- Use `object-fit: contain` by default.
- Never create distortion by independently forcing width and height without a preserving fit mode.
- Reject an over-wide or over-tall frame that leaves the figure tiny.
- For a subfigure, use a dedicated source crop or a ratio-preserving viewport that shows the complete panel.
- Keep full-resolution zoom available when normal-scale text remains small.
- Treat low-resolution figures as a disclosed evidence limitation, not an invitation to fabricate detail.

Use the registry shapes and validation rules in [evidence-visualization-schema.md](evidence-visualization-schema.md). The `VisualEvidenceRecord` extends the existing claim–evidence map and must not become a separate conclusion store.

## 6. Project-variable and brand replacement

Replace project variables from materials without inventing them: profile, title, subtitle, date, author, verified presenter/team/project identity when supplied, language, metadata, slides/sections, chapters, captions, images, equations, values, citations, favicon, and social preview.

Apply [branding.md](branding.md) as the single identity decision source. New projects default to `branding.profile: "none"`, with no logo or empty brand region. Only an explicit ZUEL-logo request selects `branding.profile: "zuel"` and [zuel-branding.md](zuel-branding.md). Preserve the mandatory cover, formal closing, and any selected profile's brand geometry. Existing projects retain their saved or legacy actual identity unless explicitly changed. A selected `visualStyle` may change appearance but never the fixed canvas, high-information-density research contract, layout system, or runtime.

## 7. Framework integration

For an existing project:

1. Preserve its package manager, routing, hosting configuration, and build flow.
2. Add runtime and primitives without replacing unrelated architecture.
3. Import `presentation-core.css` after reset and before slide-specific CSS.
4. Import `layout-recipes.css` and then `evidence-visualization.css` before the selected visual-style override and project-specific CSS.
5. Keep slide-specific CSS in one project file or co-located modules.
6. Keep dependencies and caches outside constrained drives when requested; keep the actual project on the exact user-requested drive.

For new projects, wrap the existing runtime with the default browser authoring entry; an explicit read-only request may omit it. Build stable targets from slide/section IDs, component/content keys, and field roles; do not persist DOM order or serialized HTML. Discover ordinary audience-visible text across every page/section, including nested text and stable SVG/HTML-CSS chart text, and reverse-scan for uncovered targets. In every ordinary browser delivery, keep the compact E entry visible while conditionally rendering the full workspace only after it is opened; the entry may use an optional runtime toolbar slot or equivalent without changing runtime behavior when no Authoring provider exists. Derive effective slide/report metadata through the pure Patch helper before rendering, import `editor.css` from the authoring boundary used by ordinary browser builds, and keep the project-root editable Registry and patch outside Shared Evidence Core. Static/file delivery falls back to browser-local Patch storage; Presenter/Print/PDF hide the editor controls but retain effective content. All detailed discovery, image, review, save-server, and rebase rules live in [lightweight-editing.md](lightweight-editing.md).

For a new project, use `scripts/scaffold_project.mjs` and `assets/project-template/` when their generated stack fits the request. The scaffold supports `research-deck`, `dataset-deck`, `dataset-scroll-report`, and `general-scroll-report` with an optional content `--profile`, starts at `stage: "prototype"`, contains only explicit TODO/synthetic placeholders, and enables the local Authoring Layer by default. Use `--no-authoring` for a read-only scaffold; the former `--authoring` flag remains accepted. New projects record `visualStyle: "academic-light"` unless a user-selected style is passed through the scaffold flow. A deck keeps audience, Presenter View, and print output in the same application and slide data source. A scroll report keeps live and print modes in the same application and section source. Do not create separate projects or duplicate evidence calculations for output modes. Existing projects retain their package manager, framework, routing, hosting, and manifest compatibility; the scaffold is not a migration mandate.

Do not require internet fonts or add dependencies when CSS, HTML, or an existing library can express the evidence. Add local `echarts` only when a Type A or dataset-led task genuinely requires interactive structured charts; never load it from a CDN. Keep ECharts calls, selected-theme application, event binding, and action dispatch behind `chart-adapters/` so page components consume the adapter contract and Audience, Presenter View, and Print share one evidence/chart source.

## 8. Output-specific presenter and print integration

Import `presentation-core.css`, `layout-recipes.css`, `evidence-visualization.css`, the selected visual-style override when present, `presenter-view.css`, and `print-export.css` through the project's normal global-style entry. Do not import global CSS from a component when the host framework prohibits it.

Use the same `DeckSlide[]` data for audience, presenter, and print modes. Keep `notes` optional and presenter-only. Open Presenter View with a unique same-origin channel token and synchronize absolute slide/fragment state according to [presenter-view.md](presenter-view.md).

Use `?print=1` only for deterministic all-slide rendering. Render every fragment at its final state and omit all interactive or presenter-only UI. Follow [pdf-export.md](pdf-export.md) and run `scripts/export_pdf.mjs` only after complete-stage validation.

Do not fork the cover, layout system, slide components, or scientific figures into PDF-specific versions.

For explicit `scroll-report`, import the shared presentation tokens/mechanics and `evidence-visualization.css`, followed by the selected visual-style override, `report-styles/report-core.css`, `report-navigation.css`, and `report-print.css`. Use the same `ReportSection[]` and evidence/chart source in live and `?print=1` modes. Do not import Presenter View, fixed-canvas scaling, slide page totals, L01–L24, or slide PDF rules. Report print removes navigation and transient controls, applies declared chart print states, and preserves complete document order.
An enabled companion also imports `report-styles/analysis-companion.css` and receives only approved aggregate records from the one Evidence Registry. The disabled path renders no companion entry.

## 9. Production rules

- Build after complete implementation and fix actual compilation errors.
- Keep development audit logs out of production.
- Store the current slide in `#/N` and restore it on refresh.
- Recalculate scale on resize and fullscreen change.
- Keep Presenter View synchronization isolated by deck channel and keep its timer local to the presenter window.
- Expose print readiness only after fonts, images, evidence visuals, annotations, chart default/print-state application, and final layout have settled.
- Support `prefers-reduced-motion`.
- Keep chapter, Presenter View, and fullscreen entries discoverable. They may soften after an initial M/P/F hint and restore on hover, focus, or pointer movement, but their resting opacity cannot be zero. Report popup blocking explicitly.
- Preserve user-owned private material and do not publish unless in scope.
- Bake only validated Patch values into formal content. Local Authoring text saves remain separate from formal release review and are not blocked by semantic, evidence, or layout warnings. Block release, deck PDF, and report print publication while a Patch is conflicted, orphaned, or requires evidence review; never solve this by disabling a validator.
- Keep Authoring UI, upload routes, editor CSS, and authoring keyboard handlers out of Presenter, Print/PDF, and formal production bundles.
- Do not delete, relocate, or silently recreate an existing project during revision.
- Keep source path and output path stable and report the direct `index.html` or preview URL.
- When `.openai/hosting.json` exists, follow the Sites build and hosting skills.

## 10. Shared Evidence Core and runtime gates

### Shared Evidence Core Inheritance Gate

Every dataset output inherits the evidence schema, AnalysisRecord findings, claim links, chart specifications, chart data, Citation Registry, dataset charts, local chart adapter and events, the selected academic chart theme, chart interactions, accessible summaries, selected identity asset when enabled, reduced-motion state, and deterministic print state. Reject a renderer that recalculates values, forks findings/claims/citations, copies chart data into an unverified store, calls ECharts directly in page components, or creates a second brand policy.

Predictive outputs additionally inherit one task contract, source-role/field-usage map, preprocessing transform chain, validation folds/metrics, baseline and candidate-model records, selected-model result, error analysis, and inference output. Learned preprocessing fits only on training folds/splits and the same fitted pipeline is applied to validation and inference. Deck, Presenter, report, and both print modes may reorganize these records but never refit, recalculate, or substitute sample-submission values for truth.

### Deck Runtime Inheritance Gate

When `outputMode` is omitted or equals `slide-deck`, the existing dataset-report inherits `DeckRuntime`, `PresenterView`, `SlidePrimitives`, all existing deck CSS, shared branding, and the shared local chart adapter. It retains Arrow/Page/Space navigation, Home/End, F/M/P/Esc, `#/N`, current/total, progress, chapters, fragments, zoom/focus, same-origin Presenter synchronization, deterministic print, and PDF export.

Audience, Presenter, and Print render the same slide array and evidence/chart data. Page count, chapters, progress, and presenter state derive from that source. Reject any dataset implementation that creates its own scaler, navigation, menu, presenter, logo geometry, page-total logic, PDF logic, or independent audience/print page copies. A chart adapter is an evidence renderer inside the shared layer, not another presentation runtime.

### Scroll Report Runtime Gate

Every supported academic profile with explicit `outputMode: "scroll-report"` may inherit `ReportRuntime`, report primitives, report CSS, shared branding, `evidence-visualization.css`, and the same local chart adapter. Live and print render the same `ReportSection[]` and evidence/chart data. Section navigation, scrollspy, hash/history, reading progress, responsive navigation, and report readiness derive from that source.

Reject a scroll report that imports Presenter View, duplicates slide navigation or PDF runtime, stacks `.slide` canvases, creates a second analysis registry, forces ordinary sections to viewport height, or turns chapter navigation into a filter dashboard. Report sections consume the same `NarrativeUnit` contribution references as deck slides, use content-driven height, and expose only substantive navigation labels. Use dataset-scroll-report.md for analytical content and general-scroll-report.md for general content. General mode keeps toolbar/modules and user-selected form without requiring analytical findings. Offline export compiles the same main entry, sections and components; it does not serialize another report.

## 11. Visual style handoff

Resolve `visualStyle` before the prototype. The runtime root exposes `data-visual-style` with the resolved value, including in deck print and report print. Existing or omitted values resolve to `academic-light`.

Keep `academic-light` in the base stylesheet for backward-compatible rendering. Load `tech-engineering-dark.css` only as a scoped override after shared presentation/evidence styles. The override may change semantic colors, surfaces, borders, title/module treatment, cover/closing fields, report surfaces, chart-control appearance, and the visual proportions/placement of semantic regions inside an already selected L01–L24 layout. It may not add dark-only layout IDs, change the relationship or reading order that selected the layout, alter evidence values, fork DOM content, duplicate runtime state, or weaken authoring locks. Use the shared presentational hooks in [visual-styles.md](visual-styles.md) when CSS cannot identify a semantic region safely.

The chart adapter resolves the selected chart palette/theme once per render. Dataset chart components must consume semantic palette values rather than hard-coded skin colors. Audience, Presenter preview, reduced-motion, deterministic print, and PDF use the same selected theme and chart data.


## Data health for new dataset scroll reports

New explicit dataset scroll reports default to a collapsed data health entry. Follow [data-health.md](data-health.md) for local generation, declared-field rules, coverage, usage, privacy, and runtime/print QA. Derived diagnostics refer to the existing Shared Evidence Core and citations; pending scaffold content is not deliverable. Slide decks and existing projects retain their behavior.
