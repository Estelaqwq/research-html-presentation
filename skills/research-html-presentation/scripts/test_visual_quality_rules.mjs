#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { referenceCalibrationFailures, silhouetteStructureFailures, visualMetricFailures } from "./visual_quality_rules.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = JSON.parse(await readFile(path.join(root, "fixtures", "visual-quality-v2", "fixtures.json"), "utf8"));
const results = [
  ...fixtures.failures.map((fixture) => { const actual = visualMetricFailures(fixture.metrics, fixture.options); return { id: fixture.id, passed: actual.includes(fixture.expect), actual, expected: fixture.expect }; }),
  ...fixtures.passes.map((fixture) => { const actual = visualMetricFailures(fixture.metrics, fixture.options); return { id: fixture.id, passed: actual.length === 0, actual, expected: [] }; }),
  ...fixtures.silhouetteFailures.map((fixture) => { const actual = silhouetteStructureFailures(fixture.declared, fixture.roles); return { id: fixture.id, passed: actual.includes(fixture.expect), actual, expected: fixture.expect }; }),
  ...fixtures.silhouettePasses.map((fixture) => { const actual = silhouetteStructureFailures(fixture.declared, fixture.roles); return { id: fixture.id, passed: actual.length === 0, actual, expected: [] }; }),
  ...fixtures.calibrationFailures.map((fixture) => { const actual = referenceCalibrationFailures(fixture.contract, fixture.calibration, { stage: "complete" }); return { id: fixture.id, passed: actual.includes(fixture.expect), actual, expected: fixture.expect }; }),
  ...fixtures.calibrationPasses.map((fixture) => { const actual = referenceCalibrationFailures(fixture.contract, fixture.calibration, { stage: "complete" }); return { id: fixture.id, passed: actual.length === 0, actual, expected: [] }; }),
];
console.log(JSON.stringify({ passed: results.every((item) => item.passed), results }, null, 2));
process.exit(results.every((item) => item.passed) ? 0 : 1);
