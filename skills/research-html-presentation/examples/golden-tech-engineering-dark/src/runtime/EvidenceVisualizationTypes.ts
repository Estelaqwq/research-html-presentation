export type EvidenceType = "A" | "B" | "C" | "MIXED" | "UNCERTAIN";
export type TreatmentLevel = "L0" | "L1" | "L2" | "L3";
export type EvidenceStatus = "DIRECT" | "DERIVED" | "CONTEXTUAL" | "EXPECTED" | "HYPOTHESIZED" | "UNSUPPORTED";
export type RepresentationStatus = "ORIGINAL" | "ANNOTATED" | "REFORMATTED" | "RECONSTRUCTED";
export type ClaimRelation = "supports" | "qualifies" | "contradicts" | "contextualizes";
export type AnalysisMode = "dataset-portrait" | "exploratory" | "diagnostic" | "predictive" | "comparative";
export type FindingPriority = "MUST_SHOW" | "SHOULD_SHOW" | "BACKUP" | "OMIT";
export type OutputMode = "slide-deck" | "scroll-report";
export type ChartAction = "tooltip" | "fold-tooltip" | "metric-switch" | "model-switch" | "group-switch" | "series-highlight" | "point-detail" | "legend-focus" | "time-range" | "cell-detail" | "confusion-detail" | "linked-evidence" | "reset";

export type NarrativeUnit = {
  id: string;
  chapterId: string;
  role: "introduction" | "analysis-design" | "finding" | "deep-insight" | "application" | "boundary" | "synthesis" | "closing";
  title: string;
  findingIds: string[];
  claimIds: string[];
  chartSpecIds: string[];
  priority: Exclude<FindingPriority, "OMIT">;
  substantiveContribution?: string;
  substantiveKinds?: string[];
  dataFactIds?: string[];
  methodIds?: string[];
  resultIds?: string[];
  titleBasisIds?: string[];
  audienceTakeaway?: string;
  takeawayBasisIds?: string[];
  interpretationChangingBoundary?: boolean;
  contentUtilityStatus?: "keep" | "merge" | "remove";
  citationIds?: string[];
};

export type ClaimLink = { claimId: string; relation: ClaimRelation };

export type DatasetRecord = {
  datasetId: string;
  sourceRef: string;
  sourceHash: string;
  format: string;
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
  fieldUsage?: Array<{ field: string; role: "target" | "feature" | "identifier" | "grouping-variable" | "derived-source" | "metadata" | "validation-only" | "excluded"; usedFor: string[]; derivedFeatures?: string[]; missingStrategy?: string; exposurePolicy?: "aggregate-only" | "derived-only" | "not-rendered" | "rendered"; exclusionRationale?: string }>;
  timeGrain?: string;
  spatialGrain?: string;
  publicAssetIncluded?: boolean;
  privacyReview?: "pending" | "cleared" | "blocked";
  limitations: string[];
};

export type DataTransformRecord = {
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

export type ModelSearchRecord = {
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
    foldSafePreprocessing: true;
  };
  primaryMetric: string;
  secondaryMetrics: string[];
  selectionRule: string;
  tieBreakRule: string;
  performanceTolerance: number | null;
  stabilityRequirement: string;
  parameterSearch: {
    status: "performed" | "not-performed";
    method?: string;
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

export type AnalysisRecord = {
  analysisId: string;
  datasetId: string;
  transformIds: string[];
  analysisMode: AnalysisMode;
  questionId: string;
  question: string;
  analysisIntentSource?: "user-explicit" | "dataset-contract" | "inferred" | "user-confirmed";
  datasetTaskContract?: { taskType: string; targetVariable?: string; labeledDatasetIds: string[]; validationDatasetIds: string[]; inferenceDatasetIds: string[]; submissionTemplateId?: string; evaluationMetric?: string; taskEvidence: string[]; ambiguityStatus: "resolved" | "user-confirmation-required" };
  analysisModeRationale?: string;
  primaryQuestion?: string;
  method: string;
  parameters: Record<string, unknown>;
  outputFields: string[];
  evidenceStatus: "DERIVED" | "EXPECTED" | "HYPOTHESIZED";
  findingStatement?: string;
  supportingMetrics?: Array<{ label: string; value: string | number; unit?: string }>;
  findingPriority?: FindingPriority;
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
  modelSearch?: ModelSearchRecord;
  evaluationMetrics?: Array<{ name: string; value: number; variation?: number; scope: "cross-validation" | "validation" | "external-benchmark" }>;
  errorAnalysis?: { summary: string; resultIds?: string[] };
  inferenceOutput?: { datasetId: string; outputRef: string; rowCount?: number; truthStatus: "unknown" | "available"; submissionSchemaId?: string };
  analysisKind?: "descriptive" | "diagnostic" | "predictive-model" | "explanatory-model" | "published-scoring-formula" | "formula-decomposition" | "descriptive-association";
  modelGate?: { decision: "admit" | "defer" | "reject" | "not-applicable"; rationale: string; targetVariable?: string; validationStrategy?: string };
  limitations: string[];
};

export type ChartEvidenceSpec = {
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
  interactionSpec: { enabled: boolean; actions: ChartAction[]; runtimeHooks: string[] };
  motionSpec: { durationMs: number; entrance: "none" | "bar-baseline" | "line-sequence" | "scatter-fade" | "fade"; update: "none" | "highlight" | "linked-update" };
  defaultState: Record<string, unknown>;
  resetState: Record<string, unknown>;
  reducedMotionState: Record<string, unknown>;
  printState: Record<string, unknown>;
  staticRationale?: string;
  accessibleSummary: string;
  authoritativeValues?: unknown;
  displayValues?: unknown;
};

export type EvidenceAnnotation = {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  label: string;
  critical?: boolean;
};

export type VisualEvidenceRecord = {
  visualId: string;
  sourceRef: string;
  sourceHash: string;
  evidenceType: EvidenceType;
  subtype: string;
  classificationConfidence: number;
  claimLinks: ClaimLink[];
  citationIds?: string[];
  evidenceStatus: EvidenceStatus;
  representationStatus: RepresentationStatus;
  evidenceContribution: string;
  decisive?: boolean;
  treatmentLevel: TreatmentLevel;
  treatmentRationale: string;
  mustPreserve: string[];
  interactionPlan: string[];
  defaultState?: Record<string, unknown>;
  resetState?: Record<string, unknown>;
  reducedMotionState?: Record<string, unknown>;
  printState?: Record<string, unknown>;
  limitations: string[];
  datasetId?: string;
  analysisId?: string;
  chartSpec?: ChartEvidenceSpec;
  structure?: {
    nodes?: Array<{ id: string; x: number; y: number; label: string }>;
    edges?: Array<{ from: string; to: string; directed?: boolean }>;
  };
  annotations?: EvidenceAnnotation[];
  pixelImmutable?: boolean;
  pixelTransforms?: string[];
  parentVisualId?: string;
  childVisualIds?: string[];
};

export type EvidenceRegistry = {
  claims: Array<{ id: string; statement?: string }>;
  datasets?: DatasetRecord[];
  transforms?: DataTransformRecord[];
  analyses?: AnalysisRecord[];
  narrativeUnits?: NarrativeUnit[];
  visuals: VisualEvidenceRecord[];
  /** @deprecated Legacy embedded authority only. Do not use when a separate Citation Registry is declared. */
  citations?: CitationRecord[];
};

export type EvidenceChartAdapter = {
  render: (args: {
    element: HTMLElement;
    option: Record<string, unknown>;
    renderer: "svg" | "canvas";
    theme?: string | object;
    events?: Array<{ name: string; handler: (payload: unknown) => void }>;
  }) => Promise<EvidenceChartController>;
};

export type EvidenceChartController = {
  dispose: () => void;
  resize?: () => void;
  setOption?: (option: Record<string, unknown>, replace?: boolean) => void;
  dispatchAction?: (action: Record<string, unknown>) => void;
};

export function visualClaimIds(visual: Pick<VisualEvidenceRecord, "claimLinks">) {
  return visual.claimLinks.map((link) => link.claimId).join(" ");
}
import type { CitationRecord } from "./CitationTypes";

export type { VisualStyle } from "./visual-style";
