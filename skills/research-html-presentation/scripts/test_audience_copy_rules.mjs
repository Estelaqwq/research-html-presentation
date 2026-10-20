#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { highLevelCopyFailures, repeatsHighLevelJudgment } from "./audience_copy_rules.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = JSON.parse(await readFile(path.join(root, "fixtures", "audience-copy-v2", "fixtures.json"), "utf8"));
const results = [];
for (const fixture of fixtures.failures) {
  const actual = highLevelCopyFailures(fixture.copy);
  results.push({ id: fixture.id, passed: actual.includes(fixture.expect), actual, expected: fixture.expect });
}
for (const fixture of fixtures.passes) {
  const actual = highLevelCopyFailures(fixture.copy);
  results.push({ id: fixture.id, passed: actual.length === 0, actual, expected: [] });
}
results.push({ id: "high-level-repetition", passed: repeatsHighLevelJudgment(fixtures.repetition.parts) === fixtures.repetition.expect });
const failures = results.filter((item) => !item.passed);
console.log(JSON.stringify({ passed: failures.length === 0, results }, null, 2));
process.exit(failures.length ? 1 : 0);
