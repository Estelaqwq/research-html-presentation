---
name: research-html-presentation
description: Create evidence-driven HTML research presentations as user-selected 16:9 decks or vertical reports for research, work progress, material reviews and datasets. Default to no institutional logo; support optional ZUEL branding on explicit request. Do not use for dashboards, SaaS pages, generic websites, or conventional PowerPoint.
---

# Research HTML Presentation

Create formal, evidence-led academic HTML presentations for any reporting institution or an unaffiliated reporting subject. New projects default to **no institutional branding**: set `branding.profile: "none"`, omit logos and brand-only containers, and do not reserve an empty logo area. Invoking this Skill, supplying a paper, or mentioning a university does not enable a logo.

Enable the bundled ZUEL treatment only when the user explicitly requests it, for example “加上中南财校标”, “添加中南财经政法大学校徽”, or “use the ZUEL logo”: set `branding.profile: "zuel"` and read [zuel-branding.md](references/zuel-branding.md). A negated request such as “不要加中南财校标” keeps branding disabled. For existing projects, preserve their saved branding and assets unless the user explicitly changes them; a legacy manifest with no branding field is not a request to remove its existing logo. Follow [branding.md](references/branding.md) for selection, persistence, and validation. Paper authors, dataset publishers, research objects, cited institutions, and research locations are provenance or context, not reporting identity. Omit absent presenter/unit fields without inventing names or placeholders.

Do not use this Skill for dashboards, SaaS or landing pages, generic websites, commercial pitch decks, black-neon or SaaS frosted-card themes, or conventional PowerPoint. The supported visual styles are formal research treatments, not game HUDs, cyberpunk interfaces, or promotional page themes. An explicit request for composed poster lettering is supported for a cover title; retain the research profile, evidence rules, shared runtime and readable body copy.

## Read the authoritative reference for each phase

Read every selected reference completely before acting; references contain mandatory detail, not optional suggestions.

- Scope, materials, and profiles: [content-architecture.md](references/content-architecture.md), [evidence-policy.md](references/evidence-policy.md), and [presentation-profiles.md](references/presentation-profiles.md).
- General vertical reports: [general-scroll-report.md](references/general-scroll-report.md) after explicit scroll selection for work/material/method content.
- Standalone dataset analysis: [dataset-analysis-and-storytelling.md](references/dataset-analysis-and-storytelling.md). Read [dataset-scroll-report.md](references/dataset-scroll-report.md) as well only after the output Gate selects `scroll-report`.
- Default reader exploration for every new dataset scroll report: [analysis-companion.md](references/analysis-companion.md). Read it only for new dataset-report projects selecting `scroll-report`.
- Default local data health for every new dataset scroll report: [data-health.md](references/data-health.md). Read it only for new dataset-report projects selecting `scroll-report`.
- Default editable analysis flow for every new dataset scroll report: [analysis-flow.md](references/analysis-flow.md). Read it only for new dataset-report projects selecting `scroll-report`.
- Scientific figures, structured charts, provenance, and citations: [scientific-evidence-visualization.md](references/scientific-evidence-visualization.md), [evidence-visualization-schema.md](references/evidence-visualization-schema.md), and [citation-and-source-rendering.md](references/citation-and-source-rendering.md).
- Narrative and visual composition: [narrative-compression.md](references/narrative-compression.md), [design-system.md](references/design-system.md), [layout-selection.md](references/layout-selection.md), [branding.md](references/branding.md), and [visual-styles.md](references/visual-styles.md) when selecting or implementing a visual style.
- Technology-blue calibration: [tech-blue-reference-calibration.md](references/tech-blue-reference-calibration.md) when creating or substantially revising `tech-engineering-dark`; compare rendered pages with user references before extending the design. For this user’s 16:9 technology reference direction, calibrate role-specific irregular contours, translucent blue surfaces with opaque copy, title letterforms and title/subject weight—not color alone. Its confirmed 16:9 direction uses 汉仪尚巍手书W for composed, upright cover lettering, a horizontal aligned supporting-copy group, complete translucent callout, and varied role-specific content shapes; it includes reusable title components and optional licensed-font embedding. The public package uses system font fallback; configure a licensed WOFF with `--display-font` or `RESEARCH_HTML_PRESENTATION_FONT` to recover the reference lettering. Reuse this user-approved direction without restarting font selection.
- Material-adaptive visual planning, composition profiles, reference calibration, audience comprehension, and FlowSpec: [visual-composition-contract.md](references/visual-composition-contract.md).
- Prototype approval: [prototype-review.md](references/prototype-review.md).
- Implementation and Presenter View: [implementation-contract.md](references/implementation-contract.md) and [presenter-view.md](references/presenter-view.md).
- Existing-report edits: use [revision-workflow.md](references/revision-workflow.md) to classify the change and validate its affected scope; preserve the confirmed form/style and existing patch.
- Local editing: read [lightweight-editing.md](references/lightweight-editing.md) for every new scaffold project (browser Authoring is on by default) and whenever an existing project already contains an edit Registry/Patch or the user requests editable HTML.
- Validation and release: [interaction-and-qa.md](references/interaction-and-qa.md), and [pdf-export.md](references/pdf-export.md) before deck PDF delivery.
- Statistical plots and reusable figure recipes: [scientific-plot-recipes.md](references/scientific-plot-recipes.md) for raw observations, pairing, uncertainty, coefficients, diagnostics, mixed panels and static exports; these extend the existing Shared Evidence Core.
- Quality and capability contract: read [quality-contract.md](references/quality-contract.md) for default Authoring, occupancy, title geometry, derived navigation, evidence-to-page mapping, and visual-review requirements.

Use `assets/react-template/` as the shared runtime/composition library and `schemas/` as the machine-readable structural authority. Assets, fixtures, and Golden Projects are implementation or tests; never copy their synthetic topic content into a user project.

## Let the user select the output form first

For every new reporting task, resolve presentation form before full material analysis, profiling, outlining, or generation. Do not infer it from PDFs, Word, CSV, mixed materials, “defense”, “presentation”, or another task label. If the user has explicitly requested 16:9/slides or vertical/scrolling HTML, or already confirmed a form in this task, reuse that choice without asking again. “Use the default” selects 16:9. Otherwise ask exactly and wait:

> 请选择汇报形式：
> 1. 16:9 HTML演示文稿（默认）：适合现场投屏，按页讲解。
> 2. 竖版HTML报告：适合上下滚动讲解和自主阅读。

No reply is not default authorization. Necessary file-availability checks may proceed while waiting; full analysis and page generation wait for the choice. Record explicit `outputMode: "slide-deck" | "scroll-report"` and `outputFormVersion: 1` for new projects. An omitted mode in an existing manifest remains the legacy-compatible `slide-deck`.

Determine content profile only after form selection. Every supported academic profile may use either form. A standalone dataset-led analytical task uses `dataset-report` and its existing analysis pipeline; incidental CSV, embedded tables, progress counts, or case statistics do not turn a work/material report into dataset analysis. Use `work-report` for work progress; preserve existing literature/project/course profiles for their respective content. Do not disguise a general report as `dataset-report` to pass validation.

For general `scroll-report`, read [general-scroll-report.md](references/general-scroll-report.md); for dataset `scroll-report`, read [dataset-scroll-report.md](references/dataset-scroll-report.md). Both reuse ReportRuntime, shared branding, evidence provenance, Authoring, and deterministic print. Only dataset-led work requires DatasetRecord/AnalysisRecord/Findings/model contracts. Default analysis companion/data health/analysis flow remain dataset-specific; general reports do not receive empty analysis controls.

### Resolve the visual style before HTML production

Choose one supported visual style before building the HTML prototype. If the user has already selected a style, use it directly. Otherwise ask exactly:

> 请选择视觉风格：
>
> 1. `academic-light`——钴蓝高密度科研板式 V2（默认）
>
> 2. `tech-engineering-dark`——宝蓝科技风，白蓝标题、青蓝结构线与少量亮金点题，保持科研证据导向
> 请回复 1 或 2。

Record the choice as top-level `visualStyle` in the manifest. Only `academic-light` and `tech-engineering-dark` are valid values. A missing value in an existing or legacy manifest resolves to `academic-light`; never force-migrate an existing project. The choice applies to audience, Presenter preview, report/deck print, and PDF where applicable, while the content, evidence, layout, runtime, and QA contracts remain shared.

New `academic-light` scaffolds also declare `designSystemVersion: 2` and default to `compositionProfile: "compact-academic-board"`. This is an internal compatibility marker, not a third style. Existing manifests without it remain readable and are not migrated automatically. V2 uses white surfaces, saturated cobalt structure, deep-blue titles, restrained red emphasis, compact headers, mixed open/shared containers, light same-hue gradients, and subtle depth. It never introduces a green theme.

Never repair style inheritance by hard-coding `academic-light`. Runtime and Golden Projects must consume the manifest's resolved value so either explicit style remains selectable; `academic-light` is used only when the field is genuinely absent. Regression coverage must include explicit `academic-light`, explicit `tech-engineering-dark`, and the omitted-field fallback in both deck and report paths where applicable.

## Preserve the common research contract

All outputs MUST:

- record the selected branding mode; use no logo by default, and load the authentic bundled ZUEL asset only on explicit request. Active official logos, institutional names, and brand geometry stay locked from ordinary content editing;
- inspect all supplied artifacts and maintain traceable source, claim, evidence, interpretation, boundary, and consequence links;
- build complex communication as `claim → evidence → explanation → implication`;
- label evidence `DIRECT`, `DERIVED`, `CONTEXTUAL`, `EXPECTED`/`HYPOTHESIZED`, or `UNSUPPORTED` without inventing facts, citations, affiliations, experiments, mechanisms, innovations, limitations, data, or conclusions;
- apply Type A/B/C and L0–L3 only after the fidelity gate; reconstruct charts only from structured, verifiable data and preserve original pixels for complex scientific images;
- keep raw datasets immutable and record every transform, calculation, filtering, imputation, aggregation, and derived result;
- use one logical Citation Registry and one Shared Evidence Core rather than renderer-specific copies;
- declare and verify default, reset, reduced-motion, and deterministic print states for interactive evidence;
- make important body copy easy to scan through selective bold emphasis on core findings, decision-relevant quantities with their units/bases, and interpretation-changing conditions; preserve qualifiers and scientific meaning, following [selective body emphasis](references/design-system.md#selective-body-emphasis);
- preserve the selected style's formal research language, high information density without crowding, readable evidence, and source-safe figures; `academic-light` uses the cobalt high-density board V2 with restrained dark-red emphasis, while `tech-engineering-dark` uses saturated sapphire/royal-blue surfaces, white/ice-blue titles, cyan structure, scarce pale-yellow emphasis, and cool-white copy;
- reject dashboards, permanent filter sidebars, SaaS/landing-page composition, sparse commercial keynote styling, repeated equal-card walls, black-neon effects, particles, strong glow, decorative AI-tech imagery, and promotional page composition that displaces research evidence;
- prototype, build, validate, render, and visually inspect with real browser behavior; static keyword checks do not replace interaction or visual QA.
- treat prototype pages as a real visual gate: a method/process or decisive-result prototype with a tiny dominant visual, an unfilled lower body, unreadable ordinary copy, or an unexplained large continuous void must be corrected before it is shown for approval; a technically successful build is not visual approval.
- treat complete-stage density, title geometry, page derivation, evidence-to-page mapping, and requested capability checks as release gates, not advisory warnings; apply the thresholds in [quality-contract.md](references/quality-contract.md);
- create a material-adaptive `VisualPlan` for every `NarrativeUnit` before choosing an L01–L24 layout; distinguish scientific/data/authentic-project evidence from explanatory, ordinary, and decorative content;
- run the audience-comprehension review for every presentation profile, use an optional `compositionProfile`, and record a `Reference Visual Contract` whenever visual references are supplied;
- use `FlowSpec` for sequential, causal, parallel, or feedback relationships and validate its node/edge topology before rendering;
- record a real `bodySilhouette` independently of L01–L24; an 8–12 page deck uses at least five silhouettes and four container forms, never more than two consecutive identical silhouettes or fixed right-aside compositions;
- treat browser-derived geometry, not Manifest names, CSS classes, or `data-silhouette-role` labels, as the authority for cross-page variety; the same normalized body geometry or coarse template family may appear on at most two substantive pages, and a comparison rationale cannot excuse a repeated template family;
- treat actual painted content as a release gate: large cards, backgrounds, borders, shadows, and full-size SVG backplates cannot compensate for low `paintDensity` or a low painted-to-layout ratio; complete-stage thresholds and auditable exceptions are defined in [quality-contract.md](references/quality-contract.md);
- make every Type A chart declare `chartForm`, `analyticalQuestion`, `visualThesis`, `encodedFields`, `comparisonBaseline`, `claimVisualFit`, `alternativeFormsConsidered`, and `selectionRationale`; the page title and main chart must prove the same relationship;
- preserve a source or faithful cropped view for numbered curve-geometry figures such as ROC, Kaplan–Meier, calibration, survival, and forest plots when only labels or summary values are available; a value-only L3 summary may accompany but must not silently replace the geometry-bearing source figure;
- treat titles, leads, module titles, and takeaways as audience conclusions rather than report-writing commentary; reject defensive/meta shells such as `不是…而是…`, `而不是`, `本页`, `本报告`, and `这组数据` at those levels;

New `dataset-report` projects use `datasetSemanticVersion: 3`. Versions 0–2 remain readable and validated under their declared legacy contracts; never force an existing project to migrate or treat legacy compatibility as permission for new work to omit v3 model-search, basis-ID, and audience-copy requirements.

## Preserve the two output contracts

### `slide-deck`

Use this contract for explicit `outputMode: "slide-deck"` and every legacy manifest without `outputMode`, regardless of content profile:

- fixed `1600 × 900` logical canvas, uniformly scaled as one whole slide;
- one slide at a time; no internal scrolling, responsive column reflow, mobile-page conversion, or content outside the canvas;
- mandatory formal cover, existing L01–L24 relationship-driven layouts, stable title/brand anchors, evidence-sized composition, profile-specific synthesis and closing rules;
- unchanged `DeckRuntime`, `PresenterView`, `SlidePrimitives`, deck CSS, keyboard navigation, `#/N`, current/total, progress, chapters, fragments, zoom, focus, fullscreen, same-origin Presenter synchronization, deterministic deck print, and verified 16:9 deck PDF;
- audience, Presenter, Print, and PDF derive from one slide/evidence source; do not implement dataset-specific scaling, navigation, page totals, Presenter, brand, or PDF logic.

### `scroll-report`

Every supported academic profile with explicit `outputMode: "scroll-report"` may use this contract:

- shared `ReportRuntime` and one `ReportSection[]` source rendered as a normal content-driven vertical document; general reports optionally use the common presentation toolbar and report modules;
- responsive reading column, restrained sticky left chapter navigation, IntersectionObserver scrollspy, stable `#section-id`, browser back/forward, reading progress, accessible narrow-screen navigation, back-to-top, and deterministic full-report print order;
- desktop and narrow-screen runtime/layout QA, no horizontal overflow, and no fixed-height slide stacking.
- every newly generated dataset scroll report defaults to `analysisCompanion.enabled: true`: a collapsed research assistant backed by approved aggregate evidence. Populate real measures and contextual questions before delivery; an empty scaffold placeholder is not a finished assistant. `analysisCompanion.llm.enabled` remains an explicit server-side model API option for natural-language planning and wording; server-validated calculations and deterministic fallback remain authoritative. The assistant cannot change formal findings or report print. Follow [analysis-companion.md](references/analysis-companion.md).
- every newly generated dataset scroll report defaults to `dataHealth.enabled: true`: a collapsed data check entry beside data/method content. Generate real missingness, declared-key duplicate checks, optional time coverage, explicit anomaly checks and registered analysis input usage locally. Show unregistered or insufficient evidence honestly; publish only privacy-cleared aggregates, reuse DatasetRecord/AnalysisRecord/CitationRegistry IDs, and do not alter report analysis or printState. Follow [data-health.md](references/data-health.md).
- every newly generated dataset scroll report defaults to `analysisFlow.enabled: true`: a collapsed, freely editable process diagram initialized from this project's dataset and analysis records. Run the flow generator after the records are populated; browser edits change only its presentation copy, and the original graph remains available for one-click restore. Follow [analysis-flow.md](references/analysis-flow.md). Existing projects are not migrated; an explicit opt-out may disable these entries without leaving empty controls.

Never apply a `1600 × 900` canvas, L01–L24, DeckRuntime, Presenter View, slide totals, left/right paging, fragments, or deck PDF to a scroll report. Never put report scrolling into DeckRuntime or deck behavior into ReportRuntime.

## Execute the workflow

### 1. Resolve output form, then establish brief, identity and profile

Determine or safely infer audience, duration/page target, language, live-versus-reading use, notes, the reporting subject and the default unbranded or explicitly requested branding mode, the closest academic profile, and the visual style. Use answered material instead of repeating questions. Ask only when a missing choice materially changes the result. For cover metadata, display only fields supplied by the user or materials; omit absent presenter/unit fields and use another real project datum when one exists, without inventing a name or a placeholder. Resolve the universal Output Form Choice before content profiling, then the Visual Style Gate before HTML production. A work report may combine documents and supporting data without running the standalone dataset pipeline.

### 2. Inventory, analyze, and prioritize evidence

Inspect every file before outlining. Keep the established paper/report path primary for papers, Word, PDF, and presentation materials; extract their figures/tables/captions without asking the user to upload them again. Run the dataset pipeline only for a standalone or dataset-led task. When both exist, preserve separate provenance and merge through stable source/claim IDs without duplicating evidence.

For datasets, run the task-intent, analysis-mode, coverage, preparation, finding-first, model, model-search-adequacy, content-utility, and audience-plain-language gates in [dataset-analysis-and-storytelling.md](references/dataset-analysis-and-storytelling.md) exactly once on the shared analysis. Do not expose internal Gate, QA, manifest, runtime, adequacy, or evidence-status language as audience copy.

Write one communication job and a claim–evidence map. Classify candidate content as `MUST SHOW`, `SHOULD SHOW`, `BACKUP`, or `OMIT`; protect decisive evidence, the direct dataset answer, interpretation-changing boundaries, and profile-required synthesis/closing. For a paper-led literature review, finish the full-deck speaking storyboard and numbered source figure/table disposition before selecting three prototype pages, which need not be adjacent in final order; see [content-architecture.md](references/content-architecture.md), [evidence-policy.md](references/evidence-policy.md), and [prototype-review.md](references/prototype-review.md). Compress repetition and low-value explanation before reducing evidence size or type. When a Word or report contains explicit page markers, treat them as strict page boundaries: preserve page count, mapping, order, facts, conclusions, methods, data, and argument relations, while converting oral greetings, transitions, repeated explanations,现场提示, and other speech-only wording into concise academic slide copy or optional Presenter notes rather than copying it into the audience body.

### 3. Build and obtain prototype approval

For new work, set `stage: "prototype"` and build exactly three real-content units:

- deck: L01 cover, a method/structurally demanding page, and a decisive result page;
- dataset deck: cover, analysis-design page, and decisive interactive result;
- dataset scroll report: hero/direct answer, analysis-design section, and decisive interactive result section with working navigation, hash, responsive behavior, reset/reduced-motion, print, and brand geometry;
- general scroll report: hero and two genuine work/material/method sections appropriate to its content; use the general-report prototype contract without inventing statistical results.

Build, validate, audit, render, and visually inspect these units; show them to the user and wait for approval before completing the rest. New manifests keep `prototypeApproval.status: "pending"` until this checkpoint is approved; complete stage requires the three reviewed prototype IDs and review evidence, or an explicit waiver record with the same internal review. When reference images exist, the prototype must record and visually verify color saturation, title height, lead treatment, dominant visual placement, image/text ratio, container forms, shared boundaries, line hierarchy, shadow/gradient intensity, conclusion band, silhouette distribution, and prohibited traits. Reference images never authorize copying their logos, content, figures, data, project names, or conclusions. Skip only the user-facing pause when explicitly asked for uninterrupted generation, but still inspect the same roles internally. After approval, preserve the agreed system and set `stage: "complete"`; a prototype cannot be formally published or exported.

### 4. Implement without forking evidence or runtimes

Use semantic HTML and stable slide/section/component IDs. Preserve axes, units, uncertainty, samples, legends, captions, scale bars, aspect ratio, crop safety, accessible summaries, claim links, provenance, and deterministic readiness. Prefer authentic research evidence and exact data-derived visuals over generic icons or plausible substitutes.

Map the neutral Shared Evidence Core to the chosen renderer without recalculating values. Use the existing runtime/assets and selected profile; apply the selected visual style through the shared style contract without changing L01–L24, replacing either runtime, merging runtimes, or modifying research values/evidence relationships. For V2 `academic-light`, choose the body silhouette and chart form from the evidence relationship rather than inheriting a recurring left-figure/right-sidebar template. Mark the actual visible silhouette regions with the canonical `data-silhouette-role` hooks from the quality contract; a Manifest label alone does not count. Treat `data-structure-panel` as a measurement boundary whose background, border, and shadow never count as content. An existing project retains its framework, package manager, route, hosting, and build flow. For a compatible new project, use:

```powershell
node <skill-dir>/scripts/scaffold_project.mjs --mode <research-deck|dataset-deck|dataset-scroll-report|general-scroll-report> --output <new-empty-directory> [--visual-style <academic-light|tech-engineering-dark>] [--branding <none|zuel>] [--composition-profile <standard|compact-academic-board>] [--no-authoring] [--no-analysis-companion] [--no-analysis-flow] [--no-data-health] [--analysis-companion-llm]
```

The scaffold defaults to `--branding none`. Pass `--branding zuel` only after an explicit ZUEL-logo request; never infer the flag from source affiliations. Save the branding choice in the project manifest and copy any selected logo into the project so future edits and offline exports preserve it. Scaffold TODO/synthetic content is structure only, never research evidence or a finished deliverable.

### 5. Add browser Authoring by default for new projects

New projects include a usable Authoring Layer by default. Set `authoring.enabled: true` and `requestedCapabilities.authoring: "required"` in the generated manifest unless the user explicitly requests read-only output or passes `--no-authoring`. Existing manifests with an explicit `authoring.enabled: false` remain unchanged; an omitted field in an existing project is not silently migrated. The ordinary browser delivery (development server, static build, or `file://`) must show the compact `编辑 E` entry on the same control row as directory, fullscreen, and Presenter controls; the full workspace starts collapsed. Print and Presenter views may hide the controls, but ordinary delivery may not silently remove them. Use [quality-contract.md](references/quality-contract.md) for the capability and output boundary.

Authoring is local-first rather than development-only: loopback servers may use the project save endpoint, while static and `file://` pages use a browser-local Patch fallback and report a concrete save error when neither store is available. `E` toggles editing in every ordinary browser entry. In deck and report content containers, all ordinary audience-visible text and ordinary content images are editable by default through stable model/component/field identities or deterministic Registry discovery—never saved DOM order, full HTML, arbitrary JSON paths, CSS, JavaScript, or file paths. The Registry is regenerated from the rendered content, and build/runtime validation fails on stale base hashes, missing targets, duplicate `editId`, or duplicate `targetId + field`. Lock chart internals, scales, runtime controls, navigation, and authoritative data; do not let audit layers cover painted evidence.

Lock runtime controls, Presenter/report navigation UI, page/progress controls, full-screen/print controls, active official brand regions, backgrounds/decorations, Canvas/SVG/chart internals, raw data, model metrics, claim/finding authority records, and authoritative data stores with `data-editor-lock="true"` or the equivalent model flag. This does not lock ordinary rendered audience copy merely because it contains a number, source, evidence statement, conclusion, or key result; such text remains locally editable. Evidence review may remain a post-save status for scientific-image or other designated changes, but it must never block local text editing or local Patch saving; trusted revalidation continues to block formal release, deck PDF, and report print publication where the existing release contract requires it.

Store `Base + validated Patch`, keep revision/fingerprint/hash/rebase/conflict/orphan handling, and support Save/Reload, Undo/Redo, Reset, managed image replacement, alt/caption, safe size/fit/position, and original-image restoration. The upload service decides a project-local relative destination and rejects path escape, absolute paths, unsupported or scripted media, and excessive size; static image replacement must fail visibly with its reason if no managed destination exists. The ordinary browser bundle may contain EditorShell because it is an intentional editing delivery; `?print=1`, Presenter View, deck PDF, and report print must hide the controls and preserve the content. Follow [lightweight-editing.md](references/lightweight-editing.md) for the complete contract.

### 6. Verify, visually inspect, and release

Build first, then use the single mode-aware entry:

```powershell
node <skill-dir>/scripts/verify_project.mjs <project-root>
node <skill-dir>/scripts/verify_project.mjs <project-root> --runtime
node <skill-dir>/scripts/verify_project.mjs <project-root> --runtime --render
# slide-deck only:
node <skill-dir>/scripts/verify_project.mjs <project-root> --runtime --render --pdf
```

The verifier must run schema/manifest, output-specific static contract, evidence, citations, v3 audience copy, Patch/editor checks when enabled, output-specific runtime, layout, render, and print/PDF in that order. A required step cannot pass as `skipped`; report `unavailable` for missing external capability. `scroll-report --pdf` must refuse deck PDF and explain deterministic report print.

Inspect every rendered output twice: first composition/evidence weight/density/rhythm; then text wrapping, figures, formulas, tables, captions, branding, controls, and crop/overflow detail. For a complete deck, inspect a contact sheet of every page with repeated title, logo, footer, and navigation visually discounted; reject text-card or stripe repetition even when layout IDs and silhouette labels differ. A three-page prototype approval never substitutes for this full-deck review. Decks require complete 1600×900/Presenter/print/PDF checks. Reports require desktop+narrow navigation, scrollspy, hash/history, horizontal-overflow, and deterministic print checks. Authoring projects validate and render effective `Base + Patch`; unresolved evidence review, conflict, or orphan operations block formal release.

Never ship a missing cover/hero, known overflow, internal scrollbar, distorted or unsafe scientific image, unsupported claim presented as fact, body text below 18 px in a deck, editor controls hidden from ordinary delivery, editor controls visible in print/Presenter output, or a renderer from the wrong mode. At complete stage, browser metrics are authoritative; fixed-canvas density thresholds below apply to decks, while content-driven reports use their report-specific height/readability checks: `contentOccupancy < 0.70`, unexcepted `paintDensity < 0.38`, unexcepted `paintToLayoutRatio < 0.45`, numeric evidence `internalOccupancy < 0.60`, numeric text-led `moduleInternalOccupancy < 0.30`, unexcepted `lowerHalfCoverage < 0.45`, an undersized Type A dominant visual, more than two pages in one browser-derived geometry cluster, or an underfilled equal-card wall must fail. A comparison rationale only explains a legitimate comparison; it never overrides sparsity or cross-page repetition. Measurable substantive modules may not all escape as `not-applicable`. Type A pages require a recognizable `data-chart-host="true"`, a `data-chart-form`, numeric `plotOccupancy`, and sufficient evidence scale; full-area SVG backgrounds do not count as plotted evidence, and a manual `pass` cannot override browser errors. For dataset reports, select one visual form per analytical question, explain the question each chart answers, and replace repeated chart silhouettes or large unreasoned empty regions before completion.

## Deliver the reusable result

Return the stable project path and preview/deployment URL when applicable. Summarize profile, output mode, prototype approval, argument and content triage, provenance/transforms, visual treatments, layout/section coverage, Presenter or report navigation, formal print/PDF result, rendered QA, evidence limitations/review state, privacy constraints, and untested dependencies. Keep source/output on the requested drive and never delete, relocate, or force-migrate an existing project during revision. For authoring-enabled scroll-report delivery, prepare the standalone offline base with `export_offline_report.mjs <project-root>` and validate it with `validate_offline_report.mjs <html-path>`; the exporter also supplies `dist/offline.html` for the ordinary preview. The editor can download typed modifications or a modified self-contained HTML, including the current flow; browser-only Save does not transfer changes to another device. Follow the portability section in [lightweight-editing.md](references/lightweight-editing.md).

For maintenance traceability, [skill-rule-migration.md](references/skill-rule-migration.md) records every rule block moved out of the former main file and its equal-or-stronger destination.
