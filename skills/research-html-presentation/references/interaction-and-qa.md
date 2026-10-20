# Interaction and quality assurance

## V2 full-page audit

Audience-copy validation must navigate `#/1` through every deck page (or inspect the complete report/print DOM), capture title, lead, module titles, and takeaway, and compare rendered titles with the manifest. Inspect all pages, not only the mounted current slide. Browser layout audit recognizes ECharts, custom SVG/Canvas, and HTML/CSS chart hosts through `data-chart-host` plus compatible fallbacks. It records numerical plot and occupancy metrics, body silhouette, and chart form before any human review flag is evaluated.

## Contents

1. Required controls
2. Fragments, zoom, and focus
3. Runtime layout diagnostics
4. Rendering and viewport checks
5. Two-pass visual inspection
6. Slide-level QA
7. Deck-level QA
8. Presenter and export QA
9. Release sequence
10. Dataset chart and BrandGeometryAudit
11. Scroll-report runtime and responsive QA
12. Audience comprehension review
13. Local-authoring regression (new scaffolds)

## 1. Required controls

This section is the unchanged `slide-deck` control contract. Explicit `scroll-report` uses section 11 and [dataset-scroll-report.md](dataset-scroll-report.md); it does not emulate slide controls or Presenter View.

Support:

- `ArrowRight`, `PageDown`, `Space`: next fragment or page.
- `ArrowLeft`, `PageUp`, `Shift+Space`: previous fragment or page.
- `Home`, `End`: first and last page.
- `F`: toggle Fullscreen API.
- `M`: open chapter navigation.
- `P`: open or focus Presenter View from the audience window.
- `Esc`: close lightbox, chapter navigation, or focus; otherwise exit fullscreen.
- In the local Authoring viewer, keep a compact `编辑 E` entry on this same bottom control row; the complete editor workspace is initially collapsed and is revealed only after E is activated.

Do not intercept keys inside inputs, textareas, selects, editable content, or active dialogs.

Show `current / total` and a 2–4 px progress line outside scientific figures and conclusions. Derive both from the slide array. Use one active slide; set others to `aria-hidden` and disable pointer events.

Keep restrained but visible entries for chapter navigation, fullscreen, and Presenter View. They may de-emphasize after a short first-open `M / P / F` hint, but must retain non-zero resting opacity and return to full prominence on hover, keyboard focus, or pointer movement. The toolbar may not cover the title, brand mark, scientific figure, chart, tooltip, or annotation. Report popup blocking explicitly. Hide all controls in Print; Presenter UI must not enter audience screenshots.

Use a restrained 160–220 ms fade with no more than 8 px translation.

## 2. Fragments, zoom, and focus

### Fragments

- Use only for technical routes, experimental steps, or ordered claims.
- Limit to five steps.
- Reveal groups, not individual words or chart labels.
- Keep prior steps visible.

### Image zoom

- Preserve alt text, caption, full aspect ratio, axes, legends, and scientific context.
- Use a dark modal backdrop and `object-fit: contain`.
- Close on explicit button, backdrop, and `Esc`.
- Move focus to close; return it to the trigger when practical.
- Do not change slide or fragment state.

### Module focus

- Keep the selected module at full opacity with a blue rule or pale fill.
- Reduce peers to 35–50% opacity.
- Do not scale or move content.
- Allow one focused peer at a time and clear with repeated activation or `Esc`.

## 3. Runtime layout diagnostics

Run `overflowAudit.ts` after every slide and fragment change in development. Run `scripts/audit_layout.mjs` across the complete deck before release. The audit must measure safe-body occupancy, evidence-wrapper internal occupancy, lower-half coverage, title geometry, interactive default/print evidence visibility, and derived page-number consistency; the thresholds are release gates in [quality-contract.md](quality-contract.md), not advisory design comments.

Check:

- slide `scrollWidth/scrollHeight`;
- every `[data-safe]` rectangle against safe bounds;
- `[data-check-text]` overflow;
- `[data-audit-box]` peer overlap;
- scientific image rendered size and aspect behavior;
- every `[data-evidence-visual]` registry hook, readiness state, and minimum `300 × 180` rendered size;
- unsafe `object-fit: cover` without `data-crop-safe`;
- Type A data/default/print state integrity, Type B hotspot geometry, and Type C immutable source plus overlay separation;
- body text below 18 px unless marked `data-small-text`;
- title wrapping, captions, legends, and control-layer overlap.
- for new dataset-report content units, rendered content occupancy, actual Canvas/SVG/HTML plot occupancy inside chart wrappers, empty lower-half regions, and severe left/right evidence-weight imbalance;
- for every material profile, `VisualPlan`/visual-center metadata, dominant-visual ratio, module-internal occupancy, largest empty region, repeated equal-region count, and FlowSpec node/edge integrity;
- for every rendered FlowDiagram, confirm edge endpoints resolve to visible nodes, no node is isolated or overlapping, each edge has a drawable SVG path, feedback styling is distinct, and print retains the complete topology;
- for report mode, adjacent-section gaps, padding, content-driven height, empty section tails, and whether repeated outer geometry resembles stacked slides;

Fix overflow in this order:

1. Remove repeated or low-value wording.
2. Rewrite as concise bullets.
3. Change image/text proportions or layout.
4. Split the slide or move detail to backup/zoom.
5. Reduce type by at most 1 px while remaining above the minimum.

Never use negative tracking, condensed fonts, per-module scaling, or body text below 18 px.

## 4. Rendering and viewport checks

Use `scripts/render_deck.mjs` to render every `#/N` page through a local HTTP server. Do not rely on `file://` screenshot access.

Required artifacts:

- one 1600 × 900 PNG per slide;
- a contact-sheet HTML page for deck-level rhythm inspection;
- layout-audit JSON from the browser pass.

Verify complete-canvas scaling at:

- `1024 × 768`;
- `1280 × 720`;
- `1366 × 768`;
- `1920 × 1080`;
- `2560 × 1440`.
- approximately `500 × 281` as a thumbnail/browser-preview check.

Require no internal scrolling, no column reflow, no clipping, and preserved 16:9 geometry.

The deck audit must exercise these viewports in the browser; a single 1600×900 capture does not satisfy this requirement. Record per-viewport results and fail when the logical canvas changes aspect ratio, reflows, acquires internal overflow, or escapes the visible viewport. Generate a real 500×281 thumbnail render rather than treating a CSS-scaled contact-sheet image as proof.

## 5. Two-pass visual inspection

Static validators are necessary but do not prove visual quality. Inspect rendered slides twice.

### Pass A: composition

- Does one visual center dominate?
- Does region area match evidence importance?
- Is the page compact but not cramped?
- Is there narratively useless blank space?
- Does the reading order match the research logic?
- Do several pages repeat the same AI-like silhouette?
- Are real research figures visibly more important than decorative labels or values?
- Does every dataset unit pass Content Utility with a real data fact, transform, method/model, result, inference, application, or interpretation-changing boundary?
- Does every material type use its real visual center—scientific figure, chart, formula, table, structure, flow, or text relationship—without adding decorative evidence?
- Does the first substantive dataset unit establish source/file roles, grain, target/task, and analytical route?

### Pass B: detail

- Are images complete, undistorted, and large enough?
- Are axes, legends, annotations, and scale bars readable?
- Are formulas of the same role visually consistent?
- Do table edges, module boundaries, padding, and baselines align?
- Do titles or captions wrap unexpectedly?
- Does any footer, progress control, overlay, or logo obstruct content?
- Are source labels and brand marks stable and authentic?
- Do chart values, labels, units, filters, and highlighted claims agree with their declared data source?
- Does every annotation remain on a separate layer and avoid axes, scale bars, orientation markers, labels, and subfigure IDs?

If environmental policy prevents visual inspection, state that explicitly. Do not report “visual QA passed” from build and regex validators alone.

## 6. Slide-level QA

For every slide verify:

- one narrative job and one visual center;
- title, headings, red emphasis, figures, and conclusion form a coherent summary;
- every figure supports a stated claim;
- image/container ratios do not create a tiny figure or unsafe crop;
- axes, units, legends, uncertainty, sample size, and annotations are readable;
- no orphaned characters, clipping, overflow, or peer overlap;
- peer modules share boundaries, heading heights, padding, and baselines;
- the selected style's structure and decisive accents are restrained and semantically consistent (`academic-light`: blue/red; `tech-engineering-dark`: cyan/gold with muted red for risk or contradiction);
- controls, logo, citations, and sources do not compete with evidence;
- zoom, focus, fragments, fullscreen, and `Esc` do not conflict;
- the page remains intelligible with animation disabled.
- when references are supplied, the prototype and complete render record a Reference Visual Contract calibration; reference structure is borrowed without copying topic, logo, data, image, or conclusion.
- every evidence visual has a unique `visualId`, linked claim IDs, provenance, evidence/representation statuses, rationale, default state when applicable, and a deterministic print state;
- every interactive Type A chart implements the declared tooltip/switch/highlight/link/reset actions with keyboard-operable runtime hooks and matching default, reset, reduced-motion, and print states;
- Type A displayed values match chart data and do not silently change scale, comparison groups, or calculations;
- Type B nodes, edges, and parent structure remain complete, and bitmap topology is never guessed;
- Type C source pixels remain unchanged while annotations live in a separate overlay;
- new dataset-report metadata resolves task intent, source/field coverage, actual missingness treatment, and mode rationale; predictive transforms are fold-safe and inference reuses the fitted pipeline;
- evidence copy states a method, comparison, direction, value, result, or implication directly and does not expose internal Gate/Source Lock/privacy/runtime/QA decisions;
- ordinary content uses the canvas proportionately: a chart wrapper contains a substantial rendered plot, the lower half is not narratively empty, and weak pages are merged rather than filled with slogans/cards;
- dataset titles, chapter labels, leads, and takeaways pass the Audience Plain-Language Gate and resolve to their declared data/method/result basis IDs;

## 7. Deck-level QA

Verify:

- every deck begins with an explicit cover using layout `L01` and the established formal academic cover grammar;
- agenda if used, content, synthesis, and closing have distinct roles;
- synthesis is a normal evidence-bearing page when required by [presentation-profiles.md](presentation-profiles.md);
- thesis-defense, project-review, and grant-review closing follows synthesis and contains a discussion invitation and appropriate identity metadata;
- a conference-talk combines synthesis and closing only when its manifest explicitly uses `closingPolicy: "combined"`;
- for a V2 8–12 slide deck, at least five real body silhouettes appear; distinct layout IDs do not count when the bodies render as the same text-card/stripe composition;
- no accidental three-page repetition;
- for a paper-led literature review, the full speaking arc is traceable from question and paper design through results, interpretation, appraisal, and synthesis; method or result prototype pages may be non-adjacent in the final order;
- every numbered source figure/table has a recorded use, faithful reconstruction, reformatting, backup, or reasoned omission decision; decisive results are shown at readable size rather than represented by generic cards;
- the all-page contact sheet has been inspected as one artifact with shared title, logo, footer, and navigation discounted; record which adjacent page bodies feel repetitive and what was changed, not merely a Boolean pass;
- title anchor, page count, color, type, rules, logo, and spacing remain stable;
- each section starts with a need/question and ends with a conclusion/transition;
- every conclusion traces to evidence or an explicitly labeled hypothesis;
- identity follows [branding.md](branding.md): new projects have no logo by default, and an explicit ZUEL-logo request enables its optional treatment without changing the visual system;
- all placeholders and sample content are removed;
- HTML, manifest, runtime totals, and chapter indices agree.
- dataset-led decks remain slide narratives rather than dashboards and do not expose direct identifiers or package sensitive row-level data into public assets;
- predictive reports distinguish cross-validation/validation metrics, inference predictions, external benchmark scores, and unknown inference truth; sample-submission values are never treated as truth;
- a rejected/deferred model decision remains internal unless one concise method/limitation note is materially necessary; it never creates a standalone rejection/alternative/future-work page;
- a complete lockup on the closing is not accompanied by duplicated institution text;

## 8. Presenter and export QA

Read [presenter-view.md](presenter-view.md) before testing the separate presenter window. Verify two-way slide and fragment synchronization, hash/page alignment, notes isolation, timer controls, connection state, popup failure, and channel isolation. Confirm that closing Presenter View leaves the audience deck intact.

Read [pdf-export.md](pdf-export.md) before formal export. Require complete-stage manifest validation, blocking-error-free layout audit, deterministic evidence-visual readiness, declared chart `printState`, manifest-order rendering, reliable PDF page-count parsing, 16:9 page geometry, and visual inspection. Confirm that annotation overlays intended for evidence remain visible, while notes, Presenter View, chart controls, navigation controls, progress, temporary focus overlays, and debug layers are absent from the PDF.

Do not treat a prototype-stage validator pass as release approval. Follow [prototype-review.md](prototype-review.md) and wait for user confirmation before complete-deck generation.

## 9. Release sequence

For `slide-deck`, keep this existing sequence:

1. For a new deck, build and validate the three representative pages at `stage: "prototype"`.
2. Render and inspect the cover, method/structure page, and result/evidence page.
3. Show them to the user and wait for approval unless the user explicitly waived the pause.
4. Build the remaining pages and change the manifest to `stage: "complete"`.
5. Validate the complete manifest and run the project build.
6. Run `scripts/validate_deck.mjs`.
7. Run `scripts/validate_runtime_contract.mjs`, then review its exercised audience, chart, Presenter View, reduced-motion, popup-failure, and print-state checks.
8. Run `scripts/audit_layout.mjs`.
9. Render every slide with `scripts/render_deck.mjs`.
10. Perform composition and detail inspection on screenshots/contact sheet; for a literature review, record the full-deck speaking arc, source-visual dispositions, and concrete cross-page corrections in `visual-review.json`.
11. Verify source traceability and brand authenticity.
12. Run `scripts/validate_evidence_visuals.mjs` when an evidence registry is present; for dataset-led work also verify transform provenance and the privacy review.
13. For new dataset semantic v3 work, run `scripts/validate_audience_copy.mjs` against the built artifact and evidence registry.
14. Run `scripts/export_pdf.mjs` when PDF delivery is requested.
15. Visually inspect the exported PDF and its validation report.
16. Publish only through the authorized workflow and inspect built assets for private data.
17. Report remaining low-resolution assets, placeholders, unsupported claims, untested dependencies, or visual-inspection limitations.

For explicit `scroll-report`, replace deck-only runtime/render/PDF steps with `validate_report_runtime_contract.mjs`, report-mode `audit_layout.mjs`, and `render_report.mjs`. Keep the same evidence registry, source traceability, privacy review, two-pass visual inspection, and approval gate. Do not run or weaken DeckRuntime validation merely to make a report pass; run deck regression separately.

## 10. Dataset chart and BrandGeometryAudit

For dataset reports, use browser interaction rather than static source matching to verify:

- exact-value tooltip or equivalent accessible value disclosure;
- metric/group/method switching without a hidden baseline or changed domain;
- series/legend focus and linked evidence updates where declared;
- reset restoring exactly the declared `resetState`;
- `prefers-reduced-motion` selecting the declared reduced state without losing the conclusion;
- `?print=1` selecting the declared deterministic `printState` regardless of the last live interaction;
- chart ready state in Audience, Presenter preview, and Print from one data source.

Audit Canvas, SVG, and HTML chart bounds, overlay/tooltip safe areas, axis/label font size, annotation and reference-line placement, common comparison scale, and control overlap. A static Type A chart requires a recorded analytical reason.

Run `BrandGeometryAudit` for enabled logos during prototype and final QA; explicit unbranded projects must contain no brand-only nodes. For cover, one representative content page, and closing, record the source image dimensions, alpha/non-transparent source bounds, fitted content bounds, rendered painted width/height, `object-fit`, source/rendered aspect ratios, crop/distortion risk, overlap, and cross-role consistency. When the ZUEL profile is enabled, its lockup must use the bundled official asset and the role-specific painted-size ranges in [zuel-branding.md](zuel-branding.md); `object-fit: cover` is a blocking failure.

Also record painted left/top/right/bottom bounds, top/right clearances, CSS-box-to-painted-area ratio, and cover-to-closing anchor deltas. Painted placement and cross-role alignment are blocking geometry checks, not a discretionary note.

## 11. Scroll-report runtime and responsive QA

Apply this section to every explicit `outputMode: "scroll-report"`; analytical companion/health/flow checks remain conditional on their enabled dataset features. General mode additionally tests toolbar, notes, case/tab reset and offline text editing. Use real browser interaction, not source keywords, to verify:

- when `analysisCompanion.enabled` is true, the assistant begins collapsed, uses only approved aggregate questions, refuses unsupported requests, restores default scope, persists reader notes separately, and disappears from formal print; when disabled, there is no empty assistant entry. Follow [analysis-companion.md](analysis-companion.md).

- one `[data-report-runtime="ReportRuntime"]` consumes the manifest `sections` source;
- the left navigation is visible at desktop widths, maps one-to-one to section IDs, and does not behave as a filter panel;
- activating a navigation item scrolls to its section, moves focus safely, and updates `#section-id`;
- natural scrolling updates exactly one `aria-current` item through scrollspy;
- refresh, hashchange, and browser back/forward restore the correct section;
- reading progress derives from document position and reaches completion;
- the back-to-top control is keyboard accessible;
- at narrow width, the navigation collapses to a discoverable button/drawer, closes with Escape, and does not squeeze or cover evidence;
- there is no page-level horizontal overflow at desktop or narrow widths;
- sticky navigation/header elements do not obscure section headings, audited brand marks, charts, legends, tooltips, overlays, or the report footer;
- chart tooltip, switch, highlight, linked evidence, and reset hooks declared in the manifest are genuinely exercised;
- reduced motion disables smooth scrolling and transitions while preserving all conclusions;
- `?print=1` applies every chart's declared print state, waits for `data-report-ready="true"`, preserves section order, and hides navigation, reading progress, back-to-top, tooltips, temporary focus, and chart controls;
- when branding is enabled, report hero, any branded report header, and report closing pass the selected profile's painted-bound ranges; unbranded reports need no logo.
- ordinary sections use content-driven height and restrained boundaries; adjacent section gaps and empty tails stay within the browser-audit thresholds, and content/plot occupancy does not indicate stacked-slide composition;
- every navigation item maps to a section with substantive contribution metadata rather than Gate/privacy/Source Lock/runtime/QA filler;
- the default complete lockup appears in hero and closing only, with no duplicate institution text; ordinary report sections do not repeat it.

Render and inspect a full-page desktop image, individual section screenshots, and a narrow-screen navigation view. Check narrative rhythm and finding prominence separately from detail geometry. The report remains a finite academic narrative; abundant scrolling space does not justify field dictionaries, routine quality output, repeated cards, or dashboard density displacing the primary answer.

## 12. Audience comprehension review

Run this review for new `datasetSemanticVersion: 3` slide decks and scroll reports after semantic validation and again on rendered output. For every substantive title, chapter/navigation label, lead, chart/module heading, takeaway, and synthesis statement verify:

1. it identifies the data object or analytical subject without relying on body text;
2. a result statement gives the available value, direction, range, rank, or comparison;
3. its `titleBasisIds` or `takeawayBasisIds` resolve to data, method, result, finding, or claim records;
4. it describes the analysis, not why the author included a page;
5. it does not expose Gate, QA, manifest, runtime, evidence-status, adequacy, or leakage-audit vocabulary;
6. a presenter or reader can understand it without asking an AI to decode the sentence;
7. it is no longer than needed to state the concrete fact;
8. the unit provides enough substantive value to remain independent.

If items 1, 4, 6, or 8 fail, rewrite, merge, or delete the unit. If a limitation does not materially change model selection, metric interpretation, application, credibility, or inference scope, merge it into the result, inference, feature-contribution, or synthesis unit. Run `scripts/validate_audience_copy.mjs` as semantic/browser-assisted evidence; do not treat its phrase heuristics as a replacement for the rendered human review.

## 13. Local-authoring regression and complete-stage capability gates

New scaffold projects request authoring by default. Read [lightweight-editing.md](lightweight-editing.md), run `scripts/validate_edit_patch.mjs`, and exercise the real local page rather than checking only for source tokens:

- Initial state: Authoring is enabled, compact `编辑 E` is visible, the full workspace is absent/collapsed, the cover is unobstructed, and E shares the deck's bottom row with `目录 M`, `全屏 F`, and `演讲者视图 P`.
- Expand/collapse: clicking E opens the workspace; clicking E again or exiting removes it without a placeholder, transparent hit area, focus target, canvas-rescale, or abnormal scroll; typing E in an editable field does not toggle the workspace.
- Coverage: cover, titles, body, lists, cards, labels, tables, takeaways, captions, sources, citations, nested ordinary text, complex pages, decisive-result pages, closing text, and stable SVG text can all be edited; reverse-scan every page/section for uncovered ordinary visible text; confirm field IDs are unique and deterministic.
- Save: edit ordinary body text, a title, cover/decisive-result text, arbitrary incorrect test text, Chinese punctuation, special symbols, and long text; save while the field still has focus; require a clear success state, reload, and confirm the values persist; only technical write/serialization/path/project-integrity failures may report save failure.
- History: verify Undo, Redo, Reset, and re-save after reload. Evidence or layout notices may remain as non-blocking post-save status and must not disable local text editing or saving.
- Output boundary: ordinary production/static/file delivery contains the compact editor entry and supports browser-local Save/Reload; Presenter View, Print, and PDF hide the editor entry, panel, styles, outlines, and handlers while preserving effective content. Directory, paging, fullscreen, report navigation, and Presenter behavior remain intact.

When `requestedCapabilities.authoring` is `required`, a skipped editor-runtime check is a complete-stage failure. Then rerun the unchanged output-specific runtime, evidence, audience-copy, layout, render, visual-inspection, and PDF checks against the effective `Base + Patch` output. Patch-schema success alone is never release approval.

At complete stage, every substantive slide/section must have a distinct primary `NarrativeUnit` with a substantive contribution and local evidence basis; generic claim reuse is a failure. A machine-readable `visual-review.json` must contain one composition/detail review record per substantive unit (plus any explicitly reviewed cover/closing), with density, title, plot occupancy, evidence weight, and overflow statuses. Missing records, hidden MUST_SHOW metrics in the default/reset/print state, hard-coded page numbers, title collisions, sparse lower halves, skipped authoring checks, and any audit failure block release. The browser pre-fills measured values, but a reviewer still records the final judgment.


## Data health for new dataset scroll reports

New explicit dataset scroll reports default to a collapsed data health entry. Follow [data-health.md](data-health.md) for local generation, declared-field rules, coverage, usage, privacy, and runtime/print QA. Derived diagnostics refer to the existing Shared Evidence Core and citations; pending scaffold content is not deliverable. Slide decks and existing projects retain their behavior.
