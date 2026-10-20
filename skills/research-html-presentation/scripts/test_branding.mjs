#!/usr/bin/env node
// Static regression by default. Optional real-browser matrix:
// RESEARCH_TEST_NODE_MODULES=<existing compatible node_modules> node test_branding.mjs --runtime
import { access, copyFile, mkdir, mkdtemp, readFile, rename, symlink, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { validateBranding } from "./branding_contract.mjs";
import { withDeckPage } from "./browser_helpers.mjs";

const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scripts = path.join(skill, "scripts");
const componentsOnly = process.argv.includes("--components-only");
const runtime = process.argv.includes("--runtime") || componentsOnly;
const outputIndex = process.argv.indexOf("--output-dir");
const output = outputIndex >= 0 ? path.resolve(process.argv[outputIndex + 1]) : await mkdtemp(path.join(os.tmpdir(), "research-branding-"));
await mkdir(output, { recursive: true });
const checks = [];
function check(name, condition, detail = "") {
  checks.push({ name, passed: Boolean(condition), ...(detail ? { detail } : {}) });
  if (!condition) console.error(`FAIL ${name}: ${detail}`);
}
function command(script, args, cwd, expected = 0) {
  const child = spawnSync(process.execPath, [script, ...args], { cwd, encoding: "utf8", env: process.env });
  const text = `${child.stdout ?? ""}${child.stderr ?? ""}`;
  check(`${path.basename(script)} ${path.basename(cwd ?? output)}`, child.status === expected, child.status === expected ? "" : text.slice(-3000));
  return child;
}
const exists = file => access(file).then(() => true, () => false);
const load = async file => JSON.parse(await readFile(file, "utf8"));
const cases = [];
const assetDigest = createHash("sha256").update(await readFile(path.join(skill, "assets/branding/zuel-logo.png"))).digest("hex");
for (const mode of ["research-deck", "dataset-deck", "general-scroll-report", "dataset-scroll-report"]) {
  for (const style of ["academic-light", "tech-engineering-dark"]) {
    for (const profile of ["none", "zuel"]) {
      const name = `${mode}-${style}-${profile}`;
      const project = path.join(output, name);
      const args = ["--mode", mode, "--visual-style", style, "--output", project];
      // Omit the option in the default case: this tests actual CLI defaults.
      if (profile === "zuel") args.push("--branding", "zuel");
      const created = command(path.join(scripts, "scaffold_project.mjs"), args, output);
      if (created.status !== 0) continue;
      const manifest = await load(path.join(project, "deck-manifest.json"));
      check(`${name}: persisted selection`, manifest.branding.profile === profile);
      check(`${name}: style and authoring preserved`, manifest.visualStyle === style && manifest.authoring.enabled === true);
      check(`${name}: neutral title and metadata`, !/ZUEL|中南财经/.test(manifest.title + await readFile(path.join(project, "index.html"), "utf8")));
      check(`${name}: selected asset only`, await exists(path.join(project, "public/zuel-logo.png")) === (profile === "zuel"));
      check(`${name}: project-local brand contract`, (await validateBranding(project, manifest)).length === 0);
      if (profile === "zuel") check(`${name}: authentic bundled pixels`, createHash("sha256").update(await readFile(path.join(project, "public/zuel-logo.png"))).digest("hex") === assetDigest);
      command(path.join(scripts, "validate_manifest.mjs"), [path.join(project, "deck-manifest.json")], project);
      cases.push({ name, project, manifest, profile, mode, style });
    }
  }
}
command(path.join(scripts, "scaffold_project.mjs"), ["--mode", "research-deck", "--branding", "unknown", "--output", path.join(output, "invalid-brand")], output, 2);
check("invalid branding creates no project", !await exists(path.join(output, "invalid-brand")));
const unbranded = cases.find(item => item.profile === "none");
const branded = cases.find(item => item.profile === "zuel");
if (unbranded && branded) {
  const copy = structuredClone(unbranded.manifest);
  copy.branding.logo = { src: "./zuel-logo.png", alt: "invalid" };
  check("none with logo metadata is rejected", (await validateBranding(unbranded.project, copy)).length > 0);
  await copyFile(path.join(branded.project, "public/zuel-logo.png"), path.join(unbranded.project, "public/zuel-logo.png"));
  check("none with stale asset is rejected", (await validateBranding(unbranded.project, unbranded.manifest)).some(message => message.includes("stale logo")));
  await rename(path.join(unbranded.project, "public/zuel-logo.png"), path.join(unbranded.project, "stale-logo-test.png"));
  const logo = path.join(branded.project, "public/zuel-logo.png");
  await rename(logo, `${logo}.saved`);
  check("selected missing asset is rejected", (await validateBranding(branded.project, branded.manifest)).some(message => message.includes("missing")));
  await rename(`${logo}.saved`, logo);
  const legacy = structuredClone(branded.manifest);
  delete legacy.branding;
  check("legacy omitted branding preserves existing assets", (await validateBranding(branded.project, legacy)).length === 0 && await exists(logo));
  await writeFile(path.join(branded.project, "legacy-manifest.json"), JSON.stringify(legacy));
  command(path.join(scripts, "validate_manifest.mjs"), [path.join(branded.project, "legacy-manifest.json")], branded.project);
  for (const unsafe of ["../zuel-logo.png", "https://example.com/logo.png", "C:\\logo.png", "/logo.png", "./%2e%2e/logo.png"]) {
    const invalid = structuredClone(branded.manifest);
    invalid.branding.logo.src = unsafe;
    check(`unsafe or missing logo rejected: ${unsafe}`, (await validateBranding(branded.project, invalid)).length > 0);
  }
}

if (runtime) {
  const modules = process.env.RESEARCH_TEST_NODE_MODULES;
  if (!modules) throw new Error("Set RESEARCH_TEST_NODE_MODULES to compatible installed React/TypeScript/Vite/ECharts dependencies for --runtime");
  const require = createRequire(path.join(path.resolve(modules), "../package.json"));
  const tsc = require.resolve("typescript/bin/tsc");
  const vite = path.join(path.dirname(require.resolve("vite/package.json")), "bin/vite.js");
  const esbuild = createRequire(require.resolve("vite/package.json"))("esbuild");
  const primitiveSource = path.join(skill, "assets/react-template").replaceAll("\\", "/");
  const componentTest = await esbuild.build({
    stdin: { contents: `import { renderToStaticMarkup as render } from "react-dom/server";
import { CoverBrand, BrandedClosing } from ${JSON.stringify(primitiveSource + "/SlidePrimitives.tsx")};
import { ReportHero } from ${JSON.stringify(primitiveSource + "/report-runtime/ReportHero.tsx")};
import { ReportClosing } from ${JSON.stringify(primitiveSource + "/report-runtime/ReportClosing.tsx")};
const logo = { src: "./zuel-logo.png", alt: "ZUEL", containsInstitutionName: true };
const results = [];
for (const enabled of [false, true]) {
  const selected = enabled ? logo : undefined;
  const outputs = [
    ["cover", render(<CoverBrand logo={selected} />)],
    ["deck closing", render(<BrandedClosing logo={selected} metadata={[]} />)],
    ["report hero", render(<ReportHero logo={selected} titleId="hero" title="Title" question="Question" answer="Answer" />)],
    ["report closing", render(<ReportClosing logo={selected} titleId="closing" />)],
  ];
  for (const [name, html] of outputs) results.push({ name: name + (enabled ? " branded" : " unbranded"), passed: enabled ? html.includes("<img") && html.includes("data-brand-role") : !/<img|report-hero-brand|closing-brand-row/.test(html) });
  results.push({ name: "closing content preserved " + enabled, passed: outputs[1][1].includes("恳请各位老师同学批评指正") && outputs[3][1].includes("恳请各位老师同学批评指正") });
}
console.log(JSON.stringify(results));`, loader: "tsx", resolveDir: path.dirname(path.resolve(modules)) },
    absWorkingDir: output, nodePaths: [path.resolve(modules)], jsx: "automatic", bundle: true, platform: "node", format: "cjs", write: false,
  });
  const componentFile = path.join(output, "brand-component-test.cjs");
  await writeFile(componentFile, componentTest.outputFiles[0].text);
  const componentResult = command(componentFile, [], output);
  if (componentResult.status === 0) for (const result of JSON.parse(componentResult.stdout)) check(result.name, result.passed);
  for (const item of componentsOnly ? [] : cases) {
    console.log(`Browser matrix: ${item.name}`);
    await symlink(path.resolve(modules), path.join(item.project, "node_modules"), process.platform === "win32" ? "junction" : "dir");
    const typed = command(tsc, ["--noEmit"], item.project);
    if (typed.status !== 0) continue;
    const built = command(vite, ["build"], item.project);
    if (built.status !== 0) continue;
    await withDeckPage(item.project, async ({ page, baseUrl }) => {
      const errors = [];
      const logoRequests = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("request", request => { if (/zuel-logo/.test(request.url())) logoRequests.push(request.url()); });
      await page.goto(baseUrl, { waitUntil: "networkidle" });
      const isReport = item.manifest.outputMode === "scroll-report";
      await page.waitForSelector(isReport ? "[data-report-runtime='ReportRuntime']" : "[data-deck-runtime='DeckRuntime']");
      const count = await page.locator("img[data-brand-audit]").count();
      const expectedLogos = isReport ? item.manifest.sections.filter(section => ["hero", "closing"].includes(section.role)).length : item.manifest.slides.length;
      check(`${item.name}: DOM branding`, item.profile === "none" ? count === 0 : count === expectedLogos);
      check(`${item.name}: no broken images`, await page.locator("img[data-brand-audit]").evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0)));
      check(`${item.name}: editor lock`, await page.locator("img[data-brand-audit]").evaluateAll(images => images.every(img => img.closest("[data-editor-lock='true']"))));
      if (item.profile === "none") {
        check(`${item.name}: no empty brand header`, await page.locator(".report-hero-brand, .closing-brand-row").count() === 0);
        check(`${item.name}: no logo requests`, logoRequests.length === 0);
      }
      check(`${item.name}: browser errors`, errors.length === 0, errors.join("; "));
      await page.screenshot({ path: path.join(item.project, "branding-desktop.png"), fullPage: isReport });
      await page.emulateMedia({ media: "print" });
      await page.goto(`${baseUrl}?print=1`, { waitUntil: "networkidle" });
      check(`${item.name}: print branding`, item.profile === "none" ? await page.locator("img[data-brand-audit]").count() === 0 : await page.locator("img[data-brand-audit]").count() > 0);
      if (isReport) {
        await page.emulateMedia({ media: "screen" });
        await page.setViewportSize({ width: 720, height: 900 });
        await page.goto(baseUrl, { waitUntil: "networkidle" });
        check(`${item.name}: narrow layout`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
        await page.screenshot({ path: path.join(item.project, "branding-narrow.png"), fullPage: true });
      }
    });
  }
}
const result = { passed: checks.every(item => item.passed), checkCount: checks.length, output, checks };
await writeFile(path.join(output, "test-branding-results.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ passed: result.passed, checkCount: checks.length, output, failures: checks.filter(item => !item.passed) }, null, 2));
process.exit(result.passed ? 0 : 1);
