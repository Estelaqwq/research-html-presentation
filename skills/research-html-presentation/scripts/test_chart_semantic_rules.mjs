#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chartSemanticFailures } from "./chart_semantic_rules.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = JSON.parse(await readFile(path.join(root, "fixtures", "chart-semantic-v2", "fixtures.json"), "utf8"));
const results = [...fixtures.failures.map((fixture) => { const actual = chartSemanticFailures(fixture.title, fixture.chartForm); return { id: fixture.id, passed: actual.includes(fixture.expect), actual, expected: fixture.expect }; }), ...fixtures.passes.map((fixture) => { const actual = chartSemanticFailures(fixture.title, fixture.chartForm); return { id: fixture.id, passed: actual.length === 0, actual, expected: [] }; })];
console.log(JSON.stringify({ passed: results.every((item) => item.passed), results }, null, 2));
process.exit(results.every((item) => item.passed) ? 0 : 1);
