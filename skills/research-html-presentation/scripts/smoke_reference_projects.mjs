#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pnpm = process.env.PNPM_BIN || "pnpm";
const pnpmCli = process.env.PNPM_CLI;
const childEnv = {
  ...process.env,
  PATH: [path.dirname(process.execPath), process.env.PATH].filter(Boolean).join(path.delimiter),
};
const runPnpm = (args, options) => pnpmCli
  ? spawnSync(process.execPath, [pnpmCli, ...args], options)
  : spawnSync(pnpm, args, { ...options, shell: process.platform === "win32" });
const projects = [
  "golden-research-deck",
  "golden-dataset-deck",
  "golden-scroll-report",
  "golden-editable-research-deck",
  "golden-editable-research-deck/report-authoring",
  "golden-tech-engineering-dark",
  "golden-tech-engineering-dark-report",
];
const results = [];
for (const name of projects) {
  const root = path.join(skillRoot, "examples", name);
  const readme = path.join(root, "README.md");
  try {
    await access(root); await access(path.join(root, "package.json"));
    if (name !== "golden-editable-research-deck/report-authoring") {
      const text = await readFile(readme, "utf8");
      if (!/synthetic/i.test(text)) throw new Error("README must explicitly mark synthetic content");
    }
    const install = runPnpm(["install"], { cwd: root, encoding: "utf8", env: childEnv, shell: false });
    if (install.status !== 0) throw new Error(`install failed: ${install.error?.message || String(install.stderr || install.stdout || "no process output").slice(-1200)}`);
    const build = runPnpm(["run", "build"], { cwd: root, encoding: "utf8", env: childEnv, shell: false });
    if (build.status !== 0) throw new Error(`build failed: ${build.error?.message || String(build.stderr || build.stdout || "no process output").slice(-1200)}`);
    const verify = spawnSync(process.execPath, [path.join(skillRoot, "scripts", "verify_project.mjs"), root, "--runtime"], { cwd: root, encoding: "utf8", env: childEnv });
    if (verify.status !== 0) throw new Error(`runtime verification failed: ${verify.error?.message || String(verify.stderr || verify.stdout || "no process output").slice(-1600)}`);
    results.push({ project: name, status: "passed", checks: ["install", "build", "schema", "validators", "runtime", "layout"] });
  } catch (error) {
    results.push({ project: name, status: "failed", detail: error instanceof Error ? error.message : String(error) });
  }
}
const passed = results.every((result) => result.status === "passed");
console.log(JSON.stringify({ passed, results, note: "Rendering/print/PDF are run by mode-specific verification with --runtime --render (and --pdf only for slide-deck)." }, null, 2));
process.exit(passed ? 0 : 1);
