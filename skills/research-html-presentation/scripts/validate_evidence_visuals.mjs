#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chartSemanticFailures } from "./chart_semantic_rules.mjs";

const evidenceTypes = new Set(["A", "B", "C", "MIXED", "UNCERTAIN"]);
const treatmentLevels = new Set(["L0", "L1", "L2", "L3"]);
const evidenceStatuses = new Set(["DIRECT", "DERIVED", "CONTEXTUAL", "EXPECTED", "HYPOTHESIZED", "UNSUPPORTED"]);
const representationStatuses = new Set(["ORIGINAL", "ANNOTATED", "REFORMATTED", "RECONSTRUCTED"]);
const claimRelations = new Set(["supports", "qualifies", "contradicts", "contextualizes"]);
const analysisModes = new Set(["dataset-portrait", "exploratory", "diagnostic", "predictive", "comparative"]);
const findingPriorities = new Set(["MUST_SHOW", "SHOULD_SHOW", "BACKUP", "OMIT"]);
const chartActions = new Set(["tooltip", "fold-tooltip", "metric-switch", "model-switch", "group-switch", "series-highlight", "point-detail", "legend-focus", "time-range", "cell-detail", "confusion-detail", "linked-evidence", "reset"]);
const analysisKinds = new Set(["descriptive", "diagnostic", "predictive-model", "explanatory-model", "published-scoring-formula", "formula-decomposition", "descriptive-association"]);
const sourceRoles = new Set(["labeled-training", "validation", "inference", "sample-submission", "lookup", "metadata", "auxiliary", "excluded"]);
const fieldRoles = new Set(["target", "feature", "identifier", "grouping-variable", "derived-source", "metadata", "validation-only", "excluded"]);
const intentSources = new Set(["user-explicit", "dataset-contract", "inferred", "user-confirmed"]);
const utilityStates = new Set(["keep", "merge", "remove"]);
const modelDecisions = new Set(["admit", "defer", "reject", "not-applicable"]);
const modelSearchStatuses = new Set(["sufficient", "limited", "preliminary", "not-applicable"]);
const audienceClaimLevels = new Set(["preliminary", "current-best", "selected", "final", "not-applicable"]);
const prohibitedPixelTransforms = /super[- ]?resolution|inpaint|denois|sharpen|recolor|colori[sz]|contrast|background removal|pixel transform/i;

function array(value) {
  return Array.isArray(value) ? value : [];
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function uniqueIds(items, field, label, failures) {
  const ids = new Set();
  array(items).forEach((item, index) => {
    const id = item?.[field];
    if (!nonEmpty(id)) failures.push(`${label} ${index + 1}: ${field} is required`);
    else if (ids.has(id)) failures.push(`${label} ${index + 1}: duplicate ${field} '${id}'`);
    else ids.add(id);
  });
  return ids;
}

function normalizedCoordinate(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function sameValues(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function metricIds(state) {
  if (!state || typeof state !== "object") return new Set();
  const values = [...array(state.visibleMetricIds), ...array(state.visibleMetrics), ...array(state.metricIds), ...array(state.metrics)];
  return new Set(values.map((value) => typeof value === "string" ? value : value && typeof value === "object" ? (value.id ?? value.metricId ?? value.name) : null).filter(nonEmpty));
}

function sourceCandidate(sourceRef, root) {
  if (!nonEmpty(sourceRef) || /^[a-z]+:\/\//i.test(sourceRef) || /^(?:doi|paper|figure|table):/i.test(sourceRef)) return null;
  const clean = sourceRef.split("#")[0].trim();
  if (!clean || /[<>|?*]/.test(clean)) return null;
  if (!path.isAbsolute(clean) && !/[\\/]/.test(clean) && !/\.[a-z0-9]{1,8}$/i.test(clean)) return null;
  return path.isAbsolute(clean) ? clean : path.resolve(root, clean);
}

async function sha256(filePath) {
  return `sha256:${createHash("sha256").update(await readFile(filePath)).digest("hex")}`;
}

async function verifySource(record, id, root, failures, warnings) {
  const filePath = sourceCandidate(record?.sourceRef, root);
  if (!filePath) return;
  try {
    if (!(await stat(filePath)).isFile()) throw new Error("not a file");
  } catch {
    failures.push(`${id}: local source does not exist: ${filePath}`);
    return;
  }
  if (!record.sourceHash) {
    warnings.push(`${id}: local source has no sourceHash`);
    return;
  }
  if (!/^sha256:[a-f0-9]{64}$/i.test(record.sourceHash)) {
    failures.push(`${id}: sourceHash must use sha256:<64 hex>`);
    return;
  }
  const actual = await sha256(filePath);
  if (actual.toLowerCase() !== record.sourceHash.toLowerCase()) failures.push(`${id}: sourceHash does not match ${filePath}`);
}

export async function validateEvidenceRegistry(input, options = {}) {
  const resolvedInput = path.resolve(input);
  let registryPath = resolvedInput;
  try {
    if ((await stat(resolvedInput)).isDirectory()) registryPath = path.join(resolvedInput, "evidence-visuals.json");
  } catch {
    // The readable error below reports the resolved registry path.
  }
  let registry;
  try {
    registry = JSON.parse(await readFile(registryPath, "utf8"));
  } catch {
    return { registry: registryPath, passed: false, failures: [`cannot read valid evidence registry JSON: ${registryPath}`], warnings: [] };
  }

  const failures = [];
  const warnings = [];
  const strictDataset = options.manifest?.profile === "dataset-report";
  const generalReporting = !strictDataset && (options.manifest?.outputMode === "scroll-report" || options.manifest?.profile === "work-report");
  const semanticV2 = strictDataset && Number(options.manifest?.datasetSemanticVersion ?? 0) >= 2;
  const semanticV3 = strictDataset && Number(options.manifest?.datasetSemanticVersion ?? 0) >= 3;
  const designV2 = options.manifest?.newProject === true && Number(options.manifest?.designSystemVersion ?? 0) >= 2;
  const root = path.dirname(registryPath);
  const claims = array(registry.claims);
  const datasets = array(registry.datasets);
  const transforms = array(registry.transforms);
  const analyses = array(registry.analyses);
  const narrativeUnits = array(registry.narrativeUnits);
  const visuals = array(registry.visuals);
  const claimIds = uniqueIds(claims, "id", "claim", failures);
  const datasetIds = uniqueIds(datasets, "datasetId", "dataset", failures);
  const transformIds = uniqueIds(transforms, "transformId", "transform", failures);
  const analysisIds = uniqueIds(analyses, "analysisId", "analysis", failures);
  const visualIds = uniqueIds(visuals, "visualId", "visual", failures);
  const narrativeUnitIds = uniqueIds(narrativeUnits, "id", "narrative unit", failures);
  const idOwners = new Map();
  [["claim", claimIds], ["dataset", datasetIds], ["transform", transformIds], ["analysis", analysisIds], ["visual", visualIds], ["narrative unit", narrativeUnitIds]].forEach(([kind, ids]) => {
    ids.forEach((id) => {
      if (idOwners.has(id)) failures.push(`ID '${id}' is reused by ${idOwners.get(id)} and ${kind}`);
      else idOwners.set(id, kind);
    });
  });

  if (!visuals.length && !generalReporting) failures.push("registry.visuals must contain at least one visual record");
  if (!visuals.length && generalReporting && !array(registry.claims).length) failures.push("a general report without visual records still needs source-backed claims");

  narrativeUnits.forEach((unit) => {
    const at = `narrative unit '${unit.id ?? "?"}'`;
    if (!nonEmpty(unit.chapterId) || !nonEmpty(unit.title)) failures.push(`${at}: chapterId and title are required`);
    if (!["introduction", "analysis-design", "finding", "deep-insight", "application", "boundary", "synthesis", "closing", ...(generalReporting ? ["work", "materials", "method", "comparison", "progress", "plan"] : [])].includes(unit.role)) failures.push(`${at}: role is invalid`);
    if (!["MUST_SHOW", "SHOULD_SHOW", "BACKUP"].includes(unit.priority)) failures.push(`${at}: priority must be MUST_SHOW, SHOULD_SHOW, or BACKUP`);
    array(unit.findingIds).forEach((id) => { if (!analysisIds.has(id)) failures.push(`${at}: findingId '${id}' does not resolve`); });
    array(unit.claimIds).forEach((id) => { if (!claimIds.has(id)) failures.push(`${at}: claimId '${id}' does not resolve`); });
    array(unit.chartSpecIds).forEach((id) => { if (!visualIds.has(id)) failures.push(`${at}: chartSpecId '${id}' does not resolve to a visual record`); });
    if (semanticV2) {
      if (!nonEmpty(unit.substantiveContribution)) failures.push(`${at}: substantiveContribution is required for new dataset reports`);
      if (!utilityStates.has(unit.contentUtilityStatus)) failures.push(`${at}: contentUtilityStatus must be keep, merge, or remove`);
      if (unit.contentUtilityStatus === "keep" && ![...array(unit.dataFactIds), ...array(unit.methodIds), ...array(unit.resultIds), ...array(unit.findingIds), ...array(unit.claimIds), ...array(unit.chartSpecIds)].length) failures.push(`${at}: kept unit has no resolvable data, method, result, finding, claim, or chart contribution`);
      if (semanticV3 && unit.contentUtilityStatus === "keep") {
        const cited = new Set([...array(unit.dataFactIds), ...array(unit.methodIds), ...array(unit.resultIds), ...array(unit.findingIds), ...array(unit.claimIds)]);
        if (!array(unit.titleBasisIds).length) failures.push(`${at}: titleBasisIds is required by dataset semantic contract v3`);
        array(unit.titleBasisIds).forEach((id) => { if (!cited.has(id)) failures.push(`${at}: titleBasisId '${id}' must be cited by the same narrative unit`); });
        if (nonEmpty(unit.audienceTakeaway) && !array(unit.takeawayBasisIds).length) failures.push(`${at}: audienceTakeaway requires takeawayBasisIds`);
        array(unit.takeawayBasisIds).forEach((id) => { if (!cited.has(id)) failures.push(`${at}: takeawayBasisId '${id}' must be cited by the same narrative unit`); });
        if (unit.role === "boundary" && unit.interpretationChangingBoundary !== true) failures.push(`${at}: standalone boundary requires interpretationChangingBoundary=true`);
      }
    }
  });

  datasets.forEach((dataset) => {
    const at = `dataset '${dataset.datasetId ?? "?"}'`;
    if (!nonEmpty(dataset.sourceRef)) failures.push(`${at}: sourceRef is required`);
    if (!nonEmpty(dataset.sourceHash)) failures.push(`${at}: sourceHash is required`);
    else if (!/^sha256:[a-f0-9]{64}$/i.test(dataset.sourceHash)) failures.push(`${at}: sourceHash must use sha256:<64 hex>`);
    if (!nonEmpty(dataset.observationGrain)) warnings.push(`${at}: observationGrain is missing`);
    if (!Array.isArray(dataset.fields) || !dataset.fields.length) warnings.push(`${at}: fields inventory is empty`);
    if (semanticV2) {
      if (!sourceRoles.has(dataset.sourceRole)) failures.push(`${at}: sourceRole is required and must be a supported task role`);
      const usages = array(dataset.fieldUsage);
      const usageByField = new Map(usages.map((usage) => [usage?.field, usage]));
      array(dataset.fields).forEach((field) => {
        const usage = usageByField.get(field?.name);
        if (!usage) failures.push(`${at}: field '${field?.name ?? "?"}' has no fieldUsage record`);
      });
      usages.forEach((usage, index) => {
        const label = `${at}: fieldUsage ${index + 1}`;
        if (!nonEmpty(usage?.field) || !fieldRoles.has(usage?.role)) failures.push(`${label}: field and supported role are required`);
        if (!array(usage?.usedFor).length && !nonEmpty(usage?.exclusionRationale)) failures.push(`${label}: record analytical use or an exclusion rationale`);
        if (usage?.role === "excluded" && !nonEmpty(usage?.exclusionRationale)) failures.push(`${label}: excluded field requires exclusionRationale`);
      });
    }
    const sensitiveFields = array(dataset.fields).filter((field) => field?.sensitive === true);
    if (sensitiveFields.length && dataset.publicAssetIncluded === true) failures.push(`${at}: raw/public asset inclusion is forbidden because sensitive fields are declared`);
    if (sensitiveFields.length && !["cleared", "blocked"].includes(dataset.privacyReview)) warnings.push(`${at}: sensitive fields exist but privacyReview is not recorded as cleared or blocked`);
  });

  transforms.forEach((transform) => {
    const at = `transform '${transform.transformId ?? "?"}'`;
    if (!datasetIds.has(transform.datasetId)) failures.push(`${at}: datasetId '${transform.datasetId}' does not resolve`);
    if (!nonEmpty(transform.operation) || !nonEmpty(transform.rationale)) failures.push(`${at}: operation and rationale are required`);
    if (semanticV2 && transform.foldSafe !== undefined && typeof transform.foldSafe !== "boolean") failures.push(`${at}: foldSafe must be boolean when declared`);
  });

  analyses.forEach((analysis) => {
    const at = `analysis '${analysis.analysisId ?? "?"}'`;
    if (!datasetIds.has(analysis.datasetId)) failures.push(`${at}: datasetId '${analysis.datasetId}' does not resolve`);
    array(analysis.transformIds).forEach((id) => { if (!transformIds.has(id)) failures.push(`${at}: transformId '${id}' does not resolve`); });
    if (!nonEmpty(analysis.question) || !nonEmpty(analysis.method)) failures.push(`${at}: question and method are required`);
    if (!["DERIVED", "EXPECTED", "HYPOTHESIZED"].includes(analysis.evidenceStatus)) failures.push(`${at}: evidenceStatus must reflect derived or prospective analysis`);
    if (!analysisModes.has(analysis.analysisMode)) (strictDataset ? failures : warnings).push(`${at}: analysisMode must be dataset-portrait, exploratory, diagnostic, predictive, or comparative`);
    if (!nonEmpty(analysis.questionId)) (strictDataset ? failures : warnings).push(`${at}: questionId is required for dataset analysis`);
    if (analysis.findingStatement !== undefined) {
      if (!nonEmpty(analysis.findingStatement)) failures.push(`${at}: findingStatement must be substantive`);
      if (!findingPriorities.has(analysis.findingPriority)) failures.push(`${at}: findingPriority is required for a finding`);
      if (analysis.findingPriority === "MUST_SHOW" && !array(analysis.supportingMetrics).length && !nonEmpty(analysis.decisionValue) && !array(analysis.contradictoryEvidence).length) failures.push(`${at}: MUST_SHOW finding requires supportingMetrics, decisionValue, or contradictoryEvidence`);
    }
    if (analysis.sourceAnalysisId && !analysisIds.has(analysis.sourceAnalysisId)) failures.push(`${at}: sourceAnalysisId '${analysis.sourceAnalysisId}' does not resolve`);
    if (analysis.analysisKind && !analysisKinds.has(analysis.analysisKind)) failures.push(`${at}: analysisKind '${analysis.analysisKind}' is invalid`);
    if (analysis.modelGate && !modelDecisions.has(analysis.modelGate.decision)) failures.push(`${at}: modelGate.decision must be admit, defer, reject, or not-applicable`);
    if (["predictive-model", "explanatory-model"].includes(analysis.analysisKind)) {
      if (analysis.modelGate?.decision !== "admit") failures.push(`${at}: ${analysis.analysisKind} requires modelGate.decision='admit'`);
      if (!nonEmpty(analysis.modelGate?.rationale)) failures.push(`${at}: admitted model requires a modelGate rationale`);
      if (analysis.analysisKind === "predictive-model" && (!nonEmpty(analysis.modelGate?.targetVariable) || !nonEmpty(analysis.modelGate?.validationStrategy))) failures.push(`${at}: predictive model requires targetVariable and validationStrategy`);
    }
    if (analysis.modelGate?.decision === "reject" && analysis.analysisKind === "predictive-model") failures.push(`${at}: a rejected Model Gate cannot be labeled predictive-model`);
    if (semanticV2 && analysis.primaryQuestion) {
      if (!intentSources.has(analysis.analysisIntentSource)) failures.push(`${at}: primary analysis requires analysisIntentSource`);
      if (!nonEmpty(analysis.analysisModeRationale)) failures.push(`${at}: primary analysis requires analysisModeRationale tied to user intent or task evidence`);
      const contract = analysis.datasetTaskContract;
      if (!contract || !nonEmpty(contract.taskType) || !array(contract.taskEvidence).length || !["resolved", "user-confirmation-required"].includes(contract.ambiguityStatus)) failures.push(`${at}: primary analysis requires a resolved, evidence-bearing datasetTaskContract`);
      for (const id of [...array(contract?.labeledDatasetIds), ...array(contract?.validationDatasetIds), ...array(contract?.inferenceDatasetIds)]) if (!datasetIds.has(id)) failures.push(`${at}: datasetTaskContract datasetId '${id}' does not resolve`);
      if (contract?.submissionTemplateId && !datasetIds.has(contract.submissionTemplateId)) failures.push(`${at}: submissionTemplateId '${contract.submissionTemplateId}' does not resolve`);
    }
  });

  if (semanticV2) {
    const predictive = analyses.filter((analysis) => analysis.analysisMode === "predictive" && analysis.analysisKind === "predictive-model" && (nonEmpty(analysis.primaryQuestion) || nonEmpty(analysis.selectedModelId) || array(analysis.candidateModelIds).length));
    if (analyses.some((analysis) => analysis.analysisMode === "predictive") && !predictive.length) failures.push("predictive dataset-report requires at least one admitted predictive-model AnalysisRecord");
    predictive.forEach((analysis) => {
      const at = `predictive analysis '${analysis.analysisId}'`;
      const contract = analysis.datasetTaskContract ?? analyses.find((item) => item.primaryQuestion)?.datasetTaskContract;
      const target = analysis.modelGate?.targetVariable ?? contract?.targetVariable;
      if (!nonEmpty(target)) failures.push(`${at}: targetVariable is required`);
      if (!nonEmpty(analysis.preprocessingSummary)) failures.push(`${at}: preprocessingSummary is required`);
      if (!nonEmpty(analysis.validationStrategy?.method) || !Number.isFinite(analysis.validationStrategy?.sampleCount)) failures.push(`${at}: validationStrategy method and sampleCount are required`);
      if (!array(analysis.baselineIds).length) failures.push(`${at}: baselineIds is required`);
      if (array(analysis.candidateModelIds).length < 2) failures.push(`${at}: at least two candidateModelIds are required`);
      if (!nonEmpty(analysis.selectedModelId) || !array(analysis.candidateModelIds).includes(analysis.selectedModelId)) failures.push(`${at}: selectedModelId must resolve within candidateModelIds`);
      for (const id of [...array(analysis.baselineIds), ...array(analysis.candidateModelIds)]) if (!analysisIds.has(id)) failures.push(`${at}: model reference '${id}' does not resolve to an AnalysisRecord`);
      if (!array(analysis.evaluationMetrics).length) failures.push(`${at}: evaluationMetrics are required`);
      array(analysis.evaluationMetrics).forEach((metric, index) => {
        if (!nonEmpty(metric?.name) || !Number.isFinite(metric?.value) || !["cross-validation", "validation", "external-benchmark"].includes(metric?.scope)) failures.push(`${at}: evaluationMetrics[${index}] needs name, numeric value, and valid scope`);
      });
      if (!nonEmpty(analysis.errorAnalysis?.summary)) failures.push(`${at}: errorAnalysis summary is required`);
      if (array(contract?.inferenceDatasetIds).length) {
        if (!analysis.inferenceOutput || !contract.inferenceDatasetIds.includes(analysis.inferenceOutput.datasetId)) failures.push(`${at}: inferenceOutput must resolve to a task-contract inference dataset`);
        if (analysis.inferenceOutput?.truthStatus === "unknown" && array(analysis.evaluationMetrics).some((metric) => /test\s*(?:accuracy|auc|f1|score)/i.test(metric.name))) failures.push(`${at}: unknown inference truth cannot be reported as test performance`);
      }
      array(analysis.transformIds).forEach((id) => {
        const transform = transforms.find((item) => item.transformId === id);
        if (!transform) return;
        if (!nonEmpty(transform.fitScope) || !array(transform.applyScope).length || transform.foldSafe !== true || !["none", "controlled"].includes(transform.leakageRisk)) failures.push(`${at}: transform '${id}' must declare train/fold fitScope, applyScope, foldSafe=true, and controlled leakageRisk`);
        if (/^(?:all-data|full-dataset|train\+test|labeled\+inference)$/i.test(transform.fitScope.trim())) failures.push(`${at}: transform '${id}' fits on a prohibited combined/full-data scope`);
      });
      const featureDatasets = datasets.filter((dataset) => dataset.sourceRole === "labeled-training");
      featureDatasets.flatMap((dataset) => array(dataset.fieldUsage)).filter((usage) => ["feature", "derived-source"].includes(usage?.role) && array(usage?.usedFor).some((use) => /model|predict/i.test(String(use)))).forEach((usage) => {
        if (!nonEmpty(usage.missingStrategy)) failures.push(`${at}: predictive field '${usage.field}' requires missingStrategy (use an explicit no-missing strategy when applicable)`);
      });

      if (semanticV3) {
        const search = analysis.modelSearch;
        if (!search || typeof search !== "object") {
          failures.push(`${at}: modelSearch is required by dataset semantic contract v3`);
          return;
        }
        if (!modelSearchStatuses.has(search.adequacyStatus)) failures.push(`${at}: modelSearch.adequacyStatus is invalid`);
        if (!audienceClaimLevels.has(search.audienceClaimLevel)) failures.push(`${at}: modelSearch.audienceClaimLevel is invalid`);
        if (!array(search.baselineIds).length) failures.push(`${at}: modelSearch.baselineIds requires a non-learning baseline`);
        const candidates = array(search.candidateModelIds);
        const baselines = new Set(array(search.baselineIds));
        candidates.forEach((id) => { if (baselines.has(id)) failures.push(`${at}: baseline '${id}' cannot also be a candidate model`); });
        if (new Set(candidates).size !== candidates.length) failures.push(`${at}: modelSearch.candidateModelIds contains duplicates`);
        for (const id of [...baselines, ...candidates]) if (!analysisIds.has(id)) failures.push(`${at}: modelSearch model reference '${id}' does not resolve`);
        baselines.forEach((id) => {
          const baseline = analyses.find((item) => item.analysisId === id);
          if (!baseline || baseline.analysisKind === "predictive-model" || !nonEmpty(baseline.baselineType)) failures.push(`${at}: baseline '${id}' must be a recorded non-learning analysis with baselineType`);
        });
        candidates.forEach((id) => {
          const candidate = analyses.find((item) => item.analysisId === id);
          if (candidate?.analysisKind !== "predictive-model") failures.push(`${at}: candidate '${id}' must resolve to a predictive-model AnalysisRecord`);
        });
        if (JSON.stringify(array(analysis.baselineIds)) !== JSON.stringify(array(search.baselineIds))) failures.push(`${at}: modelSearch.baselineIds must match the predictive AnalysisRecord`);
        if (JSON.stringify(array(analysis.candidateModelIds)) !== JSON.stringify(candidates)) failures.push(`${at}: modelSearch.candidateModelIds must match the predictive AnalysisRecord`);

        const familyEntries = array(search.candidateFamilies);
        const familyNames = new Set();
        const mapped = new Map();
        familyEntries.forEach((entry, index) => {
          if (!nonEmpty(entry?.family) || !array(entry?.modelIds).length) failures.push(`${at}: candidateFamilies[${index}] requires family and modelIds`);
          if (familyNames.has(entry?.family)) failures.push(`${at}: duplicate candidate family '${entry?.family}'`);
          familyNames.add(entry?.family);
          array(entry?.modelIds).forEach((id) => {
            if (!candidates.includes(id)) failures.push(`${at}: family '${entry?.family}' references non-candidate '${id}'`);
            if (mapped.has(id)) failures.push(`${at}: candidate '${id}' maps to multiple families`);
            mapped.set(id, entry?.family);
            const model = analyses.find((item) => item.analysisId === id);
            if (model?.modelFamily && model.modelFamily !== entry?.family) failures.push(`${at}: candidate '${id}' modelFamily disagrees with candidateFamilies mapping`);
          });
        });
        candidates.forEach((id) => { if (!mapped.has(id)) failures.push(`${at}: candidate '${id}' has no model-family mapping`); });

        const omissionRationales = new Map(array(search.omittedFamilyRationales).map((item) => [item?.family, item?.rationale]));
        array(search.omittedApplicableFamilies).forEach((family) => { if (!nonEmpty(omissionRationales.get(family))) failures.push(`${at}: omitted applicable family '${family}' requires a concrete rationale`); });
        const weakOmission = /^(?:for simplicity|easier to explain|already good|to keep concise|为了简洁|解释更方便|当前模型已经不错|复杂模型可能过拟合)$/i;
        omissionRationales.forEach((rationale, family) => { if (!nonEmpty(rationale) || weakOmission.test(rationale.trim())) failures.push(`${at}: omitted family '${family}' has an inadequate rationale`); });

        const validation = search.validationStrategy;
        if (!nonEmpty(validation?.method) || !nonEmpty(validation?.sharedSplitId) || !Number.isFinite(validation?.sampleCount) || validation?.foldSafePreprocessing !== true) failures.push(`${at}: modelSearch validation requires method, sharedSplitId, sampleCount, and foldSafePreprocessing=true`);
        candidates.forEach((id) => {
          const model = analyses.find((item) => item.analysisId === id);
          if (!nonEmpty(model?.validationStrategy?.split) || model.validationStrategy.split !== validation?.sharedSplitId) failures.push(`${at}: candidate '${id}' must use shared validation split '${validation?.sharedSplitId ?? "?"}'`);
        });
        if (!nonEmpty(search.primaryMetric) || !array(search.secondaryMetrics).length || !nonEmpty(search.selectionRule) || !nonEmpty(search.tieBreakRule) || !nonEmpty(search.stabilityRequirement)) failures.push(`${at}: modelSearch requires primary/secondary metrics, selectionRule, tieBreakRule, and stabilityRequirement`);
        if (search.performanceTolerance !== null && !Number.isFinite(search.performanceTolerance)) failures.push(`${at}: performanceTolerance must be numeric or null`);
        if (!array(search.foldResults).length) failures.push(`${at}: modelSearch.foldResults is required`);

        const tuning = search.parameterSearch;
        if (!tuning || !["performed", "not-performed"].includes(tuning.status) || !nonEmpty(tuning.tuningLeakageControl)) failures.push(`${at}: parameterSearch requires status and tuningLeakageControl`);
        if (tuning?.status === "performed" && (!nonEmpty(tuning.method) || !tuning.searchSpace || !Object.keys(tuning.searchSpace).length || !tuning.bestParameters || !Object.keys(tuning.bestParameters).length || !nonEmpty(tuning.stoppingRule))) failures.push(`${at}: performed parameter search requires method, searchSpace, bestParameters, and stoppingRule`);
        array(tuning?.candidateModelIds).forEach((id) => { if (!candidates.includes(id)) failures.push(`${at}: parameter search references non-candidate '${id}'`); });
        if (tuning?.status === "not-performed" && !nonEmpty(tuning.rationale)) failures.push(`${at}: omitted tuning requires a concrete rationale`);
        const inferenceIds = new Set(array(contract?.inferenceDatasetIds));
        array(tuning?.dataScopeDatasetIds).forEach((id) => { if (inferenceIds.has(id)) failures.push(`${at}: inference dataset '${id}' cannot participate in tuning`); });

        if (["limited", "preliminary"].includes(search.adequacyStatus)) {
          if (!nonEmpty(search.limitationRationale)) failures.push(`${at}: ${search.adequacyStatus} model search requires limitationRationale`);
          if (!["preliminary", "current-best"].includes(search.audienceClaimLevel)) failures.push(`${at}: ${search.adequacyStatus} model search cannot claim selected/final status`);
        }
        if (search.adequacyStatus === "sufficient") {
          if (!["selected", "final"].includes(search.audienceClaimLevel)) failures.push(`${at}: sufficient search must use selected or final audienceClaimLevel`);
          if (search.taskFamily === "tabular") {
            const hasLinear = familyNames.has("linear") || familyNames.has("generalized-linear");
            const hasTree = familyNames.has("single-tree");
            const hasEnsemble = familyNames.has("bagging") || familyNames.has("boosting");
            if (!hasLinear || !hasTree || !hasEnsemble) failures.push(`${at}: sufficient tabular search requires linear/generalized-linear, single-tree, and ensemble family coverage`);
          }
        }
        if (nonEmpty(search.selectedModelId) && search.selectedModelId !== analysis.selectedModelId) failures.push(`${at}: modelSearch.selectedModelId must match selectedModelId`);
        if (search.adequacyStatus !== "not-applicable" && !nonEmpty(search.selectedModelRationale)) failures.push(`${at}: modelSearch.selectedModelRationale is required`);
        if (!["known", "unknown", "partial"].includes(search.externalTruthStatus)) failures.push(`${at}: modelSearch.externalTruthStatus is invalid`);
      }
    });
  }

  visuals.forEach((visual) => {
    const at = `visual '${visual.visualId ?? "?"}'`;
    if (!nonEmpty(visual.sourceRef)) failures.push(`${at}: sourceRef is required`);
    if (!nonEmpty(visual.sourceHash)) failures.push(`${at}: sourceHash is required`);
    else if (!/^sha256:[a-f0-9]{64}$/i.test(visual.sourceHash)) failures.push(`${at}: sourceHash must use sha256:<64 hex>`);
    if (!evidenceTypes.has(visual.evidenceType)) failures.push(`${at}: invalid evidenceType '${visual.evidenceType}'`);
    if (!treatmentLevels.has(visual.treatmentLevel)) failures.push(`${at}: invalid treatmentLevel '${visual.treatmentLevel}'`);
    if (!evidenceStatuses.has(visual.evidenceStatus)) failures.push(`${at}: invalid evidenceStatus '${visual.evidenceStatus}'`);
    if (!representationStatuses.has(visual.representationStatus)) failures.push(`${at}: invalid representationStatus '${visual.representationStatus}'`);
    if (!nonEmpty(visual.subtype) || !nonEmpty(visual.evidenceContribution) || !nonEmpty(visual.treatmentRationale)) failures.push(`${at}: subtype, evidenceContribution, and treatmentRationale are required`);
    if (typeof visual.classificationConfidence !== "number" || visual.classificationConfidence < 0 || visual.classificationConfidence > 1) failures.push(`${at}: classificationConfidence must be between 0 and 1`);
    if (!Array.isArray(visual.claimLinks) || !visual.claimLinks.length) failures.push(`${at}: claimLinks must not be empty`);
    array(visual.claimLinks).forEach((link, index) => {
      if (!claimIds.has(link?.claimId)) failures.push(`${at}: claimLinks[${index}].claimId '${link?.claimId}' does not resolve`);
      if (!claimRelations.has(link?.relation)) failures.push(`${at}: claimLinks[${index}].relation '${link?.relation}' is invalid`);
    });
    if (visual.evidenceStatus === "UNSUPPORTED") failures.push(`${at}: UNSUPPORTED content cannot be registered as presented visual evidence`);
    if (visual.treatmentLevel === "L3" && visual.evidenceType !== "A") failures.push(`${at}: L3 is allowed only for Type A`);
    if (visual.classificationConfidence < 0.6 && visual.evidenceType !== "UNCERTAIN" && !["L0", "L1"].includes(visual.treatmentLevel)) failures.push(`${at}: low-confidence classification must fall back to UNCERTAIN or L0/L1`);

    if (visual.datasetId && !datasetIds.has(visual.datasetId)) failures.push(`${at}: datasetId '${visual.datasetId}' does not resolve`);
    if (visual.analysisId && !analysisIds.has(visual.analysisId)) failures.push(`${at}: analysisId '${visual.analysisId}' does not resolve`);

    if (visual.evidenceType === "A") {
      const chart = visual.chartSpec;
      if (!chart || typeof chart !== "object") failures.push(`${at}: Type A requires chartSpec`);
      if (!visual.defaultState || !visual.printState) failures.push(`${at}: Type A requires defaultState and printState`);
      if (visual.treatmentLevel === "L3" && !visual.datasetId && !chart?.dataRef?.datasetId) failures.push(`${at}: L3 requires a dataset reference`);
      if (chart) {
        if (!sameValues(visual.defaultState, chart.defaultState)) failures.push(`${at}: visual defaultState does not match chartSpec.defaultState`);
        if (!sameValues(visual.printState, chart.printState)) failures.push(`${at}: visual printState does not match chartSpec.printState`);
        if (!chart.units) failures.push(`${at}: chartSpec.units or explicit 'unitless' is required`);
        if (!nonEmpty(chart.accessibleSummary)) failures.push(`${at}: chartSpec.accessibleSummary is required`);
        const requiredChartText = ["analyticalQuestion", "visualThesis", "comparisonBaseline", "highlightPolicy"];
        requiredChartText.forEach((field) => { if (!nonEmpty(chart[field])) (strictDataset ? failures : warnings).push(`${at}: chartSpec.${field} is required`); });
        if (designV2) {
          for (const field of ["chartForm", "claimVisualFit", "selectionRationale"]) if (!nonEmpty(chart[field])) failures.push(`${at}: chartSpec.${field} is required by design system V2`);
          if (!array(chart.encodedFields).length) failures.push(`${at}: chartSpec.encodedFields is required by design system V2`);
          if (!array(chart.alternativeFormsConsidered).length) failures.push(`${at}: chartSpec.alternativeFormsConsidered is required by design system V2`);
        }
        if (!Array.isArray(chart.annotationTargets)) (strictDataset ? failures : warnings).push(`${at}: chartSpec.annotationTargets must be an array`);
        if (!Array.isArray(chart.readingOrder) || !chart.readingOrder.length) (strictDataset ? failures : warnings).push(`${at}: chartSpec.readingOrder must describe the intended reading sequence`);
        if (!chart.resetState || !chart.reducedMotionState) (strictDataset ? failures : warnings).push(`${at}: chartSpec requires resetState and reducedMotionState`);
        if (chart.resetState && visual.resetState && !sameValues(visual.resetState, chart.resetState)) failures.push(`${at}: visual resetState does not match chartSpec.resetState`);
        if (chart.reducedMotionState && visual.reducedMotionState && !sameValues(visual.reducedMotionState, chart.reducedMotionState)) failures.push(`${at}: visual reducedMotionState does not match chartSpec.reducedMotionState`);
        const interaction = chart.interactionSpec;
        if (!interaction || typeof interaction !== "object") (strictDataset ? failures : warnings).push(`${at}: chartSpec.interactionSpec is required`);
        else if (interaction.enabled) {
          if (!array(interaction.actions).length) failures.push(`${at}: interactive chart requires actions`);
          if (array(interaction.actions).some((action) => !chartActions.has(action))) failures.push(`${at}: interactionSpec contains an unsupported action`);
          if (array(interaction.runtimeHooks).length !== array(interaction.actions).length || array(interaction.runtimeHooks).some((hook) => !nonEmpty(hook))) failures.push(`${at}: every interaction action requires one stable runtime hook`);
          if (new Set(interaction.runtimeHooks).size !== interaction.runtimeHooks.length) failures.push(`${at}: interaction runtimeHooks must be unique`);
          const plan = new Set(array(visual.interactionPlan));
          array(interaction.actions).forEach((action) => { if (!plan.has(action)) failures.push(`${at}: interactionPlan does not include declared action '${action}'`); });
          const titleBasis = new Set([...array(visual.titleBasisMetrics), ...array(chart.titleBasisMetrics)]);
          const mustShow = new Set([...array(visual.mustShowMetricIds), ...array(chart.mustShowMetricIds)]);
          const defaults = metricIds(visual.defaultState ?? chart.defaultState);
          const resets = metricIds(visual.resetState ?? chart.resetState);
          const prints = metricIds(visual.printState ?? chart.printState);
          for (const [label, required, actual] of [["title basis", titleBasis, defaults], ["MUST_SHOW", mustShow, defaults], ["reset", new Set([...titleBasis, ...mustShow]), resets], ["print", new Set([...titleBasis, ...mustShow]), prints]]) {
            for (const metric of required) if (!actual.has(metric)) failures.push(`${at}: ${label} metric '${metric}' is not visible in its declared state`);
          }
        } else if (!nonEmpty(chart.staticRationale)) failures.push(`${at}: static Type A chart requires staticRationale`);
        if (!chart.motionSpec || !Number.isFinite(chart.motionSpec.durationMs) || chart.motionSpec.durationMs < 0 || chart.motionSpec.durationMs > 600) (strictDataset ? failures : warnings).push(`${at}: chartSpec.motionSpec must declare a 0–600ms motion contract`);
        const chartDataset = chart.dataRef?.datasetId;
        if (!datasetIds.has(chartDataset)) failures.push(`${at}: chartSpec datasetId '${chartDataset}' does not resolve`);
        array(chart.dataRef?.transformIds).forEach((id) => { if (!transformIds.has(id)) failures.push(`${at}: chartSpec transformId '${id}' does not resolve`); });
        if (chart.dataRef?.analysisId && !analysisIds.has(chart.dataRef.analysisId)) failures.push(`${at}: chartSpec analysisId '${chart.dataRef.analysisId}' does not resolve`);
        if (chart.displayValues !== undefined && chart.authoritativeValues === undefined) failures.push(`${at}: chartSpec.displayValues requires authoritativeValues for consistency validation`);
        if (chart.authoritativeValues !== undefined && chart.displayValues !== undefined && !sameValues(chart.authoritativeValues, chart.displayValues)) failures.push(`${at}: chart displayValues do not match authoritativeValues`);
      }
    }

    if (visual.evidenceType === "B") {
      const nodes = array(visual.structure?.nodes);
      if (visual.treatmentLevel === "L2" && !nodes.length && !array(visual.annotations).length) failures.push(`${at}: Type B at L2 requires verified nodes or hotspots`);
      const nodeIds = new Set(nodes.map((node) => node.id));
      nodes.forEach((node) => {
        if (!nonEmpty(node.id) || !nonEmpty(node.label) || !normalizedCoordinate(node.x) || !normalizedCoordinate(node.y)) failures.push(`${at}: structure nodes require IDs, labels, and normalized x/y coordinates`);
      });
      array(visual.structure?.edges).forEach((edge) => {
        if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) failures.push(`${at}: structure edge '${edge.from}' → '${edge.to}' references a missing node`);
      });
    }

    array(visual.annotations).forEach((annotation) => {
      if (!nonEmpty(annotation.id) || !nonEmpty(annotation.label) || !normalizedCoordinate(annotation.x) || !normalizedCoordinate(annotation.y)) failures.push(`${at}: annotations require IDs, labels, and normalized x/y coordinates`);
      if (annotation.width !== undefined && !normalizedCoordinate(annotation.width)) failures.push(`${at}: annotation '${annotation.id}' width must be between 0 and 1`);
      if (annotation.height !== undefined && !normalizedCoordinate(annotation.height)) failures.push(`${at}: annotation '${annotation.id}' height must be between 0 and 1`);
      if (normalizedCoordinate(annotation.x) && normalizedCoordinate(annotation.width) && annotation.x + annotation.width > 1) failures.push(`${at}: annotation '${annotation.id}' extends beyond the source width`);
      if (normalizedCoordinate(annotation.y) && normalizedCoordinate(annotation.height) && annotation.y + annotation.height > 1) failures.push(`${at}: annotation '${annotation.id}' extends beyond the source height`);
    });

    if (visual.evidenceType === "C") {
      if (visual.pixelImmutable !== true) failures.push(`${at}: Type C requires pixelImmutable=true`);
      if (visual.treatmentLevel === "L3" || visual.representationStatus === "RECONSTRUCTED") failures.push(`${at}: Type C cannot use L3 or RECONSTRUCTED representation`);
      if (prohibitedPixelTransforms.test(JSON.stringify(visual.pixelTransforms ?? []))) failures.push(`${at}: Type C declares a prohibited pixel transform`);
    }
    if (visual.evidenceType === "UNCERTAIN" && !["L0", "L1"].includes(visual.treatmentLevel)) failures.push(`${at}: UNCERTAIN evidence must use L0/L1`);
    if (visual.evidenceType === "MIXED") {
      if (!visual.parentVisualId && !array(visual.childVisualIds).length) failures.push(`${at}: MIXED evidence must preserve parent or child visual links`);
      if (visual.parentVisualId && !visualIds.has(visual.parentVisualId)) failures.push(`${at}: parentVisualId '${visual.parentVisualId}' does not resolve`);
      array(visual.childVisualIds).forEach((id) => { if (!visualIds.has(id)) failures.push(`${at}: childVisualId '${id}' does not resolve`); });
    }
  });

  await Promise.all(datasets.map((record) => verifySource(record, `dataset '${record.datasetId ?? "?"}'`, root, failures, warnings)));
  await Promise.all(visuals.map((record) => verifySource(record, `visual '${record.visualId ?? "?"}'`, root, failures, warnings)));

  const manifest = options.manifest;
  // Keep visual repetition a narrative gate, not a cosmetic preference. A
  // ranking bar and a regional-share bar answer different questions, while
  // consecutive copies of the same functional form do not.
  const chartFamily = (visual) => {
    const raw = `${visual?.chartSpec?.chartForm ?? ""} ${visual?.chartSpec?.chartType ?? ""} ${visual?.subtype ?? ""}`.toLowerCase();
    if (/scatter|relationship/.test(raw)) return "scatter";
    if (/table|alignment|matrix/.test(raw)) return "comparison-table";
    if (/cagr|rank[- ]?shift|reorder/.test(raw)) return "rank-shift";
    if (/regional|share/.test(raw)) return "regional-comparison";
    if (/rank|cagr|bars?/.test(raw)) return "ranking-bars";
    if (/trend|time/.test(raw)) return "time-trend";
    if (/structure|flow|mechanism/.test(raw)) return "structure";
    return raw.replace(/[^a-z0-9]+/g, "-") || "unspecified";
  };
  if (manifest) {
    const visualById = new Map(visuals.map((visual) => [visual.visualId, visual]));
    const outputUnits = manifest.outputMode === "scroll-report" ? array(manifest.sections) : array(manifest.slides);
    const orderedVisuals = outputUnits.flatMap((unit) => array(unit.visualIds).map((id) => visualById.get(id)).filter(Boolean));
    const familyCounts = new Map();
    orderedVisuals.forEach((visual) => { const family = chartFamily(visual); familyCounts.set(family, (familyCounts.get(family) ?? 0) + 1); });
    const repeatRationale = (visual) => nonEmpty(visual?.repeatRationale) || nonEmpty(visual?.chartSpec?.repeatRationale) || nonEmpty(visual?.comparisonRationale);
    for (let index = 1; index < orderedVisuals.length; index += 1) {
      const previous = orderedVisuals[index - 1]; const current = orderedVisuals[index];
      if (previous?.evidenceType === "A" && current?.evidenceType === "A" && chartFamily(previous) === chartFamily(current) && !repeatRationale(current)) {
        (semanticV2 ? failures : warnings).push(`visual repetition: consecutive ${chartFamily(current)} visuals '${previous.visualId}' and '${current.visualId}' need a comparison rationale or a different visual form`);
      }
    }
    for (const [family, count] of familyCounts) {
      const same = orderedVisuals.filter((visual) => chartFamily(visual) === family);
      if (family === "ranking-bars" && count > 2 && !same.some(repeatRationale)) (designV2 ? failures : warnings).push(`visual repetition: horizontal/sorted bar form appears ${count} times; V2 limit is two without an analytical rationale`);
      if (orderedVisuals.length >= 3 && count / orderedVisuals.length > .4 && !same.some(repeatRationale)) (designV2 ? failures : warnings).push(`visual repetition: '${family}' occupies ${Math.round(count / orderedVisuals.length * 100)}% of key data visuals; V2 limit is 40% without a series rationale`);
    }
    outputUnits.forEach((unit, index) => {
      const at = `${manifest.outputMode === "scroll-report" ? "section" : "slide"} ${index + 1}`;
      array(unit.claimIds).forEach((id) => { if (!claimIds.has(id)) failures.push(`${at}: claimId '${id}' does not resolve in evidence registry`); });
      array(unit.visualIds).forEach((id) => { if (!visualIds.has(id)) failures.push(`${at}: visualId '${id}' does not resolve in evidence registry`); });
      const unitClaims = new Set(array(unit.claimIds));
      array(unit.visualIds).forEach((id) => {
        const visual = visualById.get(id);
        array(visual?.claimLinks).forEach((link) => {
          if (!unitClaims.has(link.claimId) && !nonEmpty(unit.evidenceLinkRationale)) failures.push(`${at}: visualId '${id}' links claim '${link.claimId}' but the output unit does not declare it`);
        });
        if ((designV2 || semanticV3) && visual?.evidenceType === "A") {
          const title = String(unit.title ?? "");
          const form = String(visual.chartSpec?.chartForm ?? visual.chartSpec?.chartType ?? "").toLowerCase();
          const semanticLabels = { "correlation-form-mismatch": "title claims correlation/Pearson but the main visual does not encode an original-variable relationship or correlation comparison", "ranking-mismatch-form": "title claims ranking mismatch but the main visual is not a slopegraph or dumbbell chart", "rank-change-form": "title claims rank change but the main visual does not encode two time points or a rank trajectory" };
          chartSemanticFailures(title, form).forEach((kind) => failures.push(`${at}: visual '${id}': ${semanticLabels[kind]}`));
        }
      });
      array(unit.findingIds).forEach((id) => {
        const finding = analyses.find((analysis) => analysis.analysisId === id && nonEmpty(analysis.findingStatement));
        if (!finding) failures.push(`${at}: findingId '${id}' does not resolve to an AnalysisRecord finding`);
      });
    });
    const runtimeHooks = new Map(array(manifest.runtimeHooks).map((hook) => [hook?.id, hook]));
    visuals.filter((visual) => visual.evidenceType === "A" && visual.chartSpec?.interactionSpec?.enabled).forEach((visual) => {
      const interaction = visual.chartSpec.interactionSpec;
      interaction.runtimeHooks.forEach((hookId, index) => {
        const hook = runtimeHooks.get(hookId);
        if (!hook || hook.visualId !== visual.visualId || hook.action !== interaction.actions[index]) failures.push(`visual '${visual.visualId}': runtime hook '${hookId}' is not registered to the matching visual/action in manifest.runtimeHooks`);
      });
    });
    if (strictDataset) {
      const decisive = visuals.filter((visual) => visual.evidenceType === "A" && visual.decisive === true);
      const interactive = decisive.filter((visual) => visual.chartSpec?.interactionSpec?.enabled === true);
      const requiredInteractive = Math.min(2, decisive.length);
      if (interactive.length < requiredInteractive) failures.push(`dataset-report has ${decisive.length} decisive Type A visual(s) but only ${interactive.length} interactive; expected ${requiredInteractive}`);
    }
  }

  return {
    registry: registryPath,
    counts: { claims: claims.length, datasets: datasets.length, transforms: transforms.length, analyses: analyses.length, narrativeUnits: narrativeUnits.length, visuals: visuals.length },
    analysisSummary: {
      modes: [...new Set(analyses.map((analysis) => analysis.analysisMode).filter(Boolean))],
      primaryQuestions: analyses.map((analysis) => analysis.primaryQuestion).filter(nonEmpty),
      findingIds: analyses.filter((analysis) => nonEmpty(analysis.findingStatement)).map((analysis) => analysis.analysisId),
      mustShowFindingIds: analyses.filter((analysis) => analysis.findingPriority === "MUST_SHOW" && nonEmpty(analysis.findingStatement)).map((analysis) => analysis.analysisId),
      intentSources: [...new Set(analyses.map((analysis) => analysis.analysisIntentSource).filter(Boolean))],
      modeRationales: analyses.map((analysis) => analysis.analysisModeRationale).filter(nonEmpty),
      taskContracts: analyses.map((analysis) => analysis.datasetTaskContract).filter(Boolean),
      sourceRoles: datasets.map((dataset) => ({ datasetId: dataset.datasetId, sourceRole: dataset.sourceRole })),
      fieldCoverage: datasets.map((dataset) => ({ datasetId: dataset.datasetId, fields: array(dataset.fields).length, usages: array(dataset.fieldUsage).length })),
      predictiveAnalysisIds: analyses.filter((analysis) => analysis.analysisMode === "predictive" && analysis.analysisKind === "predictive-model").map((analysis) => analysis.analysisId),
      modelSearches: analyses.filter((analysis) => analysis.modelSearch).map((analysis) => ({ analysisId: analysis.analysisId, ...analysis.modelSearch })),
    },
    passed: failures.length === 0,
    failures,
    warnings,
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const input = process.argv[2] ?? process.cwd();
  const manifestPath = process.argv[3];
  let manifest;
  if (manifestPath) {
    try { manifest = JSON.parse(await readFile(path.resolve(manifestPath), "utf8")); }
    catch { console.error(`[evidence-validator] cannot read manifest JSON: ${path.resolve(manifestPath)}`); process.exit(2); }
  }
  const report = await validateEvidenceRegistry(input, { manifest });
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.passed ? 0 : 1);
}
