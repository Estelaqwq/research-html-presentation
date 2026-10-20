# Dataset scroll report

## Contents

1. Trigger and boundary
2. Shared analytical handoff
3. Narrative-unit mapping
4. Report runtime contract
5. Layout and responsive behavior
6. Interaction, motion, and print
7. Brand integration
8. Prototype and QA

## 1. Trigger and boundary

Read this reference only after the universal Output Form Choice and content profile resolve to `profile: "dataset-report"` and explicit `outputMode: "scroll-report"`. An omitted output mode is the legacy-compatible `slide-deck`. Explicit slides retain the fixed `1600 × 900` contract. General work/material/method reports explicitly selecting vertical HTML follow general-scroll-report.md; this file retains the dataset-specific analysis contract.

A scroll report is a finite, evidence-led academic analysis intended for self-directed reading. It is not a dashboard, SaaS shell, KPI wall, data-management console, infinite feed, permanent filtering workspace, stack of slide canvases, or a responsive conversion of L01–L24.

New scroll reports include a collapsed research companion by default; follow [analysis-companion.md](analysis-companion.md). It is a transient reader workspace and does not turn chapter navigation into a filter panel or alter the formal report. Build its questions and permitted aggregate measures from the real evidence before delivery.
New scroll reports also include a collapsed editable process diagram by default; follow [analysis-flow.md](analysis-flow.md). Generate its baseline from this dataset's actual records after analysis; later reader edits are free-form presentation content stored separately from evidence and authoring. Either entry may be explicitly disabled for a new project; existing projects are not migrated.

## 2. Shared analytical handoff

Run the Dataset Analysis Pipeline in [dataset-analysis-and-storytelling.md](dataset-analysis-and-storytelling.md) once. The renderer consumes the same immutable dataset records, transforms, AnalysisRecord findings, claims, VisualEvidenceRecords, ChartEvidenceSpecs, chart data, annotations, limitations, and application implications used by `slide-deck`.

The scroll renderer may reorganize reading depth and section boundaries. It may not recompute values, change finding priority, fork claim IDs, invent a second conclusion registry, duplicate sensitive row-level data, or silently use different chart domains. Shared chart adapters, academic theme, chart controls, accessible summaries, reduced-motion states, and print states remain authoritative.

## 3. Narrative-unit mapping

Prefer a neutral `NarrativeUnit[]` or equivalent existing metadata layer:

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
};
```

Map the same units to `DeckSlide[]` or `ReportSection[]`; do not maintain unrelated story copies. A report uses an elastic sequence:

`Report Hero → Background and Question → Dataset Scope and Analytical Design → Decisive Findings → Rankings / Groups / Comparisons → Key Factors → Model Analysis (optional) → Deep Insight → Application Value → Boundaries → Evidence-bearing Synthesis → Report Closing`

Modules may merge. Protect the primary answer, MUST_SHOW findings, deep insight, application value when decision-relevant, interpretation-changing limitations, and substantive synthesis. Put the direct answer in the hero summary or the first substantive section and keep MUST_SHOW findings in the first half of substantive sections. Synthesis cites only findings already exposed in earlier sections.

The first substantive section after the hero establishes dataset/task context: source and file roles, observation grain, sample/field counts, target when present, task, and analytical route. For `analysisMode: "predictive"`, map the shared predictive contract to an elastic arc: `Hero → Dataset and Task → Data Quality and Actual Preprocessing → Exploratory Findings / Feature Engineering → Model Pipeline and Validation → Baseline and Model Comparison → Selected Performance → Interpretation and Error Analysis → Inference → Application / Limitations → Synthesis → Closing`. Do not recompute report-specific models or metrics. Navigation labels describe substantive subjects, never Source Lock, privacy, a gate, runtime, QA, or an alternative plan.

## 4. Report runtime contract

Use `ReportRuntime` with one `ReportSection[]` source. Each section has a stable ID, chapter, title, role, claim IDs, visual IDs, finding IDs, and one render function. Derive navigation, active section, reading progress, section count, and hash from that source.

Required behavior:

- normal vertical document scrolling by mouse, touch, keyboard, and assistive technology;
- restrained sticky left navigation on desktop;
- click-to-section navigation with a visible focus state;
- `IntersectionObserver` scrollspy that marks one active navigation item;
- stable `#section-id` links, refresh restoration, and browser back/forward restoration;
- a visible mobile/narrow-screen directory button and closable navigation drawer;
- a reading-progress line and a keyboard-accessible back-to-top control;
- `scroll-margin-top` so anchored headings are not hidden;
- semantic `main`, `nav`, `section`, `header`, `figure`, and `footer` structure;
- `data-report-runtime="ReportRuntime"`, `data-section-source="shared"`, `data-report-section`, and readiness hooks for browser QA.

Do not add slide keyboard shortcuts, slide totals, Presenter View, fragments, L01–L24, fixed-canvas scaling, or deck PDF behavior. Do not modify `DeckRuntime` to implement report scrolling.

## 5. Layout and responsive behavior

Use the selected visual style from [visual-styles.md](visual-styles.md) while keeping the shared academic visual language: `academic-light` uses white or pale blue-gray fields, deep blue structure, and restrained dark red; `tech-engineering-dark` uses layered navy surfaces, restrained cyan structure, warm gold decisive accents, cool-white copy, and minimal technical rulework. Both keep thin rules, aligned evidence regions, readable scientific charts, and minimal decorative effects.

Desktop recommendations are flexible, not a fixed template:

- navigation column approximately `220–260 px`;
- main reading column approximately `1100–1280 px` maximum;
- decisive charts may use the complete main-column width;
- section spacing reflects narrative boundaries rather than card repetition;
- each substantive section exposes question or claim, evidence, interpretation, boundary, and implication as applicable.

Treat the main column as one continuous academic document. Ordinary sections use content-driven height, a continuous surface or shared background, restrained dividers/color transitions, and compact boundaries; they do not use viewport-height minimums, large card gaps, or slide-like outer shadows. A decisive chart may use the full reading width, but its explanation and next analytical question follow directly. If a section is too small for its footprint, merge it with a neighbor instead of manufacturing cards, padding, or slogans.

Apply the shared Content Utility and Evidence Copy Gates. Each section declares a substantive contribution and resolvable data/method/result references. Section and navigation labels state data, method, comparison, or finding directly; they do not expose internal reasoning or defend why a module is absent.

At narrow widths, collapse navigation before compressing evidence. Keep the report readable without horizontal scrolling; stack evidence regions only where their relationship and reading order remain explicit. Tooltips, overlays, legends, axis labels, and table content stay inside the viewport. Do not let responsive behavior change chart values, domains, comparison groups, or evidence ordering.

## 6. Interaction, motion, and print

Use the interaction and motion contracts from [dataset-analysis-and-storytelling.md](dataset-analysis-and-storytelling.md) and the schema in [evidence-visualization-schema.md](evidence-visualization-schema.md). Interaction remains local to evidence and never turns the left navigation into a filter panel.

Honor `prefers-reduced-motion`: disable smooth scrolling and chart transitions while preserving every conclusion. `?print=1` applies each chart's declared `printState`, waits for fonts, images, charts, and annotations, exposes `data-report-ready="true"`, removes navigation, reading progress, back-to-top, tooltips, temporary focus, and chart controls, and prints the complete narrative in document order. Print must not capture a transient live selection.

An enabled research companion and its notebook are absent from formal report print.

## 7. Brand integration

[branding.md](branding.md) remains the sole identity policy. Use the same authentic/default logo and identity decision, but audit report roles separately from slide roles:

- `report-hero`: visible painted mark about `230–270 × 54–64 px` on a normal desktop report viewport;
- `report-header`: visible painted mark about `200–240 × 47–57 px` when a content header includes the lockup;
- `report-closing`: visible painted mark about `220–260 × 52–62 px`.

By default, show the complete institutional lockup only in the report hero and report closing. Ordinary section headers and the navigation omit repeated logos. If the lockup already contains the institution's Chinese/English names, do not render a second institution-text node beside it.

Measure non-transparent painted bounds. Use `object-fit: contain`, preserve aspect ratio and clear space, and reject crop, distortion, obstruction, or a logo that competes with the decisive evidence. Record `logoContainsInstitutionName`, `institutionTextVisible`, and `duplicateInstitutionText`; DOM metadata plus geometry, not OCR alone, determine duplication. The report navigation may show an unaudited compact wordmark only when it remains authentic and does not duplicate the main identity hierarchy.

## 8. Prototype and QA

At `stage: "prototype"`, require exactly three real-data sections:

1. `role: "hero"`: identity, primary question, direct-answer summary, and visible navigation;
2. `role: "analysis-design"`: scope, transforms, analytical design, and boundary;
3. `role: "decisive-result"`: real data, a MUST_SHOW finding, baseline, annotations, meaningful interaction, and declared default/reset/reduced-motion/print states.

Before propagation, build and run the manifest/evidence validators, `validate_report_runtime_contract.mjs`, `audit_layout.mjs`, and `render_report.mjs`. Inspect a desktop full-page render, all section screenshots, and a narrow-screen navigation render. Verify click navigation, scrollspy, hash and history restoration, keyboard operation, chart interaction/reset, reduced motion, deterministic print, absence of horizontal overflow, overlay safety, and painted brand geometry. The report prototype is not a complete deliverable until the user approves it or explicitly waives the pause.

For predictive work, the prototype roles are hero; dataset/task plus actual preprocessing/model design; and decisive model validation with a real baseline, fold/split details, uncertainty, and interaction states. In prototype and complete stages, browser QA also checks restrained adjacent-section gaps, content-driven section heights, content/plot occupancy, substantive navigation mapping, no stacked-slide appearance, no ordinary-section logo repetition, and no hero/closing institution-text duplication.


## Data health for new dataset scroll reports

New explicit dataset scroll reports default to a collapsed data health entry. Follow [data-health.md](data-health.md) for local generation, declared-field rules, coverage, usage, privacy, and runtime/print QA. Derived diagnostics refer to the existing Shared Evidence Core and citations; pending scaffold content is not deliverable. Slide decks and existing projects retain their behavior.
