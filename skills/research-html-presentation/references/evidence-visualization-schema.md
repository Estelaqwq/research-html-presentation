# Evidence visualization schema

## V2 chart and host metadata

Type A chart records use the analytical fields defined in `ChartEvidenceSpec`, including an explicit `chartForm`. The rendered plot container must expose `data-chart-host="true"` and `data-chart-form="<chartForm>"`, whether the paint surface is ECharts SVG/Canvas, custom SVG, Canvas, or HTML/CSS. The outer scientific-evidence wrapper remains authoritative for evidence type, claim links, states, and provenance. A Type A chart host that is missing, blank, or reported as `plotOccupancy: "not-applicable"` is a complete-stage failure.

## Contents

1. Registry organization
2. Visual evidence
3. Datasets and transforms
4. Analyses and charts
5. Runtime hooks
6. Validation rules

## 1. Registry organization

Store project-specific visual and data provenance in `evidence-visuals.json` or an equivalent typed module. Keep the deck manifest lightweight: slides reference `claimIds` and `visualIds`, while the manifest may point to the registry through `evidenceRegistry`.

```ts
type EvidenceRegistry = {
  claims: Array<{ id: string; statement?: string }>;
  datasets?: DatasetRecord[];
  transforms?: DataTransformRecord[];
  analyses?: AnalysisRecord[];
  narrativeUnits?: NarrativeUnit[];
  visuals: VisualEvidenceRecord[];
  flowSpecs?: FlowSpec[];
  citationIds?: string[];
};
```

Use stable IDs. The Evidence Registry may reference citation IDs but does not own editable citation metadata. The one logical Citation Registry is defined by [citation-and-source-rendering.md](citation-and-source-rendering.md) and [../schemas/citation-registry.schema.json](../schemas/citation-registry.schema.json). Only a legacy version 0–2 project with no external or typed Citation Registry may use its historical embedded registry for compatibility. Do not expose private absolute source paths in audience captions.
Dataset findings extend `AnalysisRecord`; they do not form a second conclusion registry.
For a new scroll report, the research companion is enabled by default; `analysisCompanion.measures` and `analysisCompanion.questions` are aggregate exploration permissions inside this same registry; see [analysis-companion.md](analysis-companion.md). They reference existing dataset, transform, analysis/finding, claim, source, and visual IDs. They are not another evidence or conclusion registry.

For a dataset with two possible renderers, optional `NarrativeUnit` records provide one renderer-neutral story source:

```ts
type OutputMode = "slide-deck" | "scroll-report";
type NarrativeUnit = {
  id: string;
  chapterId: string;
  role: "introduction" | "analysis-design" | "finding" | "deep-insight" | "application" | "boundary" | "synthesis" | "closing";
  title: string;
  findingIds: string[];
  claimIds: string[];
  chartSpecIds: string[];
  priority: "MUST_SHOW" | "SHOULD_SHOW" | "BACKUP";
  substantiveContribution?: string;
  dataFactIds?: string[];
  methodIds?: string[];
  resultIds?: string[];
  titleBasisIds?: string[];
  audienceTakeaway?: string;
  takeawayBasisIds?: string[];
  interpretationChangingBoundary?: boolean;
  contentUtilityStatus?: "keep" | "merge" | "remove";
  visualPlan?: VisualPlan;
};
```

Do not require a new registry when existing project metadata already provides an equivalent shared mapping. `NarrativeUnit` references existing analyses/claims/charts; it is not a conclusion store.

## 2. Visual evidence

Every substantive narrative unit may carry a material-adaptive `VisualPlan`. It records the page claim, evidence kinds, visual center, weighted primary visuals, figure treatment, text-only relation, and deliberate omissions. Use [visual-composition-contract.md](visual-composition-contract.md) as the single policy for planning; do not infer a visual center from the number of cards rendered.

```ts
type MaterialVisualKind = "scientific-evidence" | "data-evidence" | "authentic-project-proof" | "explanatory-structure" | "ordinary-narrative" | "decorative";
type VisualCenter = "dominant-scientific-figure" | "structured-chart" | "comparison-table" | "equation-validation-pair" | "evidence-matrix" | "mechanism-diagram" | "technical-route" | "hierarchy-map" | "before-after-proof" | "claim-evidence-conclusion" | "text-led-structured-board";
type VisualPlan = {
  coreClaim: string;
  evidenceKinds: MaterialVisualKind[];
  visualCenter: VisualCenter;
  primaryVisualIds: string[];
  visualWeights: Record<string, number>;
  figureTreatment?: string;
  textOnlyRelation?: string;
  mergeOrBackup?: string[];
  omissions?: string[];
};
```

`visualKind` on a visual record is semantic, not decorative metadata. Only scientific evidence, data evidence, authentic project proof, and explanatory structure may count toward evidence-weight or visual-center audits. Ordinary narrative and decoration remain visible but cannot be used to satisfy a missing evidence plan.

Flow diagrams use a validated `FlowSpec` rather than arrow characters or an array of equal cards:

```ts
type FlowSpec = {
  id: string;
  nodes: Array<{ id: string; role: "input" | "process" | "output" | "validation" | "decision" | "evidence" | "feedback"; label: string; group?: string; evidenceRef?: string; emphasis?: "normal" | "critical" | "expected" }>;
  edges: Array<{ from: string; to: string; label?: string; kind: "primary" | "secondary" | "feedback"; directed: boolean }>;
  readingOrder?: string[];
};
```

The validator must resolve every endpoint, reject meaningless isolates, require a continuous primary path, and preserve the full topology in print.

```ts
type EvidenceType = "A" | "B" | "C" | "MIXED" | "UNCERTAIN";
type TreatmentLevel = "L0" | "L1" | "L2" | "L3";
type EvidenceStatus = "DIRECT" | "DERIVED" | "CONTEXTUAL" | "EXPECTED" | "HYPOTHESIZED" | "UNSUPPORTED";
type RepresentationStatus = "ORIGINAL" | "ANNOTATED" | "REFORMATTED" | "RECONSTRUCTED";
type ClaimRelation = "supports" | "qualifies" | "contradicts" | "contextualizes";

type VisualEvidenceRecord = {
  visualId: string;
  sourceRef: string;
  sourceHash?: string;
  evidenceType: EvidenceType;
  subtype: string;
  classificationConfidence: number;
  claimLinks: Array<{ claimId: string; relation: ClaimRelation }>;
  evidenceStatus: EvidenceStatus;
  representationStatus: RepresentationStatus;
  evidenceContribution: string;
  visualKind?: "scientific-evidence" | "data-evidence" | "authentic-project-proof" | "explanatory-structure" | "ordinary-narrative" | "decorative";
  decisive?: boolean;
  treatmentLevel: TreatmentLevel;
  treatmentRationale: string;
  mustPreserve: string[];
  interactionPlan: string[];
  defaultState?: Record<string, unknown>;
  printState?: Record<string, unknown>;
  limitations: string[];
  datasetId?: string;
  analysisId?: string;
  chartSpec?: ChartEvidenceSpec;
  structure?: {
    nodes?: Array<{ id: string; x: number; y: number; label: string }>;
    edges?: Array<{ from: string; to: string; directed?: boolean }>;
  };
  annotations?: Array<{ id: string; x: number; y: number; width?: number; height?: number; label: string }>;
  pixelImmutable?: boolean;
  parentVisualId?: string;
  childVisualIds?: string[];
};
```

`classificationConfidence` is between 0 and 1. Low confidence requires `UNCERTAIN` or a documented conservative rationale. Type C requires `pixelImmutable: true`. Type A at L3 requires a dataset or traceable data reference, units or an explicit unitless declaration, and both states.

## 3. Datasets and transforms

```ts
type DatasetRecord = {
  datasetId: string;
  sourceRef: string;
  sourceHash: string;
  format: "csv" | "tsv" | "xlsx" | "json" | string;
  sheets?: string[];
  rowCount?: number;
  columnCount?: number;
  observationGrain: string;
  keyFields: string[];
  fields: Array<{ name: string; type: string; unit?: string; sensitive?: boolean }>;
  sourceRole?: "labeled-training" | "validation" | "inference" | "sample-submission" | "lookup" | "metadata" | "auxiliary" | "excluded";
  taskRole?: string;
  targetVariable?: string;
  labeled?: boolean;
  inferenceOnly?: boolean;
  submissionTemplate?: boolean;
  fieldUsage?: Array<{
    field: string;
    role: "target" | "feature" | "identifier" | "grouping-variable" | "derived-source" | "metadata" | "validation-only" | "excluded";
    usedFor: string[];
    derivedFeatures?: string[];
    missingStrategy?: string;
    exposurePolicy?: "aggregate-only" | "derived-only" | "not-rendered" | "rendered";
    exclusionRationale?: string;
  }>;
  timeGrain?: string;
  spatialGrain?: string;
  publicAssetIncluded?: boolean;
  privacyReview?: "pending" | "cleared" | "blocked";
  limitations: string[];
};

type DataTransformRecord = {
  transformId: string;
  datasetId: string;
  operation: string;
  inputFields: string[];
  parameters: Record<string, unknown>;
  outputFields: string[];
  affectedRows?: number;
  fitScope?: string;
  applyScope?: string[];
  foldSafe?: boolean;
  leakageRisk?: "none" | "controlled" | "review-required" | "prohibited";
  missingStrategy?: string;
  derivedFromFields?: string[];
  rationale: string;
};
```

Source files are immutable. Any filtering, aggregation, normalization, unit conversion, imputation, sampling, category merging, or exclusion requires a transform record. Semantic version 3 inherits every version 2 requirement: every supplied source declares `sourceRole`; every major field has a use or exclusion record; predictive feature transforms declare fit/apply scopes, fold safety, leakage risk, and the actual missing strategy. Version 3 then adds its model-search, basis-ID, and audience-copy requirements. Versions 0–2 remain legacy-readable under the requirements declared for their own version; they are never rewritten automatically. Frontend exposure policy controls rendering only and never erases authorized analytical or derived-feature use.

For publication-bound projects, record whether raw data is included in frontend assets and the privacy-review result. A dataset with sensitive fields must not use `publicAssetIncluded: true`; aggregate or redact through a recorded transform and keep raw records outside the build.

## 4. Analyses and charts

```ts
type AnalysisRecord = {
  analysisId: string;
  datasetId: string;
  transformIds: string[];
  analysisMode: "dataset-portrait" | "exploratory" | "diagnostic" | "predictive" | "comparative";
  questionId: string;
  question: string;
  analysisIntentSource?: "user-explicit" | "dataset-contract" | "inferred" | "user-confirmed";
  datasetTaskContract?: {
    taskType: string;
    targetVariable?: string;
    labeledDatasetIds: string[];
    validationDatasetIds: string[];
    inferenceDatasetIds: string[];
    submissionTemplateId?: string;
    evaluationMetric?: string;
    taskEvidence: string[];
    ambiguityStatus: "resolved" | "user-confirmation-required";
  };
  analysisModeRationale?: string;
  primaryQuestion?: string;
  method: string;
  parameters: Record<string, unknown>;
  outputFields: string[];
  evidenceStatus: "DERIVED" | "EXPECTED" | "HYPOTHESIZED";
  findingStatement?: string;
  supportingMetrics?: Array<{ label: string; value: string | number; unit?: string }>;
  findingPriority?: "MUST_SHOW" | "SHOULD_SHOW" | "BACKUP" | "OMIT";
  decisionValue?: string;
  sourceAnalysisId?: string;
  applicationImplication?: string;
  contradictoryEvidence?: string[];
  preprocessingSummary?: string;
  validationStrategy?: { method: string; folds?: number; split?: string; sampleCount?: number; groupedBy?: string; foldResults?: Array<Record<string, number>> };
  baselineIds?: string[];
  baselineType?: "majority-class" | "mean" | "median" | "published-rule" | "other-non-learning";
  candidateModelIds?: string[];
  selectedModelId?: string;
  modelFamily?: "linear" | "generalized-linear" | "probabilistic" | "single-tree" | "bagging" | "boosting" | "svm" | "knn" | "neural-network" | "time-series" | "survival" | "other" | string;
  modelSearch?: {
    adequacyStatus: "sufficient" | "limited" | "preliminary" | "not-applicable";
    taskFamily?: "tabular" | "text" | "time-series" | "survival" | "image" | "other";
    limitationRationale?: string;
    audienceClaimLevel: "preliminary" | "current-best" | "selected" | "final" | "not-applicable";
    baselineIds: string[];
    candidateModelIds: string[];
    candidateFamilies: Array<{ family: string; modelIds: string[] }>;
    omittedApplicableFamilies: string[];
    omittedFamilyRationales: Array<{ family: string; rationale: string }>;
    validationStrategy: {
      method: string;
      sharedSplitId: string;
      folds?: number;
      sampleCount: number;
      randomSeed?: number;
      foldSafePreprocessing: boolean;
    };
    primaryMetric: string;
    secondaryMetrics: string[];
    selectionRule: string;
    tieBreakRule: string;
    performanceTolerance: number | null;
    stabilityRequirement: string;
    parameterSearch: {
      status: "performed" | "not-performed";
      method?: "grid" | "random" | "manual" | string;
      candidateModelIds?: string[];
      searchSpace?: Record<string, unknown>;
      bestParameters?: Record<string, unknown>;
      stoppingRule?: string;
      tuningLeakageControl: string;
      dataScopeDatasetIds: string[];
      rationale?: string;
    };
    foldResults: Array<Record<string, string | number>>;
    selectedModelId?: string;
    selectedModelRationale?: string;
    externalTruthStatus: "known" | "unknown" | "partial";
  };
  evaluationMetrics?: Array<{ name: string; value: number; variation?: number; scope: "cross-validation" | "validation" | "external-benchmark" }>;
  errorAnalysis?: { summary: string; resultIds?: string[] };
  inferenceOutput?: { datasetId: string; outputRef: string; rowCount?: number; truthStatus: "unknown" | "available"; submissionSchemaId?: string };
  analysisKind?: "descriptive" | "diagnostic" | "predictive-model" | "explanatory-model" | "published-scoring-formula" | "formula-decomposition" | "descriptive-association";
  modelGate?: {
    decision: "admit" | "defer" | "reject" | "not-applicable";
    rationale: string;
    targetVariable?: string;
    validationStrategy?: string;
  };
  limitations: string[];
};

type ChartEvidenceSpec = {
  chartType: string;
  dataRef: { datasetId: string; transformIds: string[]; analysisId?: string };
  analyticalQuestion: string;
  visualThesis: string;
  comparisonBaseline: string;
  annotationTargets: Array<{ id: string; label: string; dataKey?: string }>;
  highlightPolicy: string;
  readingOrder: string[];
  encodings: Record<string, string>;
  units: Record<string, string> | "unitless";
  domainPolicy: "fixed" | "data" | "source";
  precision: Record<string, number>;
  interactionSpec: {
    enabled: boolean;
    actions: Array<"tooltip" | "fold-tooltip" | "metric-switch" | "model-switch" | "group-switch" | "series-highlight" | "point-detail" | "legend-focus" | "time-range" | "cell-detail" | "confusion-detail" | "linked-evidence" | "reset">;
    runtimeHooks: string[];
  };
  motionSpec: { durationMs: number; entrance: "none" | "bar-baseline" | "line-sequence" | "scatter-fade" | "fade"; update: "none" | "highlight" | "linked-update" };
  defaultState: Record<string, unknown>;
  resetState: Record<string, unknown>;
  reducedMotionState: Record<string, unknown>;
  printState: Record<string, unknown>;
  // Optional explicit metric visibility declarations used when a chart title
  // is supported by several switchable measures.
  titleBasisMetrics?: string[];
  mustShowMetricIds?: string[];
  staticRationale?: string;
  accessibleSummary: string;
  authoritativeValues?: unknown; // optional canonical values when the renderer also duplicates labels
  displayValues?: unknown;       // when present, must exactly match authoritativeValues
};
```

Prefer a single data reference over duplicated inline display values. If a project duplicates values for rendering, its build or evidence validator must compare them with the authoritative analysis output.

## 5. Runtime hooks

Evidence visuals use:

```html
<figure
  data-evidence-visual="true"
  data-visual-id="visual-01"
  data-evidence-type="A"
  data-claim-ids="claim-01 claim-02"
  data-visual-ready="true"
  data-default-state="overview"
  data-reset-state="overview"
  data-reduced-motion-state="overview"
  data-print-state="overview"
></figure>
```

Additional hooks:

- `data-scientific="true"` for scientific images;
- `data-pixel-immutable="true"` for Type C base images;
- `data-crop-safe="true"` only for verified harmless crops;
- `data-annotation-layer="true"` for separate overlays;
- `data-chart-control="true"` for controls omitted or converted in print;
- `data-runtime-hook="<stable-id>"` and `data-chart-action="<action>"` for controls that implement `interactionSpec`;
- `data-accessible-summary="true"` for chart summaries/tables.

Every asynchronous chart reports `data-visual-ready="false"` until its final initial/default or print state is rendered. The deck-ready signal must wait for all evidence visuals.

## 6. Validation rules

- All claim, visual, dataset, transform, and analysis IDs are unique and cross-references resolve.
- Narrative-unit IDs are unique; their finding, claim, and chart/visual references resolve, and renderer mappings may not change their evidence values or finding priorities.
- Dataset analysis records use an allowed `analysisMode`, a stable `questionId`, and substantive findings before outline creation. `MUST_SHOW` findings have supporting metrics or explicit qualitative evidence, decision/application value or an interpretation boundary, and a resolvable source analysis when derived from another analysis.
- Predictive/explanatory `analysisKind` requires an admitted `modelGate`, target/validation details appropriate to the kind, and a rationale; a rejected gate cannot label the analysis predictive.
- New `datasetSemanticVersion: 3` predictive reports additionally require one shared `modelSearch` record. It distinguishes baseline/candidate/tuned/selected/final/external stages, maps each candidate to a model family, records shared validation and fold-safe preprocessing, bounded tuning or a concrete no-tuning rationale, selection/tie rules, fold results, omissions, adequacy, and external-truth status. A baseline never appears in `candidateModelIds`. `limited`/`preliminary` search cannot use final/best/optimized audience claims.
- Every kept renderer unit has a substantive contribution and resolvable data/method/result references; internal gates, privacy, Source Lock, runtime, and QA are not audience narrative roles.
- Every kept v3 dataset narrative unit has resolvable `titleBasisIds`; an audience takeaway has resolvable `takeawayBasisIds`. A standalone boundary unit declares `interpretationChangingBoundary: true` and cites the result whose interpretation changes.
- A slide's `visualIds` resolve to registry visuals and its `claimIds` include their linked claims unless a recorded cross-slide reason exists.
- Local source files exist; recorded hashes use `sha256:<hex>` and match when verification is enabled.
- L3 is allowed only for Type A with traceable data.
- Type A has a chart spec, analytical question, thesis-style title, baseline, annotation/highlight/read-order policy, units/unitless declaration, accessible summary, and default/reset/reduced-motion/print states. Interactive charts declare non-empty actions and unique runtime hooks; static charts declare `staticRationale`.
- When a title or MUST_SHOW finding depends on multiple metrics, `defaultState`, `resetState`, and `printState` must expose all declared `titleBasisMetrics`/`mustShowMetricIds`; a metric switch may emphasize a measure but may not hide the complete default evidence. Browser checks use `data-default-visible-metrics`, `data-reset-visible-metrics`, and `data-print-visible-metrics` when the DOM declares them.
- A dataset report with two or more decisive Type A visuals normally has at least two interactive visuals; with one decisive visual it normally has one. Any exception is explicit and analytically justified.
- Type B normalized node and annotation coordinates remain within 0–1; edges reference existing nodes.
- Type C is pixel immutable and declares no prohibited pixel transform.
- `MIXED` records preserve parent/child links.
- `UNCERTAIN` records use L0/L1 unless a later verified record supersedes them.
- No `UNSUPPORTED` visual is presented as factual evidence.
- Public builds do not contain unauthorized raw sensitive data.


## Data health for new dataset scroll reports

New explicit dataset scroll reports default to a collapsed data health entry. Follow [data-health.md](data-health.md) for local generation, declared-field rules, coverage, usage, privacy, and runtime/print QA. Derived diagnostics refer to the existing Shared Evidence Core and citations; pending scaffold content is not deliverable. Slide decks and existing projects retain their behavior.
