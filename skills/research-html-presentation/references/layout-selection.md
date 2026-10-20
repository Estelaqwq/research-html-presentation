# Content-to-layout selection

## V2 silhouette contract

L01–L24 continue to describe content relationships. Separately record one real body silhouette: `dominant-figure-aside`, `figure-support-matrix`, `comparison-bridge`, `process-board`, `evidence-table-board`, `chart-interpretation-strip`, `hierarchy-map`, `synthesis-matrix`, `multi-panel-evidence`, or `text-structure-board`.

Record dominant visual position/area, primary and secondary region counts, full-frame and open-region counts, container forms, conclusion-band use, image/text ratio, fixed-right-aside use, and whether the page is genuinely isomorphic with either prior page. An 8–12 page deck needs at least five real silhouettes and four container forms. Do not repeat one silhouette or left-figure/right-aside more than twice consecutively. Changing only the L ID, padding, or label color does not count as variation.

Compare rendered bodies across the whole deck after mentally removing the shared header, logo, controls, and footer. A body is visually isomorphic when its evidence form, major region proportions, reading path, and conclusion treatment remain substantially the same, even if its L ID, `bodySilhouette`, CSS class, color, or `data-silhouette-role` differs. Consecutive rows of short text or KPI values in pale horizontal bands are not distinct visualizations of different research questions. If two adjacent pages repeat that grammar, merge a weak page or redesign one around its actual figure, table, interval, comparison, or argument relationship. Equal cards are appropriate only for genuinely comparable peer evidence.

Rendered V2 bodies must prove that record with `data-silhouette-role` landmarks. Use the roles required by the browser quality contract; place them on the actual visible regions, not on hidden metadata wrappers. The outer `data-structure-panel` marks an audit boundary only and never counts as substantive paint.

## Contents

1. Selection procedure
2. Layout vetoes
3. Relationship decision tree
4. Layout library
5. Sequence rules

## 1. Selection procedure

For each slide:

1. Write the one claim the audience should retain.
2. Classify the relationship: causal, comparative, sequential, hierarchical, tabular, spatial, image-led, model-led, or evidence–mechanism.
3. Identify the main visual center and rank evidence units by importance.
4. Record image aspect ratios, crop constraints, minimum readable sizes, text lengths, and formula dimensions.
5. Select the simplest layout that preserves the relationship and readability.
6. Assign explicit columns, rows, and body-height arithmetic for complex pages.
7. Write a `VisualPlan` and choose a `compositionProfile` (`standard` or `compact-academic-board`) before implementation.
8. Apply the vetoes below before implementation.

Do not start from a favorite silhouette and force the material into it.

## Title geometry and body occupancy contract

Every slide title declares a `data-title-mode`: `single-line` titles stay on one line, while `two-line` titles use a dedicated two-row header whose `--header-height`, `--lead-top`, and `--body-top` move together. A title may not collide with the logo, header rule, lead, body, or control hint, and a second line may not be an orphaned character or very short phrase. Never solve a collision by negative tracking or sub-18px body text.

For substantive content slides, choose a silhouette whose evidence can occupy the safe body. The browser contract measures qualified semantic module geometry for page coverage and separately measures painted descendants inside each module; it does not count an empty outer background or frame. `contentOccupancy` must be at least 0.70 at complete stage, each evidence wrapper should reach 0.60 internal occupancy, and lower-half coverage should reach 0.45. A prototype may report the 0.60–0.70 band as a warning, but values below the prototype hard floors are blocking before user review. If evidence is insufficient, add a real comparison, interval, sensitivity result, matrix/table, or explanation, then merge the weak page or shrink its container; never add decorative KPI cards or stretch a frame.

If a lower-half exception is scientifically or narratively necessary, declare `layoutRationale` or `densityException` on the manifest unit with a non-empty reason and `reviewedBy`/`basisIds`. The browser audit records that rationale explicitly; it never infers an exception from an empty frame.

## 2. Layout vetoes

Reject the layout when any condition holds:

### Image geometry veto

- the decisive figure becomes too small to read;
- the figure occupies less than roughly two-thirds of its visual frame without a narrative reason;
- the container ratio requires a scientifically unsafe crop;
- axes, legends, labels, or scale bars disappear;
- a subfigure can only be shown by stretching the parent image.

### Evidence-weight veto

- decorative or explanatory regions receive more area than the decisive evidence;
- strongly unequal claims are placed in equal cards;
- a large value tile displaces the figure that proves the value.

### Text-length veto

- one column contains substantially more text than its peer;
- labels require multiple unplanned wraps;
- a table cell requires paragraph-length text;
- the layout fits only with body text below 18 px.

### Geometry veto

- auto-flow could reorder modules or make a sidebar span unintended rows;
- fixed row heights plus gaps exceed the body height;
- the bottom evidence/takeaway band overlaps the main composition;
- the same silhouette has already appeared twice consecutively without a strict experimental-series reason.

## 3. Relationship decision tree

- Establish necessity: **problem–evidence–need**.
- Compare equal approaches or samples: **three/four-column comparison** or **mirror comparison**.
- Show ordered stages: **horizontal route**; use **swimlanes** for parallel actors or streams.
- Explain an apparatus, algorithm, or mechanism: **main structure + side explanation**.
- Show calculation and validation together: **derivation board + evidence figure**.
- Pair observation and mechanism: **experiment–mechanism double column**.
- Expose variables and controls: **experimental design**.
- Prove one decisive result: **dominant figure + interpretation + evidence strip**.
- Show microscopy or multi-frame evidence: **primary image + supporting matrix** or strict matrix.
- Map categories to actions: **purpose-built table**.
- Close the argument: **synthesis**, followed by **formal closing**.

## 4. Layout library

| ID | Layout | Use for | Structure | Avoid when |
|---|---|---|---|---|
| L01 | Cover | Topic, context, identity | Dominant title band; concise metadata; authentic/default logo | More than one claim |
| L02 | Full-slide agenda | 3–6 meaningful sections | Structural rail + section rows + page spans | Deck is too short |
| L03 | Section transition | Major narrative shift | Large section title + one question | Data-heavy content |
| L04 | Problem–evidence–need | Background and necessity | Evidence, causal spine, research need | No causal connection |
| L05 | Three-path status | Comparable literature routes | Equal paths with evidence and limitation | Routes have unequal scope |
| L06 | Core question | Known facts vs unknown mechanism | Central question/model with evidence and unknowns | Only a task list exists |
| L07 | Task decomposition | Objective and 3–5 work packages | Objective, evidence-bearing tasks, outputs, validation | Dependencies are branched |
| L08 | Horizontal route | 4–6 sequential stages | Inputs, operations, outputs, closed-loop validation | Parallel actors dominate |
| L09 | Swimlane route | Parallel experiments/data/roles | 2–4 aligned lanes with milestones | Simple process |
| L10 | Main model + explanation | Apparatus, geometry, algorithm | Main structure in 7–9 columns; explanation in 3–5 | Figure remains unreadable |
| L11 | Experiment–mechanism pair | Data/theory or evidence/mechanism | `6/6` or evidence-weighted `7/5` | Regions are unrelated |
| L12 | Equal comparison | Processes, samples, methods | Equal columns with aligned metrics | Evidence weights differ |
| L13 | Multi-image matrix | Microscopy, time series, ablations | Main image + supports, or strict 2×3 | No comparison dimension |
| L14 | Experimental design | Variables, controls, sampling | Conditions + apparatus/flow + metrics | Only results exist |
| L15 | Dominant result | One decisive figure or chart | Large figure + interpretation + bottom evidence chain | Several unrelated results compete |
| L16 | Mirror comparison | Baseline vs method | Mirrored evidence + central/bottom delta | Conditions differ |
| L17 | Evidence table | Risk/action, method/limits | Table fills 70–85%; lead and implication | Cells need paragraphs |
| L18 | Key findings | One to three measured findings | Large value/judgment supported by visible evidence | Findings lack support |
| L19 | Innovation | Research increment | Existing limit → approach → evidence/value | Tasks are merely renamed |
| L20 | Team/foundation | Capability and project fit | Role–evidence map + platform strip | Portrait wall only |
| L21 | Expected outcomes | Deliverables and acceptance | Path → process → measurable outcome | Vague aspirations |
| L22 | Risk–response | Research/project risks | Trigger/impact → response | Risks cannot be paired |
| L23 | Synthesis | Answer the opening question | Findings + boundary + implication + next validation | New results appear |
| L24 | Formal closing | Discussion invitation | Invitation, available presenter/unit/date/research title; logo only when enabled | Used instead of synthesis |

### Scientific evidence mapping

Do not add evidence-specific layout IDs. Map the treatment to the existing relationships:

| Evidence treatment | Preferred existing layouts |
|---|---|
| Type A structured chart or data table | L11, L15, L16, L17, L18 |
| Type B structure, route, or architecture | L08, L09, L10, L11 |
| Type C immutable scientific image | L10, L11, L13, L15 |
| MIXED parent figure with typed panels | L11, L13, L15, L16 |
| Dataset structure or quality | L17 or L18; use L15 when one chart is decisive |

The mapping is advisory. Claim relationship, readable size, source fidelity, and the vetoes above remain decisive.

### Preferred dense compositions

- **Method board:** two evidence-bearing work-package rows plus one closed-loop verification band.
- **Derivation board:** aligned step labels and formulas plus a validating figure/table column.
- **Dominant result:** full readable figure, critical state or interpretation panel, and observation → mechanism → conclusion strip.
- **Synthesis matrix:** finding rows on the left, research-question answers on the right, and a closing control/logic chain.

### Primitive mapping contract

The L01–L24 IDs remain the relationship authority. Implementations may compose shared primitives rather than creating one bespoke component per ID:

| Relationship/layout family | Shared primitives | Required visual proof |
|---|---|---|
| L04/L06/L18/L23 | `ClaimBand`, `DenseSharedPanel`, `BottomConclusionBand` | claim → evidence → implication |
| L08/L09/L21 | `FlowDiagram`, route panels, `EvidenceStrip` | connected nodes, ports, direction, validation/feedback |
| L10/L11/L15/L16 | `ScientificEvidenceFigure`, dominant figure region, support matrix | decisive evidence gets the largest readable area |
| L14/L17/L22 | evidence table, comparison rows, risk-response bands | aligned columns and traceable basis |
| L19/L20 | hierarchy map, evidence table, nested shared-edge panels | increment/fit is evidenced, not renamed as a task |

Every primitive declares its primary region, evidence weight, and print behavior through semantic hooks. Do not satisfy a layout ID by drawing a row of equal SmartArt cards or arrow characters.

## 5. Sequence rules

- Use at least four content silhouettes in an 8–12 slide complete deck; fewer is a release failure.
- Do not use the same silhouette three times in a row unless it is a strict experimental series; otherwise complete-stage validation fails.
- Limit consecutive equal three-column pages to two.
- Preserve title anchors, logo placement, color tokens, line weights, and spacing while varying bodies.
- Vary through research relationships, not rotation, diagonal decoration, or arbitrary asymmetry.
- Give one slide one visual center; supporting regions must explain or validate it.
- Review a complete contact sheet for near-duplicate body compositions; passing the per-page silhouette counter never overrides visible cross-page repetition.
- Use dedicated structures for cover, agenda, section transition, synthesis, and closing.
