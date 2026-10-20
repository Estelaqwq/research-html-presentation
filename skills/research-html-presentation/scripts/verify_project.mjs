#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(process.argv[2] ?? process.cwd());
const flags = new Set(process.argv.slice(3));
const scripts = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(root, "deck-manifest.json");
const exists = async (file) => access(file).then(() => true).catch(() => false);
const step = (label, status, detail, extra = {}) => ({ label, status, detail, ...extra });
const run = (label, script, params = []) => new Promise((resolve) => {
  const child = spawn(process.execPath, [path.join(scripts, script), ...params], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  child.on("error", (error) => resolve(step(label, "unavailable", error.message)));
  child.on("close", (code) => resolve(step(label, code === 0 ? "passed" : "failed", output.trim().slice(-6000), { exitCode: code })));
});

let manifest;
try { manifest = JSON.parse(await readFile(manifestPath, "utf8")); }
catch { console.error(JSON.stringify({ project: root, passed: false, steps: [step("manifest", "failed", `cannot read ${manifestPath}`)] }, null, 2)); process.exit(2); }

const outputMode = manifest.outputMode ?? "slide-deck";
const scroll = outputMode === "scroll-report";
if (!["slide-deck", "scroll-report"].includes(outputMode)) {
  console.error(JSON.stringify({ project: root, passed: false, steps: [step("mode", "failed", `unknown outputMode '${outputMode}'`)] }, null, 2)); process.exit(2);
}
if (scroll && flags.has("--pdf")) {
  console.error(JSON.stringify({
    project: root, outputMode, passed: false,
    steps: [step("report print", "failed", "scroll-report does not support deck PDF. Use deterministic ?print=1 report validation; export_pdf.mjs was not called.")],
  }, null, 2));
  process.exit(2);
}
if (flags.has("--render") && !flags.has("--runtime")) {
  console.error(JSON.stringify({ project: root, outputMode, passed: false, steps: [step("arguments", "failed", "--render requires --runtime so browser behavior is validated before rendering")] }, null, 2));
  process.exit(2);
}
if (flags.has("--pdf") && (!flags.has("--runtime") || !flags.has("--render"))) {
  console.error(JSON.stringify({ project: root, outputMode, passed: false, steps: [step("arguments", "failed", "--pdf requires --runtime --render")] }, null, 2));
  process.exit(2);
}

const steps = [];
steps.push(await run("schema contracts", "validate_schema_contracts.mjs"));
steps.push(await run("manifest", "validate_manifest.mjs", [manifestPath]));
if (manifest.newProject === true && Number(manifest.qualityContractVersion ?? 0) >= 1) {
  steps.push(await run("quality contract", "validate_quality_contract.mjs", [root]));
} else steps.push(step("quality contract", "skipped", "legacy project without qualityContractVersion; compatibility path preserved"));
if (scroll) steps.push(step("report static contract", "passed", "manifest validation enforces the explicit scroll-report/sections boundary; live ReportRuntime is checked with --runtime"));
else steps.push(await run("deck static contract", "validate_deck.mjs", [root, manifestPath]));

const evidencePath = typeof manifest.evidenceRegistry === "string" ? path.resolve(root, manifest.evidenceRegistry) : path.join(root, "evidence-visuals.json");
if (await exists(evidencePath)) {
  if (manifest.scaffoldPlaceholder) steps.push(step("evidence", "skipped", "explicit scaffold placeholder has no research evidence yet"));
   else steps.push(await run("evidence", "validate_evidence_visuals.mjs", [evidencePath, manifestPath]));
   if (!manifest.scaffoldPlaceholder) steps.push(await run("flow specs", "validate_flow_specs.mjs", [root]));
} else steps.push(step("evidence", "skipped", "no Evidence Registry declared"));
if (scroll && manifest.analysisCompanion?.enabled === true) steps.push(await run("analysis companion evidence", "validate_analysis_companion.mjs", [root]));
if (scroll && manifest.dataHealth?.enabled === true) steps.push(await run("data health", "validate_data_health.mjs", [root, ...(flags.has("--runtime") ? ["--runtime"] : [])]));
if (scroll && manifest.analysisFlow?.enabled === true) steps.push(await run("analysis flow", "validate_analysis_flow.mjs", [root, ...(flags.has("--runtime") ? ["--runtime"] : [])]));

const citationDeclared = typeof manifest.citationRegistry === "string" || await exists(path.join(root, "citations.json"));
if (citationDeclared) steps.push(await run("citations", "validate_citations.mjs", [root]));
else steps.push(step("citations", "skipped", "no Citation Registry declared"));

if ((manifest.profile === "dataset-report" && Number(manifest.datasetSemanticVersion ?? 0) >= 3 || manifest.newProject === true && Number(manifest.qualityContractVersion ?? 0) >= 1) && !manifest.scaffoldPlaceholder) {
  steps.push(await run("audience copy", "validate_audience_copy.mjs", [root, manifestPath]));
} else steps.push(step("audience copy", "skipped", "applies to non-placeholder dataset v3 or quality-contract projects"));

const authoring = Boolean(manifest.authoring?.enabled);
const patchExists = await exists(path.join(root, "presentation-edit-patch.json"));
if (authoring && patchExists) {
  steps.push(await run("edit patch", "validate_edit_patch.mjs", [root, ...(flags.has("--pdf") ? ["--release"] : [])]));
} else if (authoring) steps.push(step("edit patch", "skipped", "authoring enabled but no saved Patch exists"));
else steps.push(step("edit patch", "skipped", "authoring is disabled"));

if (flags.has("--runtime")) {
  if (authoring) steps.push(await run("editor runtime", "validate_editor_runtime.mjs", [root]));
  else steps.push(step("editor runtime", "skipped", "authoring is disabled"));
  steps.push(await run(scroll ? "report runtime" : "deck runtime", scroll ? "validate_report_runtime_contract.mjs" : "validate_runtime_contract.mjs", [root, manifestPath]));
  if (scroll && manifest.analysisCompanion?.llm?.enabled === true && !manifest.scaffoldPlaceholder) steps.push(await run("research companion model API", "validate_research_companion_api.mjs", [root]));
  // audit_layout detects the runtime from the page.  Do not pass a synthetic
  // positional flag that could be interpreted as its output file path.
  steps.push(await run(scroll ? "report layout" : "deck layout", "audit_layout.mjs", [root]));
} else {
  const completeQuality = manifest.newProject === true && Number(manifest.qualityContractVersion ?? 0) >= 1 && manifest.stage === "complete";
  steps.push(completeQuality && authoring && manifest.requestedCapabilities?.authoring === "required"
    ? step("editor runtime", "failed", "complete-stage requestedCapabilities.authoring=required; run with --runtime")
    : step("editor runtime", "skipped", "requires --runtime and authoring"));
  steps.push(completeQuality ? step(scroll ? "report runtime" : "deck runtime", "failed", "complete-stage quality contract requires browser runtime validation; run with --runtime") : step(scroll ? "report runtime" : "deck runtime", "skipped", "requires --runtime"));
  steps.push(completeQuality ? step(scroll ? "report layout" : "deck layout", "failed", "complete-stage quality contract requires browser layout audit; run with --runtime") : step(scroll ? "report layout" : "deck layout", "skipped", "requires --runtime"));
}

if (flags.has("--render")) {
  steps.push(await run(scroll ? "report render" : "deck render", scroll ? "render_report.mjs" : "render_deck.mjs", [root]));
  if (scroll) steps.push(await run("report deterministic print", "validate_report_runtime_contract.mjs", [root, manifestPath, "--print-only"]));
} else {
  steps.push(step(scroll ? "report render" : "deck render", "skipped", "requires --runtime --render"));
  if (scroll) steps.push(step("report deterministic print", "skipped", "requires --runtime --render"));
}
if (flags.has("--pdf")) steps.push(await run("deck PDF", "export_pdf.mjs", [root]));
else if (!scroll) steps.push(step("deck PDF", "skipped", "optional: requires --runtime --render --pdf"));

const passed = steps.every((item) => item.status === "passed" || item.status === "skipped");
console.log(JSON.stringify({ project: root, profile: manifest.profile ?? "thesis-defense", outputMode, datasetSemanticVersion: manifest.datasetSemanticVersion ?? 0, passed, steps }, null, 2));
process.exit(passed ? 0 : 1);
