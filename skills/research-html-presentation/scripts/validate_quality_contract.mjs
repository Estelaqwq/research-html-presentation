#!/usr/bin/env node

import { access, readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { validateAgainstContractSchema } from "./validate_schema_contracts.mjs";
import { referenceCalibrationFailures, visualMetricFailures } from "./visual_quality_rules.mjs";
import { computeRenderFingerprint } from "./review_fingerprint.mjs";

const root = path.resolve(process.argv[2] ?? process.cwd());
const manifestPath = path.join(root, "deck-manifest.json");
const failures = [];
const warnings = [];
const array = (value) => Array.isArray(value) ? value : [];
const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0;
const ids = (value) => new Set(array(value).flatMap((item) => typeof item === "string" ? [item] : item && typeof item === "object" ? [item.id, item.metricId, item.name].filter(nonEmpty) : []));
const exists = (file) => access(file).then(() => true).catch(() => false);

async function json(file) {
  try { return JSON.parse(await readFile(file, "utf8")); }
  catch { return null; }
}

async function walk(directory, result = []) {
  if (!await exists(directory)) return result;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (["node_modules", "dist", "build", ".git", ".deck-render"].includes(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(file, result);
    else result.push(file);
  }
  return result;
}

let manifest = await json(manifestPath);
if (!manifest) {
  console.error(JSON.stringify({ project: root, passed: false, failures: [`cannot read ${manifestPath}`], warnings: [] }, null, 2));
  process.exit(2);
}

const version = Number(manifest.qualityContractVersion ?? 0);
const enforced = manifest.newProject === true && version >= 1;
if (!enforced) {
  console.log(JSON.stringify({ project: root, passed: true, skipped: true, reason: "quality contract v1 is opt-in for new scaffold projects; legacy projects remain readable", failures, warnings }, null, 2));
  process.exit(0);
}

const outputMode = manifest.outputMode ?? "slide-deck";
const scroll = outputMode === "scroll-report";
const stage = manifest.stage ?? "complete";
const designV2 = manifest.newProject === true && Number(manifest.designSystemVersion ?? 0) >= 2;
const units = scroll ? array(manifest.sections) : array(manifest.slides);
const substantive = units.filter((unit) => scroll ? !["hero", "closing"].includes(unit.role) : !["cover", "closing"].includes(unit.type));
const authoringEnabled = manifest.authoring?.enabled === true;
const authoringRequired = manifest.requestedCapabilities?.authoring === "required";
const densityRationale = (unit) => unit?.densityException ?? unit?.layoutRationale;
const hasAuditableDensityRationale = (unit) => {
  const rationale = densityRationale(unit);
  // A bare string is not auditable: complete-stage exceptions need both a
  // reason and an accountable reviewer or evidence basis.
  if (typeof rationale === "string") return false;
  return Boolean(rationale && typeof rationale.reason === "string" && rationale.reason.trim() && (rationale.reviewedBy || array(rationale.basisIds).length));
};

if (authoringRequired && !authoringEnabled) failures.push("requestedCapabilities.authoring=required but authoring.enabled is not true");
if (manifest.requestedCapabilities?.authoring === "disabled" && authoringEnabled) failures.push("requestedCapabilities.authoring=disabled conflicts with authoring.enabled=true");
if (!manifest.requestedCapabilities?.authoring) failures.push("new quality-contract projects must declare requestedCapabilities.authoring as required or disabled");
if (authoringEnabled) {
  if (manifest.newProject === true && manifest.authoring?.mode !== "browser-with-local-fallback") failures.push("new authoring projects must declare mode=browser-with-local-fallback");
  const registry = path.resolve(root, manifest.authoring?.registry ?? "presentation-edit-registry.json");
  if (!registry.startsWith(`${root}${path.sep}`) && registry !== path.join(root, "presentation-edit-registry.json")) failures.push("authoring registry must stay inside project root");
  if (!await exists(registry)) failures.push("Authoring Layer is enabled but its Registry is missing");
  const registryDocument = await json(registry);
  if (registryDocument) {
    const editIds = new Set(); const targetFields = new Set();
    for (const [index, field] of array(registryDocument.fields).entries()) {
      const at = `Registry field ${index + 1}`;
      if (!nonEmpty(field?.editId) || editIds.has(field.editId)) failures.push(`${at}: editId must be unique`); else editIds.add(field.editId);
      const targetField = `${field?.targetId}::${field?.field}`;
      if (!nonEmpty(field?.targetId) || !nonEmpty(field?.field) || targetFields.has(targetField)) failures.push(`${at}: targetId + field must be unique`); else targetFields.add(targetField);
      const hash = `sha256:${createHash("sha256").update(typeof field?.baseValue === "string" ? field.baseValue : JSON.stringify(field?.baseValue)).digest("hex")}`;
      if (field?.expectedValueHash !== hash) failures.push(`${at}: expectedValueHash does not match baseValue`);
      if (stage === "complete" && /\bTODO\b|待真实|占位/i.test(typeof field?.baseValue === "string" ? field.baseValue : JSON.stringify(field?.baseValue))) failures.push(`${at}: complete Registry still contains scaffold placeholder content`);
    }
  }
  for (const relative of ["src/runtime/editor/EditorShell.tsx", "src/runtime/editor/AutoEditRegistry.ts", "src/AuthoringBoundary.tsx"]) {
    if (!await exists(path.join(root, relative))) failures.push(`Authoring Layer is missing ${relative}`);
  }
  const pkg = await json(path.join(root, "package.json"));
  if (pkg?.scripts && !String(pkg.scripts.dev ?? "").includes("authoring") && !String(pkg.scripts.author ?? "").includes("authoring")) warnings.push("authoring is enabled but no authoring-mode dev script was found");
  const runtimeContracts = [
    ["src/runtime/editor/EditorShell.tsx", "event.key.toLowerCase()", "E keyboard toggle"],
    ["src/runtime/editor/EditorShell.tsx", "storage.save", "Save persistence"],
    ["src/runtime/editor/EditorShell.tsx", "const undo", "Undo"],
    ["src/runtime/editor/EditorShell.tsx", "const redo", "Redo"],
    ["src/runtime/editor/EditorShell.tsx", "const resetAll", "Reset"],
    ["src/runtime/editor/EffectiveContent.tsx", "applyEditPatch", "Patch application"],
  ];
  for (const [relative, token, label] of runtimeContracts) {
    const file = path.join(root, relative);
    if (!await exists(file)) continue;
    if (!(await readFile(file, "utf8")).includes(token)) failures.push(`Authoring runtime is missing ${label}`);
  }
}

if (stage === "complete" && manifest.scaffoldPlaceholder === true) failures.push("complete projects cannot retain scaffoldPlaceholder=true");
if (stage === "complete" && /\bTODO\b|待真实|占位/i.test(JSON.stringify(manifest.title ?? ""))) failures.push("complete manifest title still contains scaffold placeholder content");

if (!scroll && stage === "complete" && units.length >= 8 && units.length <= 12) {
  const distinct = new Set(units.filter((unit) => !["cover", "closing"].includes(unit.type)).map((unit) => unit.layout).filter(nonEmpty));
  if (distinct.size < 4) failures.push(`complete 8–12 slide deck uses ${distinct.size} layout templates; at least four are required`);
  if (designV2) {
    const bodySilhouettes = new Set(units.filter((unit) => !["cover", "closing"].includes(unit.type)).map((unit) => unit.bodySilhouette).filter(nonEmpty));
    if (bodySilhouettes.size < 5) failures.push(`complete V2 8–12 slide deck declares ${bodySilhouettes.size} body silhouettes; at least five are required, and the rendered contact sheet must confirm they are genuinely distinct`);
  }
  for (let index = 2; index < units.length; index += 1) {
    const run = units.slice(index - 2, index + 1);
    if (run.every((unit) => unit.layout === run[0].layout) && !run.every((unit) => unit.series === true)) failures.push(`slides ${index - 1}–${index + 1}: same silhouette repeated three times without a series rationale`);
  }
}

const sourceFiles = (await walk(root)).filter((file) => /\.(?:tsx?|jsx?|html|css)$/.test(file));
for (const file of sourceFiles) {
  const source = await readFile(file, "utf8");
  const manualPageProp = /<(?:ContentHeader|SlideHeader|PageCounter|PresenterPage)\b[^>]*\b(?:page|pageNumber|currentPage|slideNumber)\s*=\s*(?:\{\s*\d+\s*\}|["']\d+["'])/i;
  const manualPageLiteral = /\b(?:page|pageNumber|currentPage|slideNumber|slideNo)\s*[:=]\s*(?:\{\s*)?["']?\d{1,3}["']?\s*\}?/i;
  if (manualPageProp.test(source) || manualPageLiteral.test(source)) {
    failures.push(`hard-coded page number in ${path.relative(root, file)}; derive page labels from runtime context`);
  }
}

const registryPath = typeof manifest.evidenceRegistry === "string" ? path.resolve(root, manifest.evidenceRegistry) : path.join(root, "evidence-visuals.json");
const evidence = await json(registryPath);
const evidenceById = new Map(array(evidence?.visuals).filter((visual) => nonEmpty(visual?.visualId)).map((visual) => [visual.visualId, visual]));
if (stage === "complete" && !manifest.scaffoldPlaceholder) {
  if (!evidence) failures.push("complete quality-contract project cannot validate its Evidence Registry");
  const narrativeUnits = array(evidence?.narrativeUnits);
  const byId = new Map(narrativeUnits.filter((unit) => nonEmpty(unit?.id)).map((unit) => [unit.id, unit]));
  const seen = new Set();
  const priorFindings = new Set();
  const priorResults = new Set();
  for (const unit of substantive) {
    const id = unit.narrativeUnitId;
    const at = unit.id ?? unit.title ?? "unnamed unit";
    if (!nonEmpty(id)) { failures.push(`${at}: substantive page/section lacks narrativeUnitId`); continue; }
    if (seen.has(id)) failures.push(`${at}: narrativeUnit '${id}' is reused by multiple substantive pages`);
    seen.add(id);
    const narrative = byId.get(id);
    if (!narrative) { failures.push(`${at}: narrativeUnit '${id}' does not resolve in the Evidence Registry`); continue; }
    if (!nonEmpty(narrative.substantiveContribution)) failures.push(`${at}: narrativeUnit '${id}' lacks substantiveContribution`);
    const plan = narrative.visualPlan;
    if (stage === "complete" && (!plan || !nonEmpty(plan.coreClaim) || !nonEmpty(plan.visualCenter))) failures.push(`${at}: narrativeUnit '${id}' requires a material-adaptive visualPlan with coreClaim and visualCenter`);
    if (plan) {
      const available = new Set(array(plan.availableVisualIds));
      for (const visualId of array(plan.primaryVisualIds)) if (available.size && !available.has(visualId)) failures.push(`${at}: visualPlan primaryVisualId '${visualId}' is not in availableVisualIds`);
      if (!array(plan.evidenceKinds).length) failures.push(`${at}: visualPlan '${id}' must classify its evidence kind(s)`);
    }
    const pageRefs = new Set([...array(unit.claimIds), ...array(unit.visualIds), ...array(unit.findingIds), ...array(unit.dataFactIds), ...array(unit.methodIds), ...array(unit.resultIds)]);
    const narrativeRefs = new Set([...array(narrative.claimIds), ...array(narrative.chartSpecIds), ...array(narrative.findingIds), ...array(narrative.dataFactIds), ...array(narrative.methodIds), ...array(narrative.resultIds), ...array(narrative.titleBasisIds)]);
    const substantiveRefs = new Set([...array(narrative.claimIds), ...array(narrative.chartSpecIds), ...array(narrative.findingIds), ...array(narrative.dataFactIds), ...array(narrative.methodIds), ...array(narrative.resultIds)]);
    if (!pageRefs.size) failures.push(`${at}: substantive page/section must declare at least one evidence-bearing reference`);
    if (!substantiveRefs.size) failures.push(`${at}: narrativeUnit '${id}' needs a real dataFactId, methodId, resultId, findingId, chartSpecId, or claimId; titleBasisIds alone are insufficient`);
    if (pageRefs.size && ![...pageRefs].some((ref) => narrativeRefs.has(ref))) failures.push(`${at}: page evidence references do not intersect narrativeUnit '${id}'`);

    // Synthesis is a compression step, not a place to introduce fresh evidence.
    // A finding/result must already have appeared on an earlier substantive page
    // so the audience can trace the summary back to an observed result.
    const isSynthesis = scroll ? unit.role === "synthesis" : unit.type === "synthesis";
    if (isSynthesis) {
      for (const findingId of array(unit.findingIds)) if (!priorFindings.has(findingId)) failures.push(`${at}: synthesis introduces finding '${findingId}' before it appears on an earlier substantive page`);
      for (const resultId of array(unit.resultIds)) if (!priorResults.has(resultId)) failures.push(`${at}: synthesis introduces result '${resultId}' before it appears on an earlier substantive page`);
    }
    array(unit.findingIds).forEach((findingId) => priorFindings.add(findingId));
    array(unit.resultIds).forEach((resultId) => priorResults.add(resultId));
  }
}

for (const unit of substantive) {
  if (densityRationale(unit) !== undefined && !hasAuditableDensityRationale(unit)) {
    failures.push(`${unit.id ?? "unnamed unit"}: layoutRationale/densityException must include a non-empty reason and reviewedBy or basisIds`);
  }
}

if (stage === "complete") {
  const review = await json(path.join(root, "visual-review.json")) ?? await json(path.join(root, ".deck-render", "visual-review.json"));
  if (!review) failures.push("complete stage requires visual-review.json");
  else {
    const currentRenderFingerprint = await computeRenderFingerprint(root);
    if (Array.isArray(review)) failures.push("complete visual-review must be an object with renderFingerprint, reviewedAt, and reviewEvidence");
    if (review.renderFingerprint !== currentRenderFingerprint) failures.push("visual-review renderFingerprint is stale; re-render and repeat composition/detail inspection after the latest source/style/content change");
    if (review.currentRenderFingerprint && review.currentRenderFingerprint !== currentRenderFingerprint) failures.push("visual-review currentRenderFingerprint does not match the current project state");
    if (review.reviewInvalidated === true) failures.push("visual-review is marked invalidated and must be reviewed again");
    if (!nonEmpty(review.reviewedAt) || !Number.isFinite(Date.parse(review.reviewedAt))) failures.push("visual-review reviewedAt must be a valid timestamp from the latest inspection");
    const reviewEvidence = array(review.reviewEvidence);
    if (!reviewEvidence.length) failures.push("visual-review reviewEvidence must contain at least one rendered screenshot or contact-sheet path");
    for (const relative of reviewEvidence) {
      const evidencePath = nonEmpty(relative) ? path.resolve(root, relative) : null;
      if (!evidencePath || (!evidencePath.startsWith(`${root}${path.sep}`) && evidencePath !== root) || !await exists(evidencePath)) failures.push(`visual-review reviewEvidence '${relative ?? ""}' must resolve to an existing project-local artifact`);
    }
    const reviewSchema = await validateAgainstContractSchema("visual-review.schema.json", review);
    if (!reviewSchema.passed) failures.push(...reviewSchema.failures.map((failure) => `visual-review schema: ${failure}`));
    if (manifest.profile === "literature-review" && !scroll) {
      const deckReview = review.deckReview;
      if (!deckReview || typeof deckReview !== "object") failures.push("literature review requires visual-review.deckReview with contact-sheet, speaking-arc, rhythm, and source-visual review");
      else {
        const meaningful = (value, min) => nonEmpty(value) && value.trim().length >= min && !/^(?:pass|passed|ok|none|无|无问题|已检查|通过|待补充|todo)$/i.test(value.trim());
        if (!meaningful(deckReview.speakingArc, 40)) failures.push("deckReview.speakingArc must explain the complete paper-reporting sequence, not merely mark pass");
        if (!meaningful(deckReview.crossPageAssessment, 30)) failures.push("deckReview.crossPageAssessment must record concrete body-layout rhythm findings");
        const contactSheet = nonEmpty(deckReview.contactSheet) ? path.resolve(root, deckReview.contactSheet) : null;
        if (!contactSheet || !contactSheet.startsWith(`${root}${path.sep}`) || !await exists(contactSheet)) failures.push("deckReview.contactSheet must point to an existing all-page contact sheet inside the project");
        const sourceVisuals = array(deckReview.sourceVisuals);
        if (!sourceVisuals.length && !meaningful(deckReview.noNumberedVisualsReason, 12)) failures.push("deckReview must inventory every numbered source figure/table or explain that the paper has none");
        const sourceIds = new Set();
        for (const visual of sourceVisuals) {
          if (!nonEmpty(visual.sourceId) || sourceIds.has(visual.sourceId)) failures.push("deckReview.sourceVisuals requires unique non-empty sourceId values");
          sourceIds.add(visual.sourceId);
          if (!meaningful(visual.reason, 12)) failures.push(`deckReview source visual '${visual.sourceId ?? "unnamed"}' needs a specific use/omission reason`);
          if (!["backup", "omit"].includes(visual.decision) && !array(visual.slideIds).length) failures.push(`deckReview source visual '${visual.sourceId ?? "unnamed"}' needs slideIds for its chosen treatment`);
          for (const slideId of array(visual.slideIds)) if (!units.some((unit) => unit.id === slideId)) failures.push(`deckReview source visual '${visual.sourceId ?? "unnamed"}' refers to unknown slide '${slideId}'`);
        }
      }
    }
    const entries = array(review.slides ?? review.sections ?? review);
    const expected = new Set(substantive.map((unit) => unit.id));
    const actual = new Set(entries.map((entry) => entry?.slideId ?? entry?.sectionId).filter(nonEmpty));
    for (const id of expected) if (!actual.has(id)) failures.push(`visual-review.json is missing substantive unit '${id}'`);
    for (const entry of entries) {
      const id = entry?.slideId ?? entry?.sectionId;
      if (!nonEmpty(id) || !expected.has(id)) continue;
      const unit = substantive.find((candidate) => candidate.id === id);
      const hasTypeA = array(unit?.visualIds).some((visualId) => evidenceById.get(visualId)?.evidenceType === "A");
      if (entry.compositionReviewed !== true || entry.detailReviewed !== true) failures.push(`visual-review '${id}' must record compositionReviewed and detailReviewed=true`);
      if (designV2 && !scroll && !nonEmpty(entry.bodySilhouette)) failures.push(`visual-review '${id}' must record bodySilhouette for design system V2`);
      if (designV2 && !scroll && nonEmpty(entry.bodySilhouette) && entry.bodySilhouette !== unit?.bodySilhouette) failures.push(`visual-review '${id}' bodySilhouette does not match the manifest declaration`);
      if (designV2 && !nonEmpty(entry.silhouetteStatus)) failures.push(`visual-review '${id}' must record silhouetteStatus for design system V2`);
      if (designV2 && hasTypeA && !nonEmpty(entry.chartSemanticFitStatus)) failures.push(`visual-review '${id}' must record chartSemanticFitStatus for Type A evidence`);
      const hasFlow = unit?.bodySilhouette === "process-board";
      if (hasFlow && !nonEmpty(entry.flowGeometryStatus)) failures.push(`visual-review '${id}' must record flowGeometryStatus for a process-board`);
      if (!scroll && !nonEmpty(entry.brandPlacementStatus)) failures.push(`visual-review '${id}' must record brandPlacementStatus for the content-page lockup`);
      if (!scroll && !nonEmpty(entry.scaledPreviewStatus)) failures.push(`visual-review '${id}' must record scaledPreviewStatus after the viewport sweep`);
      const statusKeys = ["densityStatus", "titleStatus", "plotOccupancyStatus", "evidenceWeightStatus", "overflowStatus", ...(designV2 ? ["silhouetteStatus", ...(hasTypeA ? ["chartSemanticFitStatus"] : [])] : []), ...(hasFlow ? ["flowGeometryStatus"] : []), ...(!scroll ? ["brandPlacementStatus", "scaledPreviewStatus"] : [])];
      for (const key of statusKeys) {
        if (!nonEmpty(entry[key])) failures.push(`visual-review '${id}' is missing ${key}`);
        else if (/^(?:pending|unknown|todo)$/i.test(entry[key])) failures.push(`visual-review '${id}' has incomplete ${key}=${entry[key]}`);
        else if (/fail|error|blocked/i.test(entry[key])) failures.push(`visual-review '${id}' has blocking ${key}=${entry[key]}`);
        else if (!["pass", "warning", "not-applicable"].includes(entry[key])) failures.push(`visual-review '${id}' has unsupported ${key}=${entry[key]}; use pass, warning, fail, or not-applicable`);
      }
      if (statusKeys.some((key) => entry[key] === "not-applicable") && !nonEmpty(entry.notApplicableReason)) failures.push(`visual-review '${id}' uses not-applicable without notApplicableReason`);
      if (hasFlow && entry.flowGeometryStatus === "not-applicable") failures.push(`visual-review '${id}' is a process-board; flowGeometryStatus cannot be not-applicable`);
      if (!scroll && entry.brandPlacementStatus === "not-applicable") failures.push(`visual-review '${id}' has a content-page lockup; brandPlacementStatus cannot be not-applicable`);
      if (!scroll && entry.scaledPreviewStatus === "not-applicable") failures.push(`visual-review '${id}' is a deck page; scaledPreviewStatus cannot be not-applicable`);
      const metrics = entry.metrics;
      if (stage === "complete") {
        if (!metrics || metrics.auditSource !== "browser") failures.push(`visual-review '${id}' must include latest browser metrics (auditSource=browser)`);
        const numericMetrics = ["contentOccupancy", ...(!scroll ? ["paintDensity", "paintToLayoutRatio"] : []), "lowerHalfCoverage", "largestEmptyRegionRatio", "evidenceWeightBalance"];
        for (const metric of numericMetrics) if (metrics && (!Number.isFinite(metrics[metric]))) failures.push(`visual-review '${id}' metric ${metric} must be a finite number`);
        if (metrics && metrics.dominantVisualRatio !== "not-applicable" && !Number.isFinite(metrics.dominantVisualRatio)) failures.push(`visual-review '${id}' metric dominantVisualRatio must be finite or not-applicable`);
        if (hasTypeA && metrics && !Number.isFinite(metrics.dominantVisualRatio)) failures.push(`visual-review '${id}' contains Type A evidence and requires numeric dominantVisualRatio`);
        for (const metric of ["internalOccupancy", "moduleInternalOccupancy", "plotOccupancy"]) if (metrics && metrics[metric] !== "not-applicable" && !Number.isFinite(metrics[metric])) failures.push(`visual-review '${id}' metric ${metric} must be finite or not-applicable`);
        if (designV2 && !scroll && metrics && !nonEmpty(metrics.layoutSignature)) failures.push(`visual-review '${id}' must include the browser-derived layoutSignature; manifest labels cannot certify cross-page variety`);
        if (designV2 && !scroll && metrics && (!Number.isInteger(metrics.layoutClusterSize) || metrics.layoutClusterSize < 1)) failures.push(`visual-review '${id}' must include a positive integer layoutClusterSize`);
        if (designV2 && !scroll && metrics && !nonEmpty(metrics.layoutFamilySignature)) failures.push(`visual-review '${id}' must include the browser-derived layoutFamilySignature`);
        if (designV2 && !scroll && metrics && (!Number.isInteger(metrics.layoutFamilyClusterSize) || metrics.layoutFamilyClusterSize < 1)) failures.push(`visual-review '${id}' must include a positive integer layoutFamilyClusterSize`);
        const metricFailures = visualMetricFailures(metrics, { outputMode, hasTypeA, hasDensityException: hasAuditableDensityRationale(unit), repeatedRegionsJustified: nonEmpty(unit?.comparisonRationale) });
        const metricLabels = { "content-occupancy": "contentOccupancy is below 0.70", "paint-density": "paintDensity is below 0.38; large semantic boxes do not compensate for visibly empty content", "paint-to-layout-ratio": "paintToLayoutRatio is below 0.45; the declared layout is substantially underfilled", "internal-occupancy": "internalOccupancy is below 0.60", "module-internal-occupancy": "moduleInternalOccupancy is below 0.30", "module-measurement-missing": "visible semantic modules were not measured", "lower-half-coverage": "lowerHalfCoverage is below 0.45 without an auditable exception", "repeated-equal-regions": "three or more equal regions lack a comparison rationale", "justified-equal-regions-underfilled": "equal comparison regions remain underfilled; a rationale cannot excuse hollow card walls", "decisive-visual-too-small": "Type A evidence is visually undersized relative to the safe body", "cross-page-layout-repetition": "the same browser-derived body geometry appears on more than two substantive pages", "cross-page-layout-family-repetition": "the same browser-derived body template family appears on more than two substantive pages", "type-a-plot-occupancy": "Type A evidence requires numeric plotOccupancy", "browser-measurement-error": "browser metrics contain blocking errors", "browser-metrics-missing": "browser metrics are missing" };
        metricFailures.forEach((kind) => failures.push(`visual-review '${id}': ${metricLabels[kind]}`));
        if (hasTypeA && entry.plotOccupancyStatus === "not-applicable") failures.push(`visual-review '${id}' contains Type A evidence; plotOccupancyStatus cannot be not-applicable`);
        if (!hasTypeA && entry.plotOccupancyStatus === "not-applicable" && !nonEmpty(entry.notApplicableReason)) failures.push(`visual-review '${id}' plotOccupancy not-applicable requires a structure-specific reason`);
        if (/等待浏览器测量|等待真实内容|待真实内容|pending browser|waiting for/i.test(entry.reviewerNotes ?? "")) failures.push(`visual-review '${id}' retains incomplete reviewer notes in a complete project`);
      }
    }
    if (manifest.referenceVisualContract) {
      const calibration = entries.find((entry) => entry.referenceCalibration)?.referenceCalibration;
      for (const kind of referenceCalibrationFailures(manifest.referenceVisualContract, calibration, { stage })) failures.push(`reference calibration: ${kind}`);
    }
  }
}

const metricsFromState = (state) => {
  if (!state || typeof state !== "object") return new Set();
  return new Set([
    ...ids(state.visibleMetricIds), ...ids(state.visibleMetrics), ...ids(state.metricIds), ...ids(state.metrics),
  ]);
};
for (const visual of array(evidence?.visuals)) {
  const spec = visual?.chartSpec ?? {};
  const interaction = visual?.interactionSpec ?? spec.interactionSpec;
  if (interaction?.enabled !== true && !array(visual?.interactionPlan).length) continue;
  const defaultVisible = metricsFromState(visual.defaultState ?? spec.defaultState);
  const printVisible = metricsFromState(visual.printState ?? spec.printState);
  const resetVisible = metricsFromState(visual.resetState ?? spec.resetState);
  const titleBasis = new Set([...ids(visual.titleBasisMetrics), ...ids(spec.titleBasisMetrics)]);
  const mustShow = new Set([...ids(visual.mustShowMetricIds), ...ids(spec.mustShowMetricIds)]);
  for (const [label, required, actual] of [["title basis", titleBasis, defaultVisible], ["MUST_SHOW", mustShow, defaultVisible], ["print", new Set([...titleBasis, ...mustShow]), printVisible]]) {
    for (const metric of required) if (!actual.has(metric)) failures.push(`interactive visual '${visual.visualId ?? "?"}' hides ${label} metric '${metric}' in its declared state`);
  }
  if (titleBasis.size || mustShow.size) for (const metric of new Set([...titleBasis, ...mustShow])) if (!resetVisible.has(metric)) failures.push(`interactive visual '${visual.visualId ?? "?"}' resetState omits required metric '${metric}'`);
}

const report = { project: root, qualityContractVersion: version, stage, enforced, authoring: { enabled: authoringEnabled, required: authoringRequired }, passed: failures.length === 0, failures, warnings };
console.log(JSON.stringify(report, null, 2));
process.exit(failures.length ? 1 : 0);
