#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { densityFindings, interactionFindings, narrativeMappingFindings, processBoardFindings, titleFindings } from "./quality_contract_utils.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixturePath = path.join(root, "fixtures", "quality-contract", "fixtures.json");
const fixtures = JSON.parse(await readFile(fixturePath, "utf8"));
const results = [];
const classify = (fixture) => {
  const stage = fixture.stage ?? "complete";
  const severity = stage === "complete" ? "error" : "warning";
  const findings = [];
  if (fixture.density) findings.push(...densityFindings({ ...fixture.density, stage }));
  if (fixture.processBoard) findings.push(...processBoardFindings({ ...fixture.processBoard, stage }));
  if (fixture.title) findings.push(...titleFindings({ ...fixture.title, stage }));
  if (fixture.interaction) findings.push(...interactionFindings({ ...fixture.interaction, stage }));
  if (fixture.narrative) findings.push(...narrativeMappingFindings({ ...fixture.narrative, stage }));
  if (fixture.static?.manualPageNumber) findings.push({ type: "hard-coded-page-number", severity });
  if (fixture.authoring?.required && !fixture.authoring.enabled) findings.push({ type: "authoring-required-but-disabled", severity });
  if (fixture.authoring?.required && fixture.authoring.enabled && fixture.authoring.runtime === false) findings.push({ type: "authoring-runtime-missing", severity });
  return { types: [...new Set(findings.map((finding) => finding.type))], findings };
};
for (const fixture of [...fixtures.failures, ...fixtures.passes]) {
  const { types: actual, findings } = classify(fixture);
  const expected = fixture.expect ?? [];
  const expectedSeverity = fixture.expectSeverity;
  const passed = (fixture.expect ? expected.every((type) => actual.includes(type)) : actual.length === 0)
    && (!expectedSeverity || expected.every((type) => findings.some((finding) => finding.type === type && finding.severity === expectedSeverity)));
  results.push({ id: fixture.id, passed, actual, expected, expectedSeverity });
}
const failed = results.filter((result) => !result.passed);
console.log(JSON.stringify({ passed: failed.length === 0, fixtureCount: results.length, results }, null, 2));
process.exit(failed.length ? 1 : 0);
