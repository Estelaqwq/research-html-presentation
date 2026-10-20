# Scientific evidence visualization

## Contents

1. Position in the research workflow
2. Figure processing pipeline
3. Treatment levels
4. Evidence types
5. Fidelity gate
6. Claim and provenance integration
7. Interaction and print behavior
8. Type-specific QA

## 1. Position in the research workflow

The Scientific Evidence Visualization Engine is an internal stage of the existing research-material workflow. Papers, reports, Word/PDF files, and existing presentations are still inspected through the established material-analysis and claim–evidence process. Figures, tables, diagrams, and photographs extracted from those materials then enter this engine. Do not require the user to upload embedded figures or tables again.

A separately supplied dataset uses the parallel Dataset-to-Deck Pipeline in [dataset-analysis-and-storytelling.md](dataset-analysis-and-storytelling.md). When research materials and a standalone dataset are both supplied, process them through their respective pipelines and merge their evidence through stable claim IDs. The presence of a table inside a paper does not change the presentation profile to `dataset-report`.

## 2. Figure processing pipeline

First enumerate all numbered source figures and tables in the material inventory, then give each a use/reconstruction/backup/omission disposition under [evidence-policy.md](evidence-policy.md). For every selected decisive visual:

1. Build a figure inventory: source, page/figure/table locator, original dimensions, caption, source hash when available, legibility, must-preserve elements, and candidate claims.
2. Classify it as Type A, B, C, `MIXED`, or `UNCERTAIN`.
3. Apply the fidelity gate before selecting a treatment.
4. Select the least transformative sufficient level from L0–L3.
5. Link the visual to the existing claim–evidence map through a `VisualEvidenceRecord`.
6. Select an existing L01–L24 layout according to the evidence relationship and geometry.
7. Implement audience interaction and a deterministic print state from one evidence source.
8. Run provenance, integrity, interaction, layout, and PDF checks.

A structured result table counts as source visual evidence even when the paper contains no ready-made chart. If that table carries a main finding, compare a legible original/reformatted table with a chart reconstructed from verified values and choose the form that best answers the slide's analytical question. Numeric cards alone do not constitute a visualization of a multi-row comparison. Preserve illustrative figures as examples, not observations from the reviewed sample. Do not force every source figure into the final deck; record why a secondary or redundant one was omitted.

Classification confidence does not override scientific risk. When data, topology, or image meaning is uncertain, fall back to L0 or L1.

## 3. Treatment levels

| Level | Name | Allowed treatment | Default use |
|---|---|---|---|
| L0 | Source Lock | Preserve and display the complete source evidence | Any uncertain or high-risk visual |
| L1 | Presentation Enhancement | Contain fit, authentic higher-resolution source, caption, layout, full-resolution zoom | A/B/C |
| L2 | Semantic Overlay | Separate HTML/SVG annotations, hotspots, ROI, module explanation, step highlighting | B/C and annotated A |
| L3 | Data-backed Reconstruction | Rebuild a structured HTML chart from traceable, verified data | Type A only |

L3 is not a visual-preference level. It is allowed only when the plotted values, labels, units, conditions, uncertainty, and transforms are traceable. OCR, pixel estimation, or plausible completion alone never qualifies.

## 4. Evidence types

### Type A — structured quantitative evidence

Examples include bars, lines, scatter plots, heatmaps, confusion matrices, metric comparisons, structured result tables, and charts generated from standalone datasets.

- Prefer an HTML chart when trusted source data, embedded chart data, or a verified structured table exists.
- Preserve values, units, sample sizes, errors, confidence intervals, significance, experimental conditions, axis domains, precision, and category order.
- Treat the research evidence status separately from its representation status. A directly reported table may be `DIRECT`; a new chart made from it is `REFORMATTED` or `RECONSTRUCTED`.
- If only a raster chart is available, preserve it at L0/L1 unless digitized values are independently verified. Do not attach exact tooltips to estimated pixels.
- Treat ROC, Kaplan–Meier, calibration, survival, cumulative-incidence, forest, and other geometry-bearing numbered figures specially. Explicit labels or summary values may support a verified L3 summary, but they do not reconstruct the source curves, thresholds, confidence structure, or panel geometry. Unless the complete plotted coordinates and encodings are independently available, keep an L0/L1 original or faithful crop in the audience slide or its directly linked zoom/companion view. A label-only bar chart, metric card, or table may accompany that source view but must not silently replace it.
- The default state must expose the decisive comparison. Interaction must not silently rescale axes, hide required controls, change calculations, or conceal contradictory evidence.
- Require explicit `defaultState` and `printState`.

For structured statistical data, use [scientific-plot-recipes.md](scientific-plot-recipes.md) for reusable components and the explicit interval/sampling-unit contract.

Use local ECharts through the provided adapter when the project needs Type A interaction. Do not use a CDN. Keep a semantic summary or accessible table for Canvas/SVG charts.

### Type B — scientific structure

Examples include model architectures, technical routes, experimental workflows, algorithms, and apparatus diagrams.

- Preserve the original structure by default and add interaction as a separate layer.
- Permit node focus, fragments, local explanation, and links from nodes to inputs, outputs, tasks, or validation.
- Do not infer and redraw topology from a raster image. Equivalent interactive reconstruction is allowed only from a reliable editable source such as SVG, Mermaid, Graphviz, or native presentation shapes, followed by node/edge/label verification.
- Interaction may highlight or explain; it must not move nodes, reverse edges, or remove context needed to interpret the system.
- Print the complete structure with static numbered explanations or a legend.

### Type C — complex scientific image

Examples include microscopy, medical imaging, experiment photographs, simulation fields, complex theoretical figures, and spatial or morphological evidence.

- Keep the base pixels immutable and preserve the source file.
- Permit contain fit, authentic high-resolution replacement from the same source, full-resolution zoom, ROI, callouts, and a separate HTML/SVG overlay.
- Prohibit AI super-resolution, inpainting, denoising, sharpening, recoloring, contrast or color-scale changes, background deletion, structural completion, and generated scientific detail by default.
- Do not cover scale bars, axes, orientation markers, diagnoses, legends, or subfigure labels.
- If enhancement, segmentation, or false color is itself supplied research evidence, show it as a separate `DERIVED` view; never replace the source image with it.

### `MIXED` and `UNCERTAIN`

- `MIXED`: a compound figure contains multiple evidence types. Process only panels whose boundaries and context are reliable; retain the parent figure, parent provenance, and a complete-source view.
- `UNCERTAIN`: the type, values, structure, or scientific meaning cannot be established safely. Treat it as Type C at L0/L1 until resolved.

## 5. Fidelity gate

Before L2 or L3, answer:

- Is the source and scientific role traceable?
- Are all values, units, categories, error encodings, and conditions available for a Type A reconstruction?
- Is the topology directly available for a Type B reconstruction?
- Are proposed Type C changes entirely separate from the source pixels?
- Does the treatment preserve evidence that qualifies or contradicts the retained claim?
- Can the live interaction be reduced to a deterministic print state without changing meaning?

If any required answer is no, choose a safer level and record the limitation.

## 6. Claim and provenance integration

Use the schema in [evidence-visualization-schema.md](evidence-visualization-schema.md). Every evidence visual requires stable claim links, its contribution, relation to the claim, treatment rationale, evidence status, representation status, source locator, must-preserve elements, and print behavior.

Do not create a second conclusion system. Claims remain in the existing claim–evidence map. Visual records reference those claims and may support, qualify, contradict, or contextualize them.

Keep source hashes and private local paths in project metadata, not audience-facing captions. Use concise audience citations or source labels.

## 7. Interaction and print behavior

- Interaction reveals, compares, or explains evidence; it does not create unrecorded evidence.
- Keep the initial state complete enough to understand the slide without interaction.
- Use fixed domains when comparison depends on a common scale.
- Preserve keyboard access, reduced motion, and accessible summaries.
- Mark every evidence visual with `data-evidence-visual`, its visual ID, evidence type, claim IDs, readiness, and relevant integrity hooks.
- Audience, Presenter View, screenshots, and PDF use the same visual record and underlying data.
- In print mode apply the declared `printState`, reveal necessary annotations, remove interactive controls, and wait for all SVG/Canvas/HTML visuals to report ready.

## 8. Type-specific QA

### Type A

- Trace every displayed value to a dataset, table, or recorded transform.
- Compare units, category order, domains, uncertainty, and precision with the source.
- For a geometry-bearing numbered source figure, verify that the original/faithful companion remains reachable in the default audience state or direct zoom, unless full coordinates and encodings justify a complete reconstruction.
- Verify default, interactive, reset, reduced-motion, and print states.
- Confirm that toggles cannot silently remove decisive comparison context.

### Type B

- Verify node, edge, direction, label, and step counts against the source.
- Confirm hotspots use normalized coordinates and remain aligned after scaling.
- Confirm focus never changes topology and print preserves the complete structure.

### Type C

- Verify source hash when available and require `data-pixel-immutable="true"`.
- Confirm annotations are separate, in bounds, and do not cover must-preserve features.
- Confirm the displayed image uses contain/scale-down unless a harmless crop is explicitly declared.
