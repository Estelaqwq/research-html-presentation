#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { validateEvidenceRegistry } from "./validate_evidence_visuals.mjs";
import { getContractSchemaNode, resolveProjectContractPath, validateAgainstContractSchema } from "./validate_schema_contracts.mjs";

import { validateBranding } from "./branding_contract.mjs";

const array = (value) => Array.isArray(value) ? value : [];

const manifestPath = path.resolve(process.argv[2] ?? "deck-manifest.json");
let manifest;
try {
  manifest = JSON.parse(await readFile(manifestPath, "utf8"));
} catch {
  console.error(`[manifest-validator] cannot read valid JSON: ${manifestPath}`);
  process.exit(2);
}

const supportedProfiles = new Set((await getContractSchemaNode("deck-manifest.schema.json", "properties/profile/enum")));

const synthesisRequiredProfiles = new Set(["thesis-defense", "project-review", "grant-review", "dataset-report"]);
const slides = Array.isArray(manifest.slides) ? manifest.slides : [];
const sections = Array.isArray(manifest.sections) ? manifest.sections : [];
const profile = manifest.profile ?? "thesis-defense";
const outputMode = manifest.outputMode ?? "slide-deck";
const visualStyle = manifest.visualStyle ?? "academic-light";
const isScrollReport = outputMode === "scroll-report";
const closingPolicy = manifest.closingPolicy ?? "separate";
const stage = manifest.stage ?? "complete";
const failures = [];
const warnings = [];
const analysisModes = new Set((await getContractSchemaNode("evidence-registry.schema.json", "$defs/analysisMode/enum")));
const outputModes = new Set((await getContractSchemaNode("deck-manifest.schema.json", "$defs/outputMode/enum")));
const visualStyles = new Set(["academic-light", "tech-engineering-dark"]);
const reportRoles = new Set((await getContractSchemaNode("deck-manifest.schema.json", "$defs/reportSection/allOf/1/properties/role/enum")));
const substantiveKinds = new Set(["dataset-task", "preprocessing", "exploratory", "feature-engineering", "model-pipeline", "validation", "baseline", "model-comparison", "model-result", "model-interpretation", "error-analysis", "inference", "application", "boundary", "finding", "synthesis"]);
const datasetSemanticVersion = manifest.datasetSemanticVersion ?? 0;
const scaffoldPlaceholder = manifest.scaffoldPlaceholder === true;
const semanticV2 = profile === "dataset-report" && datasetSemanticVersion >= 2 && !scaffoldPlaceholder;
const semanticV3 = profile === "dataset-report" && datasetSemanticVersion >= 3 && !scaffoldPlaceholder;
const newProject = manifest.newProject === true;
const qualityContract = newProject && Number(manifest.qualityContractVersion ?? 0) >= 1;
const designV2 = newProject && Number(manifest.designSystemVersion ?? 0) >= 2;

const structural = await validateAgainstContractSchema("deck-manifest.schema.json", manifest);
failures.push(...structural.failures.map((message) => `schema: ${message}`));
failures.push(...await validateBranding(path.dirname(manifestPath), manifest));
if (designV2 && manifest.referenceVisualContract) {
  const requiredReferenceFields = ["primaryColors", "supportingColors", "saturationProfile", "containerForms", "lineHierarchy", "shadowIntensity", "gradientPolicy"];
  for (const field of requiredReferenceFields) {
    const value = manifest.referenceVisualContract[field];
    if (Array.isArray(value) ? value.length === 0 : typeof value !== "string" || !value.trim()) failures.push(`referenceVisualContract.${field} is required by design system V2`);
  }
  if (stage === "complete" && manifest.referenceVisualContract.calibrationStatus !== "reviewed") failures.push("referenceVisualContract.calibrationStatus must be 'reviewed' before a referenced V2 project can be complete");
}

const validateSemanticUnit = (unit, at, isBody) => {
  for (const field of ["dataFactIds", "methodIds", "resultIds", "substantiveKinds"]) {
    if (unit[field] !== undefined && (!Array.isArray(unit[field]) || unit[field].some((value) => typeof value !== "string" || !value.trim()))) failures.push(`${at}: ${field} must be an array of non-empty strings`);
  }
  if (!semanticV2 || !isBody) return;
  if (typeof unit.substantiveContribution !== "string" || !unit.substantiveContribution.trim()) failures.push(`${at}: substantiveContribution is required by dataset semantic contract v2`);
  if (!Array.isArray(unit.substantiveKinds) || !unit.substantiveKinds.length || unit.substantiveKinds.some((kind) => !substantiveKinds.has(kind))) failures.push(`${at}: substantiveKinds must contain supported evidence-bearing roles`);
  if (!["keep", "merge", "remove"].includes(unit.contentUtilityStatus)) failures.push(`${at}: contentUtilityStatus must be keep, merge, or remove`);
  if (unit.contentUtilityStatus === "keep" && ![...array(unit.dataFactIds), ...array(unit.methodIds), ...array(unit.resultIds), ...array(unit.findingIds), ...array(unit.claimIds), ...array(unit.visualIds)].length) failures.push(`${at}: kept body unit has no data/method/result/finding/claim/visual contribution`);
  if (semanticV3 && unit.contentUtilityStatus === "keep") {
    if (!array(unit.titleBasisIds).length) failures.push(`${at}: titleBasisIds is required by dataset semantic contract v3`);
    const localBasis = new Set([...array(unit.dataFactIds), ...array(unit.methodIds), ...array(unit.resultIds), ...array(unit.findingIds), ...array(unit.claimIds)]);
    array(unit.titleBasisIds).forEach((id) => { if (!localBasis.has(id)) failures.push(`${at}: titleBasisId '${id}' must be cited by the same unit`); });
    if (typeof unit.audienceTakeaway === "string" && unit.audienceTakeaway.trim() && !array(unit.takeawayBasisIds).length) failures.push(`${at}: audienceTakeaway requires takeawayBasisIds`);
    array(unit.takeawayBasisIds).forEach((id) => { if (!localBasis.has(id)) failures.push(`${at}: takeawayBasisId '${id}' must be cited by the same unit`); });
    const onlyBoundary = array(unit.substantiveKinds).length > 0 && array(unit.substantiveKinds).every((kind) => kind === "boundary");
    if (onlyBoundary && unit.interpretationChangingBoundary !== true) failures.push(`${at}: standalone boundary unit requires interpretationChangingBoundary=true in semantic contract v3`);
  }
};

if (!manifest.title || typeof manifest.title !== "string") failures.push("manifest.title must be a non-empty string");
if (!supportedProfiles.has(profile)) failures.push(`manifest.profile must be one of: ${[...supportedProfiles].join(", ")}`);
if (!outputModes.has(outputMode)) failures.push("manifest.outputMode must be 'slide-deck' or 'scroll-report'");
if (!visualStyles.has(visualStyle)) failures.push("manifest.visualStyle must be 'academic-light' or 'tech-engineering-dark' when present");
if (manifest.outputFormVersion === 1 && manifest.outputMode === undefined) failures.push("new reporting projects must record the user-selected outputMode explicitly");
if (manifest.analysisCompanion?.enabled === true && (!isScrollReport || profile !== "dataset-report" || !newProject)) failures.push("analysisCompanion may be enabled only for a new explicit dataset scroll report");
if (manifest.dataHealth?.enabled === true && (!isScrollReport || profile !== "dataset-report")) failures.push("dataHealth requires an explicit dataset scroll report");
if (isScrollReport && !sections.length) failures.push("scroll-report manifest.sections must contain at least one report section");
if (!isScrollReport && !slides.length) failures.push("slide-deck manifest.slides must contain at least one slide");
if (isScrollReport && slides.length) failures.push("scroll-report must not duplicate content in manifest.slides; use the shared sections source");
if (!["separate", "combined"].includes(closingPolicy)) failures.push("manifest.closingPolicy must be 'separate' or 'combined'");
if (closingPolicy === "combined" && profile !== "conference-talk") failures.push("closingPolicy 'combined' is allowed only for profile 'conference-talk'");
if (!["prototype", "complete"].includes(stage)) failures.push("manifest.stage must be 'prototype' or 'complete'");
if (newProject) {
  const approval = manifest.prototypeApproval;
  if (!approval || !["pending", "approved", "waived"].includes(approval.status)) failures.push("new projects must declare prototypeApproval.status as pending, approved, or waived");
  if (stage === "prototype" && approval?.status !== "pending") failures.push("prototype-stage projects must keep prototypeApproval.status='pending'");
  if (stage === "complete" && !["approved", "waived"].includes(approval?.status)) failures.push("complete new projects require prototypeApproval.status='approved' or an explicit 'waived' record");
  if (stage === "complete" && approval?.status === "approved" && array(approval.reviewedPrototypeIds).length !== 3) failures.push("approved complete projects must record exactly three reviewedPrototypeIds");
  if (stage === "complete" && !array(approval?.reviewEvidence).length) failures.push("complete new projects must record prototypeApproval.reviewEvidence");
  if (approval?.status === "waived" && (typeof approval.decisionNote !== "string" || !approval.decisionNote.trim())) failures.push("waived prototype approval requires a concrete decisionNote");
}
if (profile === "dataset-report" && newProject && datasetSemanticVersion !== 3) failures.push("new dataset-report projects must use datasetSemanticVersion 3; versions 0–2 are legacy compatibility only");
if (manifest.requestedCapabilities?.authoring === "required" && manifest.authoring?.enabled !== true) failures.push("requestedCapabilities.authoring=required requires authoring.enabled=true");
if (manifest.requestedCapabilities?.authoring === "disabled" && manifest.authoring?.enabled === true) failures.push("requestedCapabilities.authoring=disabled conflicts with authoring.enabled=true");
if (qualityContract && !manifest.requestedCapabilities?.authoring) failures.push("new quality-contract projects must declare requestedCapabilities.authoring as required or disabled");
if (profile !== "dataset-report" && manifest.datasetSemanticVersion !== undefined) failures.push("datasetSemanticVersion is allowed only for profile 'dataset-report'");
if (!isScrollReport && manifest.sections !== undefined) failures.push("slide-deck must not declare manifest.sections; use the single slides source");

const ids = new Set();
slides.forEach((slide, index) => {
  const at = `slide ${index + 1}`;
  if (!slide.id || typeof slide.id !== "string") failures.push(`${at}: id is required`);
  else if (ids.has(slide.id)) failures.push(`${at}: duplicate id ${slide.id}`);
  else ids.add(slide.id);

  if (!slide.title || typeof slide.title !== "string") failures.push(`${at}: title is required`);
  else if (slide.title.length > 42) warnings.push(`${at}: title may wrap (${slide.title.length} characters)`);

  if (!slide.section || typeof slide.section !== "string") failures.push(`${at}: section is required`);
  if (!/^L(?:0[1-9]|1\d|2[0-4])$/.test(slide.layout ?? "")) failures.push(`${at}: layout must be L01–L24`);
  if (designV2 && stage === "complete" && !["cover", "closing"].includes(slide.type) && !slide.bodySilhouette) failures.push(`${at}: design system V2 requires bodySilhouette in addition to the L01–L24 relationship ID`);

  const fragments = slide.fragments ?? 0;
  if (!Number.isInteger(fragments) || fragments < 0 || fragments > 5) failures.push(`${at}: fragments must be an integer from 0 to 5`);
  if (slide.claimIds !== undefined && (!Array.isArray(slide.claimIds) || slide.claimIds.some((id) => typeof id !== "string" || !id))) failures.push(`${at}: claimIds must be an array of non-empty strings`);
  if (slide.visualIds !== undefined && (!Array.isArray(slide.visualIds) || slide.visualIds.some((id) => typeof id !== "string" || !id))) failures.push(`${at}: visualIds must be an array of non-empty strings`);
  if (slide.findingIds !== undefined && (!Array.isArray(slide.findingIds) || slide.findingIds.some((id) => typeof id !== "string" || !id))) failures.push(`${at}: findingIds must be an array of non-empty strings`);
  validateSemanticUnit(slide, at, !["cover", "closing"].includes(slide.type));
});

sections.forEach((section, index) => {
  const at = `section ${index + 1}`;
  if (!section.id || typeof section.id !== "string" || !/^[a-z0-9][a-z0-9-]*$/i.test(section.id)) failures.push(`${at}: stable URL-safe id is required`);
  else if (ids.has(section.id)) failures.push(`${at}: duplicate id ${section.id}`);
  else ids.add(section.id);
  if (!section.title || typeof section.title !== "string") failures.push(`${at}: title is required`);
  if (!section.chapter || typeof section.chapter !== "string") failures.push(`${at}: chapter is required`);
  if (!reportRoles.has(section.role)) failures.push(`${at}: role must be one of ${[...reportRoles].join(", ")}`);
  for (const field of ["claimIds", "visualIds", "findingIds"]) {
    if (section[field] !== undefined && (!Array.isArray(section[field]) || section[field].some((id) => typeof id !== "string" || !id))) failures.push(`${at}: ${field} must be an array of non-empty strings`);
  }
  validateSemanticUnit(section, at, !["hero", "closing"].includes(section.role));
});

if (!isScrollReport && manifest.pageTotal !== undefined && manifest.pageTotal !== slides.length) failures.push(`manifest.pageTotal ${manifest.pageTotal} does not match slides.length ${slides.length}`);
if (!isScrollReport && manifest.progress?.total !== undefined && manifest.progress.total !== slides.length) failures.push(`manifest.progress.total ${manifest.progress.total} does not match slides.length ${slides.length}`);
if (!isScrollReport && manifest.chapters !== undefined) {
  if (!Array.isArray(manifest.chapters)) failures.push("manifest.chapters must be an array when present");
  else {
    let previous = -1;
    manifest.chapters.forEach((chapter, index) => {
      const slideIndex = Number.isInteger(chapter?.slide) ? chapter.slide : slides.findIndex((slide) => slide.id === chapter?.slideId);
      if (!chapter || typeof chapter.label !== "string" || !chapter.label.trim()) failures.push(`chapter ${index + 1}: label is required`);
      if (slideIndex < 0 || slideIndex >= slides.length) failures.push(`chapter ${index + 1}: slide/slideId does not resolve`);
      if (slideIndex <= previous) failures.push(`chapter ${index + 1}: chapters must follow slide order without duplicate starts`);
      previous = slideIndex;
    });
  }
}
if (isScrollReport && manifest.navigation !== undefined) {
  if (!Array.isArray(manifest.navigation)) failures.push("scroll-report manifest.navigation must be an array when present");
  else {
    const sectionIds = new Set(sections.map((section) => section.id));
    if (manifest.navigation.length !== sections.length) failures.push("scroll-report navigation must map one-to-one to manifest.sections");
    manifest.navigation.forEach((item, index) => {
      if (!item || typeof item.sectionId !== "string" || !sectionIds.has(item.sectionId)) failures.push(`navigation ${index + 1}: sectionId does not resolve`);
      if (!item || typeof item.label !== "string" || !item.label.trim()) failures.push(`navigation ${index + 1}: label is required`);
    });
    if (new Set(manifest.navigation.map((item) => item?.sectionId)).size !== manifest.navigation.length) failures.push("scroll-report navigation contains duplicate section IDs");
  }
}
if (manifest.runtimeHooks !== undefined) {
  if (!Array.isArray(manifest.runtimeHooks)) failures.push("manifest.runtimeHooks must be an array when present");
  else {
    const hookIds = new Set();
    manifest.runtimeHooks.forEach((hook, index) => {
      if (!hook || typeof hook.id !== "string" || !hook.id.trim() || typeof hook.visualId !== "string" || !hook.visualId.trim() || typeof hook.action !== "string" || !hook.action.trim()) failures.push(`runtimeHook ${index + 1}: id, visualId, and action are required`);
      else if (hookIds.has(hook.id)) failures.push(`runtimeHook ${index + 1}: duplicate id '${hook.id}'`);
      else hookIds.add(hook.id);
    });
  }
}

if (isScrollReport && manifest.reportContent !== undefined) {
  try {
    const contentPath = resolveProjectContractPath(path.dirname(manifestPath), manifest.reportContent, "reportContent");
    const content = JSON.parse(await readFile(contentPath, "utf8"));
    const contentSchema = await validateAgainstContractSchema("report-content.schema.json", content);
    failures.push(...contentSchema.failures.map(message => `report content: ${message}`));
    const declared = new Set(sections.map(section => section.id));
    for (const id of Object.keys(content.sections ?? {})) if (!declared.has(id)) failures.push(`report content refers to unknown section '${id}'`);
    const checkBlocks = (blocks, owner) => {
      const used = new Set();
      for (const block of blocks ?? []) {
        if (used.has(block.id)) failures.push(`${owner}: duplicate report block ID '${block.id}'`);
        used.add(block.id);
        if (block.type === "progress" && block.completed > block.total) failures.push(`${owner}: completed progress exceeds its stated total`);
        if (block.type === "comparison") for (const row of block.rows ?? []) if (row.cells?.length !== block.columns?.length) failures.push(`${owner}: comparison row '${row.id}' has a different number of cells than columns`);
        if (block.type === "tabs") { const ids = new Set(); for (const option of block.options ?? []) { if (ids.has(option.id)) failures.push(`${owner}: duplicate tab ID '${option.id}'`); ids.add(option.id); checkBlocks(option.blocks, `${owner}/${block.id}/${option.id}`); } }
        if (block.type === "details") checkBlocks(block.blocks, `${owner}/${block.id}`);
      }
    };
    for (const [id, copy] of Object.entries(content.sections ?? {})) checkBlocks(copy.blocks, id);
  } catch (error) { failures.push(`report content: ${error.message}`); }
}

const matchesLegacySynthesis = (slide) => /synthesis|conclusion|结论|总结/i.test(`${slide?.id ?? ""} ${slide?.section ?? ""}`);
const matchesLegacyClosing = (slide) => /closing|thanks|致谢|答辩|指正/i.test(`${slide?.id ?? ""} ${slide?.section ?? ""}`);
const isSynthesis = (slide) => slide?.type ? slide.type === "synthesis" : matchesLegacySynthesis(slide);
const isClosing = (slide) => slide?.type ? slide.type === "closing" : matchesLegacyClosing(slide);

if (!isScrollReport && slides.length) {
  if (slides[0].type !== "cover") failures.push("first slide must have explicit type 'cover' for every profile");
  if (slides[0].layout !== "L01") failures.push("first slide must use cover layout L01");
}

if (isScrollReport && sections.length && sections[0]?.role !== "hero") failures.push("first scroll-report section must have role 'hero'");

const synthesisIndex = slides.findIndex(isSynthesis);
const closingIndex = slides.findIndex(isClosing);
const requiresSynthesis = synthesisRequiredProfiles.has(profile);
const usesCombinedConferenceClosing = profile === "conference-talk" && closingPolicy === "combined";
const requiresSeparateClosing = !usesCombinedConferenceClosing;

if (stage === "prototype") {
  if (isScrollReport) {
    if (sections.length !== 3) failures.push("scroll-report stage 'prototype' must contain exactly three representative sections");
    if (profile === "dataset-report") {
      const expectedRoles = ["hero", "analysis-design", "decisive-result"];
      sections.forEach((section, index) => { if (section?.role !== expectedRoles[index]) failures.push(`section ${index + 1}: dataset prototype role must be '${expectedRoles[index]}'`); });
    } else if (sections.slice(1).some(section => ["hero", "closing"].includes(section.role))) failures.push("general report prototype needs a hero and two representative substantive sections");
    warnings.push("scroll-report prototype is for representative-section review only and is not ready for complete-report delivery or formal print");
  } else {
    if (slides.length !== 3) failures.push("stage 'prototype' must contain exactly three representative slides");
    slides.slice(1).forEach((slide, index) => {
      if (slide?.type !== "content") failures.push(`slide ${index + 2}: prototype representative pages after the cover must have explicit type 'content'`);
    });
    warnings.push("prototype manifest is for representative-page review only and is not ready for complete-deck delivery or PDF export");
  }
} else {
  if (isScrollReport) {
    const reportSynthesis = sections.findIndex((section) => section.role === "synthesis");
    const reportClosing = sections.findIndex((section) => section.role === "closing");
    if (profile === "dataset-report" && reportSynthesis < 0) failures.push("complete dataset scroll-report must include a substantive synthesis section");
    if (profile === "dataset-report" && reportClosing < 0) failures.push("complete dataset scroll-report must include a closing section");
    if (reportClosing >= 0 && reportClosing !== sections.length - 1) failures.push("scroll-report closing section must be last");
    if (profile !== "dataset-report" && sections.length < 2) failures.push("complete general report needs substantive content after its hero");
    if (reportSynthesis >= 0 && reportClosing >= 0 && reportSynthesis >= reportClosing) failures.push("scroll-report synthesis must appear before closing");
  } else {
    if (requiresSynthesis && synthesisIndex < 0) failures.push(`profile '${profile}' must include an explicit synthesis slide`);

    if (requiresSeparateClosing) {
      if (closingIndex < 0) failures.push(`profile '${profile}' must include a separate closing slide`);
      else if (!isClosing(slides.at(-1))) failures.push("last slide must be the dedicated closing slide");
    } else {
      if (synthesisIndex < 0) failures.push("a combined conference closing must use a final synthesis slide");
      else if (!isSynthesis(slides.at(-1))) failures.push("closingPolicy 'combined' requires the final slide to be type 'synthesis'");
      if (closingIndex >= 0) warnings.push("conference-talk uses closingPolicy 'combined' but also contains a separate closing slide");
    }

    if (synthesisIndex >= 0 && closingIndex >= 0 && synthesisIndex >= closingIndex) failures.push("synthesis must appear before the separate closing slide");
  }
}

if (!isScrollReport && stage === "complete" && slides.length >= 8) {
  const distinctLayouts = new Set(slides.filter((slide) => !["cover", "closing"].includes(slide.type)).map((slide) => slide.layout));
  if (distinctLayouts.size < 4 && (profile === "thesis-defense" || qualityContract)) {
    failures.push("an 8+ slide complete deck must use at least four distinct content layouts");
  } else if (profile !== "thesis-defense" && distinctLayouts.size < 4) {
    warnings.push(`8+ slide profile '${profile}' uses fewer than four content layouts; verify the repetition is justified`);
  }
}

if (!isScrollReport && designV2 && stage === "complete" && slides.length >= 8 && slides.length <= 12) {
  const body = slides.filter((slide) => !["cover", "closing"].includes(slide.type));
  const silhouettes = body.map((slide) => slide.bodySilhouette).filter(Boolean);
  if (new Set(silhouettes).size < 5) failures.push(`design system V2 requires at least five real body silhouettes in an 8–12 slide deck; found ${new Set(silhouettes).size}`);
  for (let index = 2; index < silhouettes.length; index += 1) if (silhouettes[index] === silhouettes[index - 1] && silhouettes[index] === silhouettes[index - 2]) failures.push(`body silhouettes ${index - 1}–${index + 1} repeat three times; layout IDs cannot substitute for real composition diversity`);
  for (let index = 1; index < body.length; index += 1) if (body[index - 1].usesFixedRightAside === true && body[index].usesFixedRightAside === true && body[index + 1]?.usesFixedRightAside === true) failures.push(`slides ${index}–${index + 2} repeat a fixed right-side explanation rail three times`);
}

for (let index = 2; !isScrollReport && index < slides.length; index += 1) {
  const run = slides.slice(index - 2, index + 1);
  if (run.every((slide) => slide.layout === run[0].layout) && !run.every((slide) => slide.series === true)) {
    if (qualityContract && stage === "complete") failures.push(`slides ${index - 1}–${index + 1}: same layout repeated three times without a series rationale`);
    else warnings.push(`slides ${index - 1}–${index + 1}: same layout repeated three times`);
  }
}

const indexPath = path.join(path.dirname(manifestPath), "index.html");
try {
  await access(indexPath);
  const html = await readFile(indexPath, "utf8");
  const staticCount = isScrollReport
    ? (html.match(/<section\b[^>]*data-report-section/gi) ?? []).length
    : (html.match(/<section\b[^>]*class=["'][^"']*\bslide\b/gi) ?? []).length;
  const expectedCount = isScrollReport ? sections.length : slides.length;
  if (staticCount > 0 && staticCount !== expectedCount) failures.push(`manifest has ${expectedCount} ${isScrollReport ? "sections" : "slides"} but index.html contains ${staticCount}`);
} catch {
  // React projects may not have a static index at the manifest root.
}

let evidenceRegistryReport;
if (manifest.evidenceRegistry !== undefined && !scaffoldPlaceholder) {
  if (typeof manifest.evidenceRegistry !== "string" || !manifest.evidenceRegistry.trim()) {
    failures.push("manifest.evidenceRegistry must be a non-empty project-relative path");
  } else {
    const registryPath = path.resolve(path.dirname(manifestPath), manifest.evidenceRegistry);
    evidenceRegistryReport = await validateEvidenceRegistry(registryPath, { manifest });
    failures.push(...evidenceRegistryReport.failures.map((message) => `evidence registry: ${message}`));
    warnings.push(...evidenceRegistryReport.warnings.map((message) => `evidence registry: ${message}`));
  }
}

if (scaffoldPlaceholder) warnings.push("scaffold placeholder: evidence/finding validation is deferred until verified materials replace the marked waiting fields");

if (profile === "dataset-report" && !scaffoldPlaceholder) {
  const declaredMode = manifest.analysisMode;
  const evidenceModes = evidenceRegistryReport?.analysisSummary?.modes ?? [];
  if (!analysisModes.has(declaredMode) && !evidenceModes.some((mode) => analysisModes.has(mode))) failures.push("dataset-report must declare analysisMode in the manifest or primary AnalysisRecord");

  const primaryQuestion = typeof manifest.primaryQuestion === "string" && manifest.primaryQuestion.trim() ? manifest.primaryQuestion.trim() : evidenceRegistryReport?.analysisSummary?.primaryQuestions?.[0];
  if (!primaryQuestion) failures.push("dataset-report requires a primary analytical question");
  const findingIds = new Set(evidenceRegistryReport?.analysisSummary?.findingIds ?? []);
  const mustShowFindingIds = evidenceRegistryReport?.analysisSummary?.mustShowFindingIds ?? [];
  if (!findingIds.size) failures.push("dataset-report requires substantive AnalysisRecord findings before slide outlining");
  if (!mustShowFindingIds.length) failures.push("dataset-report requires at least one MUST_SHOW finding");

  const layer = manifest.sharedPresentationLayer;
  if (isScrollReport) {
    const requiredStyles = ["presentation-core.css", "evidence-visualization.css", "report-core.css", "report-navigation.css", "report-print.css", ...(visualStyle === "tech-engineering-dark" ? ["visual-styles/tech-engineering-dark.css"] : [])];
    const requiredFeatures = ["left-navigation", "scrollspy", "hash", "browser-history", "reading-progress", "responsive-navigation", "keyboard", "reduced-motion", "deterministic-print"];
    if (!layer || layer.runtime !== "ReportRuntime" || layer.sectionSource !== "sections" || layer.chartAdapter !== "chart-adapters/echarts") failures.push("dataset scroll-report must declare ReportRuntime, one 'sections' source, and the shared chart adapter");
    else {
      requiredStyles.forEach((style) => { if (!array(layer.styles).includes(style)) failures.push(`sharedPresentationLayer.styles is missing '${style}'`); });
      requiredFeatures.forEach((feature) => { if (!array(layer.features).includes(feature)) failures.push(`sharedPresentationLayer.features is missing '${feature}'`); });
      if (layer.presenter !== undefined) failures.push("scroll-report sharedPresentationLayer must not declare PresenterView");
      if (layer.branding !== "shared") failures.push("sharedPresentationLayer.branding must be 'shared'");
    }
  } else {
    const requiredStyles = ["presentation-core.css", "layout-recipes.css", "presenter-view.css", "print-export.css", "evidence-visualization.css", ...(visualStyle === "tech-engineering-dark" ? ["visual-styles/tech-engineering-dark.css"] : [])];
    const requiredFeatures = ["chapters", "presenter", "fullscreen", "keyboard", "progress", "hash", "fragments", "zoom-focus", "deterministic-print", "pdf-export"];
    if (!layer || layer.runtime !== "DeckRuntime" || layer.presenter !== "PresenterView" || layer.slideSource !== "slides" || layer.chartAdapter !== "chart-adapters/echarts") failures.push("dataset slide-deck must declare the unchanged Shared Presentation Layer with DeckRuntime, PresenterView, one 'slides' source, and the shared chart adapter");
    else {
      requiredStyles.forEach((style) => { if (!array(layer.styles).includes(style)) failures.push(`sharedPresentationLayer.styles is missing '${style}'`); });
      requiredFeatures.forEach((feature) => { if (!array(layer.features).includes(feature)) failures.push(`sharedPresentationLayer.features is missing '${feature}'`); });
      if (layer.branding !== "shared") failures.push("sharedPresentationLayer.branding must be 'shared'");
    }
  }

  const units = isScrollReport ? sections : slides;
  const substantive = units.map((unit, index) => ({ unit, index })).filter(({ unit }) => isScrollReport ? !["hero", "closing"].includes(unit.role) : !["cover", "closing"].includes(unit.type));
  if (semanticV2) {
    const firstBody = substantive[0]?.unit;
    if (!firstBody || !array(firstBody.substantiveKinds).includes("dataset-task")) failures.push(`first substantive ${isScrollReport ? "section" : "slide"} must establish dataset/task context`);
    if (!array(firstBody?.dataFactIds).length) failures.push(`first substantive ${isScrollReport ? "section" : "slide"} must cite dataset/task dataFactIds`);
    const forbiddenKinds = new Set(["source-lock", "privacy-review", "model-rejection", "alternative-plan", "internal-qa", "runtime"]);
    substantive.forEach(({ unit, index }) => {
      const at = `${isScrollReport ? "section" : "slide"} ${index + 1}`;
      if (array(unit.substantiveKinds).some((kind) => forbiddenKinds.has(kind))) failures.push(`${at}: internal gate/QA/privacy content cannot be an audience unit`);
      const metaCopy = /不能只讲|为什么(?:本页)?没有|先做.+再(?:谈|决定)|替代方案|MODEL\s+GATE|SOURCE\s+LOCK|PRIVACY\s+REVIEW/i.test(`${unit.title ?? ""} ${unit.navigationLabel ?? ""} ${unit.substantiveContribution ?? ""}`);
      if (metaCopy && ![...array(unit.dataFactIds), ...array(unit.methodIds), ...array(unit.resultIds), ...array(unit.findingIds)].length) failures.push(`${at}: audience copy exposes author-process/gate language without an evidence-bearing contribution`);
    });
    const primary = evidenceRegistryReport?.analysisSummary;
    if (!array(primary?.intentSources).length || !array(primary?.modeRationales).length || !array(primary?.taskContracts).length) failures.push("dataset semantic contract v2 requires analysisIntentSource, analysisModeRationale, and datasetTaskContract in the evidence registry");
    const missingSourceRole = array(primary?.sourceRoles).filter((item) => !item?.sourceRole);
    if (missingSourceRole.length) failures.push(`dataset semantic contract v2 has ${missingSourceRole.length} source(s) without sourceRole`);
    const incompleteFieldCoverage = array(primary?.fieldCoverage).filter((item) => item.fields !== item.usages);
    if (incompleteFieldCoverage.length) failures.push(`dataset semantic contract v2 has incomplete fieldUsage coverage for: ${incompleteFieldCoverage.map((item) => item.datasetId).join(", ")}`);
    if ((declaredMode ?? primary?.modes?.[0]) === "predictive") {
      const present = new Set(substantive.flatMap(({ unit }) => array(unit.substantiveKinds)));
      const required = ["dataset-task", "preprocessing", "feature-engineering", "validation", "baseline", "model-comparison", "model-result", "error-analysis"];
      const taskHasInference = array(primary?.taskContracts).some((contract) => array(contract?.inferenceDatasetIds).length > 0);
      if (taskHasInference) required.push("inference");
      required.forEach((kind) => { if (!present.has(kind)) failures.push(`predictive dataset narrative is missing substantive kind '${kind}'`); });
      if (!array(primary?.predictiveAnalysisIds).length) failures.push("predictive dataset narrative has no validated predictive-model AnalysisRecord");
    }
  }
  const firstHalfLimit = substantive[Math.max(0, Math.ceil(substantive.length / 2) - 1)]?.index ?? 0;
  mustShowFindingIds.forEach((id) => {
    const first = units.findIndex((unit) => array(unit.findingIds).includes(id));
    if (first < 0) failures.push(`MUST_SHOW finding '${id}' is not cited by any ${isScrollReport ? "section" : "slide"}`);
    else if (stage === "complete" && first > firstHalfLimit) failures.push(`MUST_SHOW finding '${id}' first appears after the first half of substantive ${isScrollReport ? "sections" : "slides"}`);
  });

  units.forEach((unit, index) => {
    const synthesis = isScrollReport ? unit.role === "synthesis" : isSynthesis(unit);
    if (!synthesis) return;
    const cited = array(unit.findingIds);
    if (!cited.length && stage === "complete") failures.push(`${isScrollReport ? "section" : "slide"} ${index + 1}: dataset synthesis must cite prior findings`);
    const prior = new Set(units.slice(0, index).flatMap((item) => array(item.findingIds)));
    cited.forEach((id) => { if (!prior.has(id)) failures.push(`${isScrollReport ? "section" : "slide"} ${index + 1}: synthesis finding '${id}' did not appear earlier`); });
  });

  if (stage === "prototype" && units.length === 3) {
    if (!array(units[2]?.findingIds).some((id) => mustShowFindingIds.includes(id))) failures.push(`dataset prototype ${isScrollReport ? "section" : "slide"} 3 must cite a MUST_SHOW finding that answers the primary question`);
    if (!array(units[2]?.visualIds).length) failures.push(`dataset prototype ${isScrollReport ? "section" : "slide"} 3 must declare its decisive visualIds`);
  }
}

const report = {
  manifest: manifestPath,
  profile,
  outputMode,
  closingPolicy,
  stage,
  slideCount: slides.length,
  sectionCount: sections.length,
  evidenceRegistry: evidenceRegistryReport ? { path: evidenceRegistryReport.registry, counts: evidenceRegistryReport.counts, analysisSummary: evidenceRegistryReport.analysisSummary, passed: evidenceRegistryReport.passed } : undefined,
  releaseReady: stage === "complete" && failures.length === 0,
  passed: failures.length === 0,
  failures,
  warnings,
};

console.log(JSON.stringify(report, null, 2));
process.exit(failures.length ? 1 : 0);
