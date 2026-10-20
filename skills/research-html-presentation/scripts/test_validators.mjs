#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scripts = path.join(skill, "scripts");
const fixture = (...parts) => path.join(skill, "fixtures", ...parts);
const tests = [
  ["valid minimal deck manifest", "validate_manifest.mjs", [fixture("valid-minimal-deck", "deck-manifest.json")], 0],
  ["valid minimal deck citations", "validate_citations.mjs", [fixture("valid-minimal-deck")], 0],
  ["valid dataset v3 manifest", "validate_manifest.mjs", [fixture("valid-dataset-v3", "deck-manifest.json")], 0],
  ["valid dataset v3 citations", "validate_citations.mjs", [fixture("valid-dataset-v3")], 0],
  ["missing cover", "validate_manifest.mjs", [fixture("invalid-missing-cover", "deck-manifest.json")], 1, "first slide must have explicit type 'cover'"],
  ["new-project version drift", "validate_manifest.mjs", [fixture("invalid-version-drift", "deck-manifest.json")], 1, "new dataset-report projects must use datasetSemanticVersion 3"],
  ["complete project cannot bypass prototype", "validate_manifest.mjs", [fixture("invalid-prototype-bypass", "deck-manifest.json")], 1, "complete new projects require prototypeApproval.status='approved'"],
  ["orphan citation", "validate_citations.mjs", [fixture("invalid-orphan-citation")], 1, "does not resolve"],
  ["evidence value drift", "validate_evidence_visuals.mjs", [fixture("invalid-evidence-value-drift", "evidence-visuals.json")], 1, "chart displayValues do not match authoritativeValues"],
  ["editor conflict", "validate_edit_patch.mjs", [fixture("invalid-editor-conflict")], 1, "requires Codex resolution"],
  ["missing print state", "validate_evidence_visuals.mjs", [fixture("invalid-print-state", "evidence-visuals.json")], 1, "Type A requires defaultState and printState"],
  ["valid FlowSpec", "validate_flow_specs.mjs", [fixture("flow-spec-valid")], 0, "checked"],
  ["invalid FlowSpec topology", "validate_flow_specs.mjs", [fixture("flow-spec-invalid")], 1, "unknown node"]
];
const schema = (...parts) => path.join(skill, "schemas", ...parts);
tests.push(
  ["valid visual-review contract", "validate_schema_contracts.mjs", [schema("visual-review.schema.json"), fixture("visual-review-contract", "valid.json")], 0, "\"passed\": true"],
  ["invalid visual-review contract", "validate_schema_contracts.mjs", [schema("visual-review.schema.json"), fixture("visual-review-contract", "invalid.json")], 1, "must match exactly one oneOf branch"]
);
const run = (name, script, args, expected, token) => new Promise((resolve) => {
  const child = spawn(process.execPath, [path.join(scripts, script), ...args], { stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  child.on("close", (code) => resolve({ name, passed: code === expected && (!token || output.includes(token)), code, expected, token, output: output.trim().slice(-1600) }));
});
const qualityTest = new Promise((resolve) => {
  const child = spawn(process.execPath, [path.join(scripts, "test_quality_contract.mjs")], { stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  child.on("close", (code) => resolve({ name: "quality-contract regression fixtures", passed: code === 0, code, expected: 0, output: output.trim().slice(-1600) }));
});
const visualGoldenTest = new Promise((resolve) => {
  const child = spawn(process.execPath, [path.join(scripts, "test_golden_visual_contracts.mjs")], { stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  child.on("close", (code) => resolve({ name: "visual-contract Golden fixtures", passed: code === 0, code, expected: 0, output: output.trim().slice(-1600) }));
});
const copyRulesTest = new Promise((resolve) => {
  const child = spawn(process.execPath, [path.join(scripts, "test_audience_copy_rules.mjs")], { stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  child.on("close", (code) => resolve({ name: "audience-copy V2 fixtures", passed: code === 0, code, expected: 0, output: output.trim().slice(-1600) }));
});
const visualQualityTest = new Promise((resolve) => {
  const child = spawn(process.execPath, [path.join(scripts, "test_visual_quality_rules.mjs")], { stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  child.on("close", (code) => resolve({ name: "visual-quality V2 fixtures", passed: code === 0, code, expected: 0, output: output.trim().slice(-1600) }));
});
const chartSemanticTest = new Promise((resolve) => {
  const child = spawn(process.execPath, [path.join(scripts, "test_chart_semantic_rules.mjs")], { stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  child.on("close", (code) => resolve({ name: "chart-semantic V2 fixtures", passed: code === 0, code, expected: 0, output: output.trim().slice(-1600) }));
});
const reviewFingerprintTest = new Promise((resolve) => {
  const child = spawn(process.execPath, [path.join(scripts, "test_review_fingerprint.mjs")], { stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  child.on("close", (code) => resolve({ name: "visual-review fingerprint invalidation", passed: code === 0, code, expected: 0, output: output.trim().slice(-1600) }));
});
const results = [...await Promise.all(tests.map(([...test]) => run(...test))), await qualityTest, await visualGoldenTest, await copyRulesTest, await visualQualityTest, await chartSemanticTest, await reviewFingerprintTest];
const failures = results.filter((result) => !result.passed);
console.log(JSON.stringify({ passed: failures.length === 0, results }, null, 2));
process.exit(failures.length ? 1 : 0);
