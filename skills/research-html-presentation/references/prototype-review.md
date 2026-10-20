# Representative-page review

## V2 visual calibration

When visual references are available, the three-page prototype is the mandatory calibration point for cobalt saturation, compact title geometry, lead height, dominant visual placement, shared/open container ratio, line hierarchy, subtle shadow/gradient use, conclusion treatment, density, and page rhythm. Record the measured/observed contract before extending the deck. If a temporary reference path no longer exists, report it and do not claim calibration.

## Contents

1. Apply the checkpoint
2. Select three representative pages
3. Build with real evidence
4. Validate and present the prototype
5. Wait for approval
6. Use the manifest stage
7. Complete the deck

## 1. Apply the checkpoint

Use a three-unit prototype before building a new complete artifact. For `slide-deck`, the units are pages; for every explicit `scroll-report`, they are report sections. Apply it after material analysis, output-form/profile selection, evidence classification, narrative compression, `VisualPlan` creation, visual-contract/reference calibration, branding, and initial layout selection. A paper-led literature review also needs its full speaking storyboard and numbered figure/table dispositions before this checkpoint; the sample pages may come from non-adjacent final positions.

Do not apply it mechanically to a narrow revision of an existing deck. Reinstate it when the revision changes the cover, visual system, main layout grammar, evidence density, or overall composition.

Skip the user-facing pause only when the user explicitly asks for uninterrupted full-deck generation. Still build and inspect the same three page roles internally before propagating the design.

## 2. Select three representative pages

For `slide-deck`, build exactly these existing roles:

1. **Cover**: use `type: "cover"` and `layout: "L01"`. Preserve the established formal academic cover, hierarchy, brand region, spacing, and composition.
2. **Method or complex-structure page**: test dense organization, relationship-driven layout, type scale, alignment, process logic, and region weighting. If the material has no method or technical route, select the page with the most demanding structural relationship.
3. **Result or evidence page**: test decisive figure size, annotation, evidence hierarchy, interpretation, and restrained dark-red emphasis. For unfinished work, use a supported validation plan or central evidence page and label expected or hypothesized content accurately.

For `dataset-report` with `outputMode: "slide-deck"`, keep the cover as role one. Role two is **analysis design**: combine background and primary question with the data-processing flow, or use the most demanding analytical-design page. A quality page may fill this role only when quality materially controls the analysis. Role three is a **decisive result** that directly answers the primary analytical question with authentic data, a comparison baseline, one to three key annotations, meaningful interaction, and declared `defaultState`, `resetState`, `reducedMotionState`, and deterministic `printState`. Interaction count is not a substitute for an answer.

For predictive data, role two must establish dataset/file roles, target/task, actual missingness treatment, feature engineering, and model/validation pipeline; role three must show real validation, a baseline and task-appropriate candidate-family comparison, search-adequacy status, selected-model rationale, fold/split information, uncertainty or variation, and an evidence-bearing conclusion. Audit content/plot occupancy and reject a page whose lower half is narratively empty.

The dataset prototype must also prove that the Shared Presentation Layer is loaded: the directory entry is visible and usable, Presenter View opens, page/progress totals agree, the decisive chart exposes real runtime hooks and a ready state, reduced motion retains the conclusion, and print state is reproducible. When branding is enabled, run `BrandGeometryAudit` on the cover, the representative content page, and a temporary closing-role render when the complete closing is not part of the three-page prototype; measure painted logo bounds rather than only the `<img>` box.

Use two explicit `type: "content"` entries after the cover. Choose layouts from L02–L23 according to the evidence relationship; do not create prototype-only layouts.

For a general scroll report, use a hero and two representative substantive sections supported by the materials, such as work, method, comparison, progress or examples. No analytical result, CSV or model is required. Evaluate concise main copy, optional notes, toolbar, cases/tabs, resets, source scope and self-contained offline rendering. The same three-unit review does not prescribe a final chapter count.

For explicit `dataset-report` `scroll-report`, build exactly three sections:

1. `role: "hero"`: authentic/default identity, primary analytical question, direct-answer summary, and visible chapter navigation;
2. `role: "analysis-design"`: dataset scope, recorded transforms, analytical design, and interpretation boundary;
3. `role: "decisive-result"`: authentic data, a MUST_SHOW finding, baseline, one to three key annotations, meaningful interaction, and declared default/reset/reduced-motion/print states.

Prove ReportRuntime inheritance, click navigation, scrollspy, stable section hash, browser history, reading progress, accessible mobile navigation, chart reset, reduced motion, deterministic report print, and report-role BrandGeometryAudit when branding is enabled; unbranded output must contain no brand-only nodes. Do not require L01–L24, Presenter View, slide totals, or fixed-canvas navigation in this explicit mode, and do not stack slides vertically.

For predictive data, the three report roles are hero; dataset/task with actual preprocessing and model design; and decisive model validation with the same candidate-family evidence used by the deck. Also inspect adjacent-section continuity, content-driven height, plot occupancy, substantive navigation labels, absence of ordinary-section logos, and hero/closing institution-text duplication. Titles and module copy must state data, method, comparison, or result—not an internal gate or author-process instruction.

Run Audience Comprehension Review on both output modes. Read every major title, navigation/chapter label, lead, and takeaway without its body: it must identify the subject, and a result unit must expose a value, direction, or comparison when available. Verify its `titleBasisIds`/`takeawayBasisIds`, remove internal Gate/QA/manifest/runtime terminology, and merge or delete any independent unit that still explains report construction rather than data, method, result, inference, application, or an interpretation-changing limitation.

## 3. Build with real evidence

Use authentic project title, identity, claims, methods, figures, tables, formulas, and values whenever available. Do not use Lorem Ipsum, fabricated data, generic card walls, fake charts, or decorative placeholders.

Apply [evidence-policy.md](evidence-policy.md) to every claim. A representative page validates the real deck system; a visually polished placeholder does not.

For `slide-deck`, keep the fixed `1600 × 900` canvas, high-information-density academic style, default unbranded or explicitly selected branding decision, existing L01–L24 layout system, and all image-geometry vetoes. For explicit `scroll-report`, preserve the same evidence hierarchy, identity decision, chart theme, image fidelity, and geometry vetoes while using the report layout contract in [dataset-scroll-report.md](dataset-scroll-report.md).

## 4. Validate and present the prototype

Before showing the pages:

1. run the project build;
2. validate the prototype manifest and evidence registry;
3. run the matching deck or report browser runtime validation;
4. run overflow and layout audit;
5. render all three deck pages at 1600 × 900, or every report section plus desktop/narrow report views;
6. inspect composition and detail;
7. fix known overflow, crop, type, alignment, branding, or evidence problems.

Do not present a representative method/process or result page while browser review reports a blocking prototype density finding. In particular, correct a dominant visual that is too small for its host, substantive content ending before the lower body, ordinary body copy below 18 px, or an unexplained large gap between the main visual and supporting evidence. A successful build, schema pass, or zero-overflow result is not visual approval. Ordinary non-blocking warnings may remain only when the page is still readable and the warning is stated to the user.

Show all three rendered pages to the user. Explain briefly what each page tests:

- cover: title hierarchy, identity, and overall visual direction;
- method/structure: dense information organization and relationship clarity;
- result/evidence: figure prominence, annotation, and conclusion hierarchy.
- dataset result: direct answer, comparison baseline, real interaction/reset, reduced-motion readability, and deterministic print state;
- shared runtime and brand: visible controls, Presenter opening, page/progress derivation, and painted logo geometry.

Do not claim that the complete deck already exists.

When a user supplies visual references, attach a `referenceCalibration` record to the prototype review. It must use the canonical `checked` values `titleGeometry`, `bodySilhouette`, `dominantVisual`, `imageTextRatio`, `sharedEdgeBehavior`, `accentPolicy`, and `prohibitedTraits`, and include an `evidence` path to a rendered side-by-side screenshot or contact sheet. Browser audit may initialize this record only as `pending`; only an actual visual comparison can set it to `reviewed`. A manual `compositionReviewed=true` cannot override an automatic layout-audit failure.

## 5. Wait for approval

Stop after presenting the validated representative pages. Ask for confirmation or revision direction. Do not generate the remaining pages, complete-stage manifest, or final PDF until the user approves the design direction.

Treat requested corrections as prototype iterations. Re-render and show the affected representative pages again when the change materially affects the visual contract.

When a correction exposes a reusable failure mode, add a regression fixture or browser-backed example before propagating the revised system. Prefer a narrow check for the demonstrated failure over a generic instruction such as “make the page fuller.”

## 6. Use the manifest stage

Record:

```json
{
  "stage": "prototype",
  "prototypeApproval": {
    "status": "pending",
    "reviewedPrototypeIds": [],
    "reviewEvidence": []
  }
}
```

In `prototype` stage for `slide-deck`:

- require exactly three slides;
- require the first slide to be an explicit L01 cover;
- require slides two and three to use explicit `type: "content"`;
- retain ID, title, section, fragment, layout-range, repetition, and basic QA checks;
- do not require synthesis or closing;
- report that the artifact is not ready for complete-deck delivery or PDF export.

In `prototype` stage for explicit `scroll-report`:

- require exactly three sections;
- require roles `hero`, `analysis-design`, and `decisive-result` in that order;
- require the decisive section to cite a MUST_SHOW finding and visual;
- retain ID, chapter, claim/finding/visual, navigation, interaction, privacy, brand, and responsive QA;
- report that the artifact is not ready for complete-report delivery or formal report print.

Use `stage: "complete"` after approval and change `prototypeApproval.status` to `approved`, recording exactly three reviewed prototype IDs plus the user-visible review message or contact-sheet path in `reviewEvidence`. When the user explicitly waived the pause, use `status: "waived"`, retain the three internally reviewed IDs/evidence, and record the request in `decisionNote`. New projects cannot enter complete stage with `pending` or missing approval metadata. Treat an omitted stage and output mode as `complete` and `slide-deck` only for legacy manifests.

## 7. Complete the deck

After approval:

1. preserve the approved cover and visual contract;
2. propagate the approved density, typography, evidence hierarchy, and layout logic;
3. build the remaining pages from the approved narrative and evidence plan;
4. change the manifest to `stage: "complete"`;
5. restore all profile-driven synthesis and closing requirements;
6. run full-deck validation and visual QA;
7. export PDF only after the complete-stage checks pass.

Approval authorizes propagation of the agreed system, including the selected `visualStyle`. It does not authorize fabricated evidence, removal of the cover, an unapproved style change, or weakening of the fixed academic contract.

Approval of three representative pages is not approval of the unseen pages or of their final sequence. Before complete-stage release, render an all-page contact sheet and inspect it with repeated header, logo, footer, and runtime controls discounted. Ask whether each page has a distinct speaking job and evidence center, whether the argument can be presented in order, and whether adjacent text cards, KPI tiles, or horizontal strips have become visually isomorphic. Correct weak or repetitive pages even when individual layout and density validators pass; record the concrete correction in the visual review.
