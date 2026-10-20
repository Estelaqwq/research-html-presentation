# Material-adaptive visual composition contract

## V2 reference calibration and flow grammar

When references exist, `referenceVisualContract` records source refs, primary/supporting colors, saturation profile, title geometry and height, lead treatment, dominant visual position, image/text ratio, container forms, independent-card count, shared-edge ratio, line hierarchy, shadow intensity, gradient policy, conclusion-band form, silhouette distribution, largest meaningless whitespace, and prohibited traits. Missing reference files must be reported; never infer calibration from a vanished temporary path.

For the cobalt academic board, learn saturated blue hierarchy, compact headings, dense evidence without smaller body text, real figures/charts/structures as the center, ribbons/open or dashed regions, pale gradients, subtle shadow, varied silhouettes, and restrained red. Never copy a reference logo, institution, project content, scientific figure, value, or claim. Green layouts may inform hierarchy only; their color is excluded.

FlowSpec supports horizontal, vertical, branch/merge, swimlane, feedback-loop, input–process–output–validation, main-flow-with-evidence, and radial-mechanism layouts. Use SVG paths and explicit ports. Primary, secondary, and feedback paths remain visually distinct; branch, merge, and feedback topology must be real. Vary node size by role/evidence weight and occupy the main evidence region. Arrow characters and unrelated connected text boxes are invalid substitutes.

This contract is the shared planning authority for visual composition. It applies to every supported input: papers and figure-heavy PDFs, Word reports, existing presentations, standalone datasets, project/grant materials, plain text, and mixed collections. It does not replace the evidence policy, the L01–L24 relationship library, Type A/B/C fidelity rules, or either runtime.

## 1. Visual planning before layout

Each `NarrativeUnit` receives a `VisualPlan` before a layout ID is selected. The plan records:

```ts
type VisualCenter =
  | "dominant-scientific-figure" | "structured-chart" | "comparison-table"
  | "equation-validation" | "evidence-matrix" | "mechanism-diagram"
  | "technical-route" | "hierarchy-map" | "before-after-proof"
  | "claim-evidence-conclusion" | "text-led-structured-board";

type MaterialVisualKind =
  | "scientific-evidence" | "data-evidence" | "authentic-project-proof"
  | "explanatory-structure" | "ordinary-narrative" | "decorative";

type VisualPlan = {
  coreClaim: string;
  evidenceKinds: MaterialVisualKind[];
  availableVisualIds: string[];
  visualCenter: VisualCenter;
  primaryVisualIds: string[];
  evidenceWeight: Record<string, number>;
  preserveWholeFigure: boolean;
  extractableSubfigures: string[];
  needsZoom: boolean;
  textOnlyRelationship?: "causal" | "comparative" | "sequential" | "hierarchical" | "tabular" | "spatial" | "argument";
  mergeOrBackupIds: string[];
  omissionReasons: Array<{ id: string; reason: string }>;
};
```

The planner answers, in order: the page's claim; available direct figures/tables/formulas/photos/screenshots; whether a traceable chart can be rebuilt; whether a compound figure can be safely separated; whether the complete source must remain; the true relationship when no image exists; the evidence that deserves the largest area; and which units should merge, move to backup, or be removed. It must never add a decorative image just to satisfy an occupancy rule.

Material adaptation is mandatory:

- a real scientific figure, chart, formula, photograph, screenshot, or table is the visual center when it carries the claim;
- structured data uses a traceable chart/table and keeps the analytical question, baseline, units, uncertainty, and conclusion visible;
- a verified project interface or output may be shown as authentic project proof with a source locator;
- text-only material uses a relationship-faithful flow, hierarchy map, matrix, equation board, or claim–evidence chain;
- ordinary narrative and decorative elements never count as scientific or data evidence.

## 2. Composition profiles

`visualStyle` controls appearance. `compositionProfile` controls page geometry and is independent of skin:

- `standard`: compatibility-first use of existing layouts and spacing.
- `compact-academic-board`: optional dense research-board grammar inspired by supplied references: compact header, thin claim band, shared-edge regions, variable evidence weights, nested figure/supporting text, and an optional bottom conclusion band.

The compact profile is selected only when material density, audience, reference calibration, and figure legibility support it. It is not a request to make every page a card wall, to shrink body text, or to copy a reference topic, logo, data, image, or conclusion.

For either profile:

1. the title states the object plus its question, action, comparison, result, or boundary;
2. the lead is an optional reading entry (problem, hypothesis, or judgement), not a repeated title;
3. the body is the evidence-bearing work area;
4. the takeaway is optional and adds an implication, boundary, or design consequence;
5. the primary region count is normally 2–4, with nested subregions allowed;
6. area follows evidence weight, not default symmetry;
7. shared edges and continuous bands are preferred to unrelated bordered cards;
8. a figure with axes, legends, scale bars, or subfigure labels receives enough area for those elements to be read;
9. empty space is allowed only when it has a declared scientific/narrative reason;
10. the lower half must carry real evidence or a declared exception.

Use a two-line title only after wording compression fails. If the second line creates a large right-side void or reduces the evidence below its readable size, shorten or split the page instead.

## 3. Audience language review

Run the comprehension review for every profile and both output modes, not only dataset v3. A result title should expose a value, direction, ranking, difference, relationship, or supported conclusion when available. Methods name the object and technical action. Plan/expected content is explicitly marked. Phrases such as “进一步完善”, “全面提升”, “形成能力链”, “作品展示”, “相关内容”, and “总体介绍” may occur only with a concrete object, action, evidence, or boundary; they cannot be the page conclusion alone.

Title, lead, and takeaway have different jobs and do not repeat one another. Remove any sentence that adds no problem, method, evidence, result, boundary, implication, or consequence. Use English only for formal names, methods, software, models, and abbreviations. Academic rewriting preserves the source's facts, status, uncertainty, and evidence boundary.

## 4. FlowSpec contract

Use a deterministic HTML/SVG flow when the claim is genuinely sequential, causal, parallel, or feedback-based:

```ts
type FlowSpec = {
  id: string;
  nodes: Array<{
    id: string;
    role: "input" | "process" | "output" | "validation" | "decision" | "evidence" | "feedback";
    label: string;
    group?: string;
    evidenceRef?: string;
    emphasis?: "normal" | "critical" | "expected";
  }>;
  edges: Array<{
    from: string;
    to: string;
    label?: string;
    kind: "primary" | "secondary" | "feedback";
    directed: boolean;
  }>;
  readingOrder?: string[];
  printState?: "complete" | "numbered";
};
```

Validators resolve every `from`/`to`, require a non-empty main path, reject meaningless isolated nodes and duplicate IDs, and check that the declared reading order resolves. The renderer uses real node ports and SVG paths/markers; arrow characters plus unrelated boxes are not a flow. Input/process/output/validation roles are visually distinct, feedback uses a separate line style, labels do not overlap nodes, and print keeps the complete topology. Type B scientific structures may only be reconstructed from an editable/traceable source; a raster image remains Source Lock or Presentation Enhancement with a separate annotation layer.

Edge labels are optional relationship evidence, not decoration. Render one only when it adds a verb, condition, threshold, decision, or other relation that is not already stated by the adjacent nodes. Omit labels that merely repeat a node role, stage name, or value. A necessary label stays on the connector near its semantic midpoint; do not move labels into a detached top row merely to escape overlap, and do not turn ordinary connector copy into bordered chips. For a mainly horizontal edge, the clear node-to-node gap must be at least the rendered label width plus 24 px side clearance and 18 px arrow/marker reserve. If that space is unavailable, widen the host, shorten or remove redundant wording, or revise the node geometry before shrinking type.

Every rendered edge exposes `data-flow-from`, `data-flow-to`, and, when a visible label exists, `data-flow-edge-label`. Its single path must reach the visible source and target node boundaries without an unexplained break. In a dominant horizontal process, the main node span occupies at least 82% of the process host width and its left/right outer margins differ by no more than 5% of host width or 24 px, whichever is larger. Labels may use a restrained background-colour halo for line separation, but no floating label lane, opaque block, or connector fragmentation.

For a `process-board` whose flow is the page's dominant visual, use `presentation: "hero"` or an equivalent custom geometry. The dominant process must span at least 80% of the safe body width and 28% of its height; its nodes must occupy at least 30% of the process host. Use the optional node `eyebrow`, `detail`, and `value` fields to create a readable hierarchy instead of compressing stage, explanation, and sample size into one small label. A compact standard FlowDiagram may support a page, but it may not serve as the dominant process while leaving the surrounding body empty.

Process hosts use flow-specific geometry instead of the generic evidence-wrapper fill threshold. Audit node occupancy, main-path span, balanced outer margins, endpoint continuity, label fit, supporting-evidence gap, and overall body coverage. Do not enlarge nodes solely to make `internalOccupancy` reach the 60% chart/table threshold; that metric is `not-applicable` to a correctly identified process host.

## 5. Reference Visual Contract

When the user supplies reference images, record a machine-readable `referenceVisualContract` before propagation:

```ts
type ReferenceVisualContract = {
  sourceRefs: string[];
  titleGeometry: string;
  headerHeight: string;
  leadTreatment: string;
  bodySilhouette: string;
  primaryRegionCount: number;
  secondaryRegionCount?: number;
  dominantVisualPosition: string;
  imageTextRatio: string;
  figureDensity: string;
  sharedEdgeRatio: string;
  independentCardCount: number;
  bottomConclusionBand: "present" | "optional" | "absent";
  accentPolicy: string;
  logoRole: string;
  largestEmptyRegion: string;
  prohibitedTraits: string[];
  calibrationStatus?: "pending" | "reviewed" | "failed";
};
```

Prototype comparison checks visual center, evidence area, image/text relationship, card-wall drift, title/lead height, readable body area, lower-half whitespace, relationship-led organization, and topic/brand non-copying. The contract is interpreted by material type: figure-led pages compare figure readability; data pages compare chart/interpretation balance; equation pages compare model/validation balance; text pages compare hierarchy and relationship clarity.

## 6. Required semantic primitives

The shared template exposes reusable semantic primitives for compact headers, claim bands, dense shared-edge panels, dominant figures, figure/support matrices, experiment–mechanism pairs, equation–validation pairs, before/after proof, evidence tables, hierarchy maps, process flows, validation loops, synthesis matrices, and bottom conclusion bands. These are composition primitives, not parallel runtimes. Existing L01–L24 IDs remain the relationship authority and map to these primitives through the layout-selection contract.
