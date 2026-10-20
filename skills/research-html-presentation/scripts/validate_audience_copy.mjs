#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { withDeckPage } from "./browser_helpers.mjs";
import { highLevelCopyFailures, normalizeAudienceCopy as normalize, repeatsHighLevelJudgment as repeatedJudgment } from "./audience_copy_rules.mjs";

const array = (value) => Array.isArray(value) ? value : [];
const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0;
const finalClaims = /最终模型|最佳模型|已经优化|当前最优方案|globally best|final model|best model|fully optimized/i;
const resultKinds = new Set(["exploratory", "validation", "model-comparison", "model-result", "model-interpretation", "error-analysis", "inference", "finding", "synthesis"]);
const resultSignal = /\d|%|百分点|倍|最高|最低|最大|最小|领先|高于|低于|达到|稳定在|增加|下降|正向|负向|排名|生成|差异|range|highest|lowest|higher|lower|increase|decrease|outperform/i;

const target = process.argv[2] ?? process.cwd();
const manifestPath = path.resolve(process.argv[3] ?? path.join(path.resolve(target), "deck-manifest.json"));
let manifest;
try { manifest = JSON.parse(await readFile(manifestPath, "utf8")); }
catch { console.error(`[audience-copy-validator] cannot read manifest JSON: ${manifestPath}`); process.exit(2); }

const version = Number(manifest.datasetSemanticVersion ?? 0);
const genericReview = manifest.newProject === true && Number(manifest.qualityContractVersion ?? 0) >= 1 && manifest.scaffoldPlaceholder !== true;
const datasetReview = manifest.profile === "dataset-report" && version >= 3;
if (!genericReview && !datasetReview) {
  console.log(JSON.stringify({ passed: true, skipped: true, reason: "Audience comprehension applies to datasetSemanticVersion >= 3 or non-placeholder quality-contract projects", failures: [], warnings: [] }, null, 2));
  process.exit(0);
}

const failures = [];
const warnings = [];
const mode = manifest.outputMode ?? "slide-deck";
const units = mode === "scroll-report" ? array(manifest.sections) : array(manifest.slides);
const bodyUnits = units.filter((unit) => mode === "scroll-report" ? !["hero", "closing"].includes(unit.role) : !["cover", "closing"].includes(unit.type));
let registry = { claims: [], datasets: [], transforms: [], analyses: [], narrativeUnits: [], visuals: [] };
if (nonEmpty(manifest.evidenceRegistry)) {
  try { registry = JSON.parse(await readFile(path.resolve(path.dirname(manifestPath), manifest.evidenceRegistry), "utf8")); }
  catch { if (datasetReview) failures.push("evidenceRegistry is required and must be readable for audience-copy validation"); }
} else if (datasetReview) failures.push("evidenceRegistry is required for audience-copy validation");

const registryIds = new Set([
  ...array(registry.claims).map((item) => item.id),
  ...array(registry.datasets).map((item) => item.datasetId),
  ...array(registry.transforms).map((item) => item.transformId),
  ...array(registry.analyses).map((item) => item.analysisId),
  ...array(registry.visuals).map((item) => item.visualId),
].filter(nonEmpty));

const checkCopy = (copy, at, exception) => {
  if (!nonEmpty(copy)) return;
  const labels = { "internal-term": "audience copy exposes an internal analysis/QA term", "defensive-shell": "audience copy uses an abstract or defensive sentence shell", "vague-standalone": "vague phrase cannot carry a page conclusion without an object, action, evidence, or boundary", "placeholder-copy": "placeholder or missing-field wording is not audience copy" };
  highLevelCopyFailures(copy, exception).forEach((kind) => failures.push(`${at}: ${labels[kind]}`));
};

bodyUnits.forEach((unit, index) => {
  const at = `${mode === "scroll-report" ? "section" : "slide"} '${unit.id ?? index + 1}'`;
  const cited = new Set([...array(unit.dataFactIds), ...array(unit.methodIds), ...array(unit.resultIds), ...array(unit.findingIds), ...array(unit.claimIds)]);
  if (datasetReview) {
    if (!array(unit.titleBasisIds).length) failures.push(`${at}: titleBasisIds is required`);
    array(unit.titleBasisIds).forEach((id) => {
      if (!cited.has(id)) failures.push(`${at}: titleBasisId '${id}' is not cited by the unit`);
      if (!registryIds.has(id)) failures.push(`${at}: titleBasisId '${id}' does not resolve in the evidence registry`);
    });
    if (nonEmpty(unit.audienceTakeaway)) {
      if (!array(unit.takeawayBasisIds).length) failures.push(`${at}: audienceTakeaway requires takeawayBasisIds`);
      array(unit.takeawayBasisIds).forEach((id) => {
        if (!cited.has(id) || !registryIds.has(id)) failures.push(`${at}: takeawayBasisId '${id}' does not resolve through the unit and registry`);
      });
    }
  }
  checkCopy(unit.title, `${at} title`, unit.copyExceptionRationale);
  checkCopy(unit.navigationLabel, `${at} navigationLabel`, unit.copyExceptionRationale);
  checkCopy(unit.audienceTakeaway, `${at} takeaway`, unit.copyExceptionRationale);
  const resultBearing = array(unit.substantiveKinds).some((kind) => resultKinds.has(kind)) || array(unit.resultIds).length > 0;
  if (resultBearing && datasetReview && !array(unit.titleBasisIds).some((id) => array(unit.resultIds).includes(id) || array(unit.findingIds).includes(id) || array(unit.claimIds).includes(id))) failures.push(`${at}: result-bearing title must cite a result, finding, or claim basis`);
  if (resultBearing && !resultSignal.test(unit.title ?? "")) warnings.push(`${at}: result-bearing title has no visible value, direction, rank, or comparison signal; review comprehension manually`);
  const onlyBoundary = array(unit.substantiveKinds).length > 0 && array(unit.substantiveKinds).every((kind) => kind === "boundary");
  if (onlyBoundary && (unit.interpretationChangingBoundary !== true || !array(unit.resultIds).length)) failures.push(`${at}: standalone limitation requires interpretationChangingBoundary=true and resultIds`);
});

const navigation = mode === "scroll-report" ? array(manifest.navigation) : array(manifest.chapters);
navigation.forEach((item, index) => {
  const label = item?.label;
  checkCopy(label, `${mode === "scroll-report" ? "navigation" : "chapter"} ${index + 1} label`, item?.copyExceptionRationale);
  const unit = mode === "scroll-report" ? units.find((candidate) => candidate.id === item?.sectionId) : units[Number.isInteger(item?.slide) ? item.slide : units.findIndex((candidate) => candidate.id === item?.slideId)];
  const contentLabel = mode === "scroll-report" ? unit?.chapter : unit?.section;
  if (unit && nonEmpty(contentLabel) && normalize(label) !== normalize(contentLabel) && !normalize(contentLabel).includes(normalize(label)) && !normalize(label).includes(normalize(contentLabel))) warnings.push(`${mode === "scroll-report" ? "navigation" : "chapter"} ${index + 1}: label '${label}' does not closely match mapped content category '${contentLabel}'`);
});

const searches = array(registry.analyses).filter((analysis) => analysis.modelSearch).map((analysis) => analysis.modelSearch);
const limited = searches.some((search) => ["limited", "preliminary"].includes(search.adequacyStatus));
if (limited) {
  const structuralClaimFailure = searches.some((search) => ["limited", "preliminary"].includes(search.adequacyStatus) && !["preliminary", "current-best"].includes(search.audienceClaimLevel));
  if (structuralClaimFailure) failures.push("limited/preliminary model search has a structurally incompatible audienceClaimLevel");
  units.forEach((unit, index) => {
    const copy = `${unit.title ?? ""} ${unit.audienceTakeaway ?? ""} ${unit.substantiveContribution ?? ""}`;
    if (finalClaims.test(copy)) failures.push(`${mode === "scroll-report" ? "section" : "slide"} ${index + 1}: limited/preliminary search is described as final/best/optimized`);
  });
}

try {
  const rendered = await withDeckPage(target, async ({ page, baseUrl }) => {
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    if (mode === "scroll-report") return page.evaluate(() => [...document.querySelectorAll("[data-report-section]")].map((unit) => ({
      id: unit.id || "?",
      title: unit.querySelector("[data-report-section-heading], .report-section-title, .report-hero h1")?.textContent?.trim() ?? "",
      leads: [...unit.querySelectorAll(".report-section-lead, .report-lead, [data-audience-lead]")].map((node) => node.textContent?.trim()).filter(Boolean),
      moduleTitles: [...unit.querySelectorAll("h3, h4, [data-content-role='module-title']")].map((node) => node.textContent?.trim()).filter(Boolean),
      takeaways: [...unit.querySelectorAll(".takeaway, [data-audience-takeaway]")].map((node) => node.textContent?.trim()).filter(Boolean),
    })));
    const renderedSlides = [];
    for (let index = 0; index < units.length; index += 1) {
      const url = new URL(baseUrl); url.hash = `/${index + 1}`;
      await page.goto(url.toString(), { waitUntil: "networkidle" });
      await page.waitForFunction((expected) => document.querySelector(".slide.is-active")?.getAttribute("data-slide-id") === expected, units[index]?.id, { timeout: 10000 });
      await page.waitForTimeout(80);
      renderedSlides.push(await page.evaluate(() => {
        const unit = document.querySelector(".slide.is-active");
        if (!unit) return { id: "?", title: "", leads: [], moduleTitles: [], takeaways: [] };
        return {
          id: unit.getAttribute("data-slide-id") || "?",
          title: unit.querySelector(".slide-title, .slide-header h1, .slide-header h2, h1[data-title-audit]")?.textContent?.trim() ?? "",
          leads: [...unit.querySelectorAll(".slide-lead, [data-audience-lead]")].map((node) => node.textContent?.trim()).filter(Boolean),
          moduleTitles: [...unit.querySelectorAll("h3, h4, [data-content-role='module-title']")].map((node) => node.textContent?.trim()).filter(Boolean),
          takeaways: [...unit.querySelectorAll(".takeaway, [data-audience-takeaway]")].map((node) => node.textContent?.trim()).filter(Boolean),
        };
      }));
    }
    return renderedSlides;
  });
  const manifestById = new Map(units.map((unit) => [unit.id, unit]));
  rendered.forEach((item, index) => {
    const unit = manifestById.get(item.id) ?? units[index];
    if (!unit) return;
    const at = `rendered ${mode === "scroll-report" ? "section" : "slide"} '${item.id}'`;
    if (nonEmpty(unit.title) && normalize(item.title) !== normalize(unit.title)) failures.push(`${at}: rendered title does not match manifest title`);
    checkCopy(item.title, `${at} title`, unit.copyExceptionRationale);
    item.leads.forEach((copy, leadIndex) => checkCopy(copy, `${at} lead ${leadIndex + 1}`, unit.copyExceptionRationale));
    item.moduleTitles.forEach((copy, moduleIndex) => checkCopy(copy, `${at} module title ${moduleIndex + 1}`, unit.copyExceptionRationale));
    item.takeaways.forEach((copy, takeawayIndex) => checkCopy(copy, `${at} takeaway ${takeawayIndex + 1}`, unit.copyExceptionRationale));
    if (repeatedJudgment([item.title, ...item.leads, ...item.takeaways])) failures.push(`${at}: title, lead, and takeaway mechanically repeat the same judgment`);
    const highLevelCopy = [item.title, ...item.leads, ...item.takeaways].join(" ");
    const numericTokens = highLevelCopy.match(/\d+(?:\.\d+)?%?/g) ?? [];
    const repeatedNumbers = [...new Set(numericTokens.filter((token) => numericTokens.filter((candidate) => candidate === token).length >= 4))];
    if (repeatedNumbers.length) failures.push(`${at}: key number(s) ${repeatedNumbers.join(", ")} repeat mechanically across high-level copy`);
    if (limited && finalClaims.test([item.title, ...item.leads, ...item.takeaways].join(" "))) failures.push(`${at}: rendered copy promotes a limited search as final/best/optimized`);
  });
} catch (error) {
  failures.push(`browser audience-copy inspection failed: ${error instanceof Error ? error.message : String(error)}`);
}

const report = { passed: failures.length === 0, mode, datasetSemanticVersion: version, checkedUnits: bodyUnits.length, failures, warnings };
console.log(JSON.stringify(report, null, 2));
process.exit(report.passed ? 0 : 1);
