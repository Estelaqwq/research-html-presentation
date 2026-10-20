#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] ?? process.cwd());
const manifest = JSON.parse(await readFile(path.join(root, "deck-manifest.json"), "utf8"));
const enabled = manifest.analysisCompanion?.enabled === true;
const llmEnabled = manifest.analysisCompanion?.llm?.enabled === true;
const failures = [];
if (enabled && (manifest.profile !== "dataset-report" || manifest.outputMode !== "scroll-report" || manifest.newProject !== true)) failures.push("enabled companion requires a new explicit dataset scroll report");
if (!enabled) { console.log(JSON.stringify({ enabled: false, passed: true })); process.exit(0); }
const evidence = JSON.parse(await readFile(path.resolve(root, manifest.evidenceRegistry), "utf8"));
const companion = evidence.analysisCompanion;
if (!companion || !Array.isArray(companion.measures) || !Array.isArray(companion.questions)) failures.push("Evidence Registry must contain analysisCompanion measures and questions");
if (llmEnabled) {
  const llm = manifest.analysisCompanion.llm;
  if (manifest.newProject !== true || manifest.profile !== "dataset-report" || manifest.outputMode !== "scroll-report") failures.push("model API requires a new dataset scroll report");
  if (typeof llm.apiPath !== "string" || !/^\/[A-Za-z0-9/_-]+$/.test(llm.apiPath)) failures.push("model API path must be same-origin and relative");
  const policy = companion?.toolPolicy;
  if (!policy) failures.push("model API requires Evidence Registry toolPolicy");
  else {
    const allowed = new Set(["period-total", "annual-average", "single-year", "endpoint-change", "registered-finding", "method"]);
    if (!Array.isArray(policy.allowedOperations) || policy.allowedOperations.some((item) => !allowed.has(item))) failures.push("toolPolicy has unknown operation");
    if (!Array.isArray(policy.measureIds) || policy.measureIds.some((id) => !companion.measures.some((item) => item.id === id))) failures.push("toolPolicy references unknown measure");
    if (!Array.isArray(policy.analysisIds) || policy.analysisIds.some((id) => !evidence.analyses.some((item) => item.analysisId === id))) failures.push("toolPolicy references unknown analysis");
    if (!(Number.isInteger(policy.maxGroups) && policy.maxGroups >= 1 && policy.maxGroups <= 20 && Number.isInteger(policy.maxPeriods) && policy.maxPeriods >= 1 && policy.maxPeriods <= 100)) failures.push("toolPolicy limits are invalid");
    if (!manifest.scaffoldPlaceholder && (!policy.allowedOperations.length || !policy.measureIds.length)) failures.push("model API has no registered operations or measures");
  }
}
const measures = companion?.measures ?? [];
const questions = companion?.questions ?? [];
const datasets = new Map((evidence.datasets ?? []).map((item) => [item.datasetId, item]));
const analyses = new Map((evidence.analyses ?? []).map((item) => [item.analysisId, item]));
const transforms = new Set((evidence.transforms ?? []).map((item) => item.transformId));
const claims = new Set((evidence.claims ?? []).map((item) => item.id));
const visuals = new Set((evidence.visuals ?? []).map((item) => item.visualId));
const citations = await readFile(path.resolve(root, manifest.citationRegistry ?? "citations.json"), "utf8").then((text) => JSON.parse(text)).catch(() => ({ citations: [] }));
const sources = new Set([...datasets.keys(), ...(citations.citations ?? []).map((item) => item.id)]);
const ids = (items, label) => { const seen = new Set(); for (const item of items) { if (seen.has(item.id)) failures.push(`duplicate ${label} id ${item.id}`); seen.add(item.id); } };
ids(measures, "measure"); ids(questions, "question");
const measureIds = new Set(measures.map((item) => item.id));
const sectionById = new Map((manifest.sections ?? []).map((section) => [section.id, section]));
for (const measure of measures) {
  const dataset = datasets.get(measure.datasetId);
  if (!dataset) failures.push(`measure ${measure.id}: unknown dataset`);
  if (!analyses.has(measure.analysisId)) failures.push(`measure ${measure.id}: unknown analysis`);
  if (analyses.get(measure.analysisId)?.datasetId !== measure.datasetId) failures.push(`measure ${measure.id}: analysis/dataset mismatch`);
  for (const id of measure.transformIds ?? []) if (!transforms.has(id)) failures.push(`measure ${measure.id}: unknown transform ${id}`);
  for (const id of measure.claimIds ?? []) if (!claims.has(id)) failures.push(`measure ${measure.id}: unknown claim ${id}`);
  for (const id of measure.sourceIds ?? []) if (!sources.has(id)) failures.push(`measure ${measure.id}: unknown source ${id}`);
  if (measure.visualId && !visuals.has(measure.visualId)) failures.push(`measure ${measure.id}: unknown visual ${measure.visualId}`);
  if (!measure.sourceIds?.length || !measure.claimIds?.length || !measure.method?.trim()) failures.push(`measure ${measure.id}: source, claim, and method are required`);
  if (measure.aggregation === "weighted-rate" && measure.unit === "%" && measure.displayMultiplier !== 100) failures.push(`measure ${measure.id}: percent display requires displayMultiplier=100`);
  if (measure.aggregation === "snapshot" && !measure.periods?.length) failures.push(`measure ${measure.id}: snapshot requires registered years`);
  if (measure.queryTerms && (!Array.isArray(measure.queryTerms) || !measure.queryTerms.length || measure.queryTerms.some((term) => typeof term !== "string" || !term.trim()))) failures.push(`measure ${measure.id}: invalid question terms`);
  for (const [group, aliases] of Object.entries(measure.groupAliases ?? {})) {
    if (!measure.groups?.includes(group) || !Array.isArray(aliases) || aliases.some((alias) => typeof alias !== "string" || !alias.trim())) failures.push(`measure ${measure.id}: invalid group aliases`);
  }
  if (dataset && dataset.privacyReview !== "cleared" && !manifest.scaffoldPlaceholder) failures.push(`measure ${measure.id}: frontend aggregate cells require cleared privacy review`);
  if (!Array.isArray(measure.cells) || !measure.cells.length && !manifest.scaffoldPlaceholder) failures.push(`measure ${measure.id}: no aggregate cells`);
  const cellKeys = new Set();
  for (const cell of measure.cells ?? []) {
    const key = `${cell.group}\u0000${cell.period ?? ""}`;
    if (cellKeys.has(key)) failures.push(`measure ${measure.id}: duplicate aggregate cell ${key}`);
    cellKeys.add(key);
    if (!measure.groups?.includes(cell.group)) failures.push(`measure ${measure.id}: unlisted group ${cell.group}`);
    if (cell.period && !measure.periods?.includes(cell.period)) failures.push(`measure ${measure.id}: unlisted period ${cell.period}`);
    if (measure.aggregation === "weighted-rate" && (!(cell.denominator > 0) || !Number.isFinite(cell.numerator) || Math.abs(cell.value - cell.numerator / cell.denominator * (measure.displayMultiplier ?? 1)) > 1e-8)) failures.push(`measure ${measure.id}: invalid weighted-rate cell`);
    if (!Number.isFinite(cell.value)) failures.push(`measure ${measure.id}: nonfinite cell`);
  }
}
for (const question of questions) {
  if (!measureIds.has(question.measureId)) failures.push(`question ${question.id}: unknown measure`);
  if (!analyses.has(question.findingId) || !analyses.get(question.findingId)?.findingStatement) failures.push(`question ${question.id}: unknown finding`);
  for (const id of question.claimIds ?? []) if (!claims.has(id)) failures.push(`question ${question.id}: unknown claim ${id}`);
  for (const id of question.sourceIds ?? []) if (!sources.has(id)) failures.push(`question ${question.id}: unknown source ${id}`);
  const measure = measures.find((item) => item.id === question.measureId);
  for (const sectionId of question.sectionIds ?? []) {
    const section = sectionById.get(sectionId);
    if (!section || !section.findingIds?.includes(question.findingId)) failures.push(`question ${question.id}: section ${sectionId} does not contain its finding`);
  }
  if (question.defaultSelection) {
    const selected = question.defaultSelection;
    const periods = measure?.periods ?? [];
    if (!measure?.groups?.includes(selected.group) || selected.from && !periods.includes(selected.from) || selected.to && !periods.includes(selected.to) || selected.from && selected.to && periods.indexOf(selected.from) > periods.indexOf(selected.to)) failures.push(`question ${question.id}: invalid default selection`);
    if (question.action === "registered-finding" || question.action === "method") failures.push(`question ${question.id}: default selection is unused by this action`);
  }
  if (question.action === "group-compare" && (measure?.groups?.length ?? 0) < 2) failures.push(`question ${question.id}: group comparison requires two groups`);
  if (question.action === "sensitivity" && (measure?.groups?.length ?? 0) < 2) failures.push(`question ${question.id}: sensitivity requires two approved scenarios`);
  if (question.action === "time-range" && (measure?.periods?.length ?? 0) < 2) failures.push(`question ${question.id}: time range requires two periods`);
  if (measure?.aggregation === "snapshot" && question.action !== "method" && question.action !== "registered-finding" && (!question.defaultSelection?.from || question.defaultSelection.from !== question.defaultSelection.to)) failures.push(`question ${question.id}: snapshot requires a single-year default`);
  if (!question.claimIds?.length || !question.sourceIds?.length) failures.push(`question ${question.id}: claim and source links required`);
}
const report = { enabled, measures: measures.length, questions: questions.length, passed: failures.length === 0, failures };
console.log(JSON.stringify(report, null, 2));
process.exit(failures.length ? 1 : 0);
