# Research evidence policy

## Contents

1. Material inventory
2. Claim–evidence map
3. Evidence status
4. Insufficient-material decisions
5. Attribution and provenance
6. Scientific integrity
7. Visual representation and data provenance

## 1. Material inventory

Inspect every supplied artifact before outlining slides. Build a private inventory with:

- `source`;
- `role`;
- `claim`;
- `evidence`;
- `status`;
- `quality`;
- `dimensions` and aspect ratio for images;
- `crop constraints`;
- `intended slide`;
- `open question`.

For scientific visuals, also record a `visualId`, `sourceHash`, linked claim IDs, `evidenceStatus`, `representationStatus`, treatment level, treatment rationale, default state, print state, and limitations. Use the canonical schema in [evidence-visualization-schema.md](evidence-visualization-schema.md); do not create a second claim system.

For a paper-led deck, enumerate every numbered figure and table in the supplied paper before the storyboard is approved, including illustrative examples and framework tables. Record its source locator, role in the paper, candidate speaking job, and one disposition: `use-original`, `faithful-reconstruction`, `reformat-from-verified-data`, `backup`, or `omit` with a specific reason. Link selected items to the existing claim/evidence map; an omitted item does not need a new VisualEvidenceRecord. Do not turn an illustrative example into a study finding. Before release, reconcile this inventory against the complete slide plan: a decisive result cannot be replaced by decorative numbers or generic cards merely because its source values were transcribed. This is an evidence-selection gate, not a minimum chart or image quota.

Classify material roles:

| Role | Use | Do not do |
|---|---|---|
| Content evidence | Support claims with data, figures, equations, methods, photos, or tables | Treat decorative screenshots as quantitative proof |
| Visual reference | Derive hierarchy, density, spacing, and composition | Copy its topic, people, logo, or obsolete text |
| Brand reference | Establish institution, logo, standard type, and palette | Infer the presenter institution from a cited author |
| Context | Explain background or stakes | Let context displace or prove the central research claim |

Preserve private provenance without exposing local file paths in audience-facing slides.

## 2. Claim–evidence map

Build a claim–evidence map before writing pages.

| Field | Required question |
|---|---|
| Claim | What must the audience understand or believe? |
| Evidence | Which data, figure, equation, citation, or observation supports it? |
| Status | How directly does the material support the claim? |
| Interpretation | What does the evidence mean? |
| Boundary | Under which conditions is the claim valid? |
| Consequence | Why does it matter to the research decision? |
| Source | Where can the claim be traced? |

Do not create a substantive slide with no narrative job. Do not create a conclusion without evidence or an explicit expected/hypothesized label.

## 3. Evidence status

Assign one of these statuses to every non-trivial research statement.

### `DIRECT`

Use for values, figures, tables, equations, methods, observations, or conclusions directly reported in the supplied material.

Preserve exact values, units, sample sizes, statistical tests, uncertainty, experimental conditions, and applicability boundaries. Do not broaden the original conclusion.

### `DERIVED`

Use for content recomputed, aggregated, normalized, translated into another representation, or otherwise derived from supplied material.

Record the inputs and transformation privately. Do not present a derived result as a verbatim or directly reported source conclusion. Disclose the derivation when it changes interpretation.

### `CONTEXTUAL`

Use for background, domain context, motivation, or explanatory framing that does not prove the core research claim.

Context may establish stakes. It may not replace direct evidence or independently prove a result.

### `EXPECTED` or `HYPOTHESIZED`

Use for plans, proposals, forecasts, intended deliverables, untested mechanisms, or expected results.

Label the audience-facing content explicitly as expected, hypothesized, planned, preliminary, or pending validation. Never use completed-result wording.

### `UNSUPPORTED`

Use when the available material does not adequately support a statement.

Do not present unsupported content as research fact. Omit it, mark the absence, relabel a genuine hypothesis, or ask the user when the missing information materially changes the argument.

## 4. Insufficient-material decisions

When a conventional section lacks support, choose the least misleading action:

1. omit the section when it is not essential;
2. state that the supplied material does not report it when the absence matters;
3. label a genuine plan, hypothesis, or expected result accurately;
4. ask one concise question when the missing answer is essential to the main argument.

Apply these rules explicitly:

- Missing limitations: do not invent limitations merely to complete a thesis template.
- Missing mechanism: do not convert a plausible explanation into a confirmed mechanism.
- Incomplete project: do not fabricate final data or outcomes.
- Literature report: attribute the source authors' methods, experiments, and findings to them.
- Missing innovation: do not rename ordinary tasks as innovation.
- Missing reporting institution: do not infer it from cited affiliations. New projects default to no institutional logo; omit unavailable presenter/unit fields without placeholders. Enable ZUEL only on an explicit logo request, following [branding.md](branding.md). A non-ZUEL subject remains supported. Ask only when a requested logo materially conflicts with the declared reporting identity.
- Correlation only: do not claim causality without support.
- Low-resolution evidence: disclose the limitation rather than fabricating detail.

## 5. Attribution and provenance

Maintain a private source map from every non-trivial claim and external figure to its origin. Record page, figure, table, sheet, row, cell, or image file identifiers when available.

For a literature review, distinguish clearly among:

- source-author claims;
- directly reported evidence;
- the presenter's summary;
- the presenter's evidence-grounded evaluation;
- unsupported speculation.

Never expose private local paths on audience-facing slides. Use the single Citation Registry and concise markers, source footers, or a reference list according to [citation-and-source-rendering.md](citation-and-source-rendering.md).

## 6. Scientific integrity

- Preserve exact values, units, uncertainty, sample sizes, statistical tests, and conditions.
- Label simulated, illustrative, preliminary, expected, hypothesized, derived, and measured results accurately.
- Never invent authors, institutions, awards, citations, datasets, equipment, experiments, mechanisms, innovations, limitations, or outcomes.
- Do not infer causality from correlation without support.
- Do not turn decorative or low-resolution screenshots into apparent quantitative evidence.
- Preserve axes, legends, scale bars, subfigure labels, and original scientific context.
- Prefer authentic evidence or exact reconstruction over a plausible-looking generic schematic.

## 7. Visual representation and data provenance

Keep research truth and presentation transformation separate:

- `evidenceStatus` describes the evidence itself: `DIRECT`, `DERIVED`, `CONTEXTUAL`, `EXPECTED`, `HYPOTHESIZED`, or `UNSUPPORTED`.
- `representationStatus` describes the visual form: `ORIGINAL`, `ANNOTATED`, `REFORMATTED`, or `RECONSTRUCTED`.

A value reported in a paper table may be `DIRECT`; an HTML chart generated from that table is `REFORMATTED` or `RECONSTRUCTED`; a new statistic computed from those values is `DERIVED`. Never describe a regenerated chart as the paper's original figure.

For datasets, preserve the original files unchanged and record every filter, aggregation, calculation, normalization, imputation, and sample operation as a transform with inputs and outputs. Never silently remove observations. Keep original observations, derived statistics, interpretive claims, and derived visual representations distinguishable and cross-referenced. Follow [scientific-evidence-visualization.md](scientific-evidence-visualization.md) for visual fidelity and [dataset-analysis-and-storytelling.md](dataset-analysis-and-storytelling.md) for standalone dataset analysis.
