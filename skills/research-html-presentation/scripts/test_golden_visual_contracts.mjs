#!/usr/bin/env node

import { access, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { withDeckPage } from "./browser_helpers.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRoot = path.join(root, "examples", "golden-visual-contracts");
const requiredKinds = new Set([
  "scientific-evidence",
  "data-evidence",
  "authentic-project-proof",
  "explanatory-structure",
  "ordinary-narrative",
  "decorative"
]);
const requiredCenters = new Set([
  "dominant-scientific-figure",
  "structured-chart",
  "hierarchy-map",
  "technical-route",
  "equation-validation"
]);

const entries = (await readdir(fixtureRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const results = [];
for (const directory of entries) {
  if (directory === "rendered-academic-light-v2") {
    const renderedRoot = path.join(fixtureRoot, directory);
    const contract = JSON.parse(await readFile(path.join(renderedRoot, "contract.json"), "utf8"));
    const errors = [];
    for (const artifact of contract.artifacts) try {
      const artifactPath = path.join(renderedRoot, artifact);
      await access(artifactPath);
      if ((artifact.endsWith(".png") || artifact.endsWith(".pdf")) && (await stat(artifactPath)).size < 1024) errors.push(`rendered artifact is unexpectedly small: ${artifact}`);
    } catch { errors.push(`missing rendered artifact: ${artifact}`); }
    const browser = await withDeckPage(renderedRoot, async ({ page, baseUrl }) => {
      await page.goto(baseUrl, { waitUntil: "networkidle" });
      return page.evaluate(() => {
        const slides = [...document.querySelectorAll("[data-golden-slide]")];
        const chartForms = [...document.querySelectorAll("[data-chart-host='true']")].map((node) => node.getAttribute("data-chart-form"));
        const silhouettes = slides.map((slide) => slide.getAttribute("data-silhouette"));
        const badGeometry = slides.filter((slide) => { const rect = slide.getBoundingClientRect(); return rect.width !== 1600 || rect.height !== 900 || slide.scrollWidth > slide.clientWidth || slide.scrollHeight > slide.clientHeight; }).length;
        const smallBody = [...document.querySelectorAll("[data-golden-slide] p:not(.kicker), [data-golden-slide] li")].filter((node) => Number.parseFloat(getComputedStyle(node).fontSize) < 18).length;
        const headers = [...document.querySelectorAll("[data-golden-slide] .head")].map((node) => node.getBoundingClientRect().height);
        const flow = document.querySelector("[data-flow-valid='true']");
        const flowPaths = flow ? [...flow.querySelectorAll("path[marker-end]")].length : 0;
        const feedbackPaths = flow ? [...flow.querySelectorAll(".flow-feedback[marker-end]")].length : 0;
        return { slideCount: slides.length, chartForms, silhouettes, badGeometry, smallBody, maxHeader: Math.max(0, ...headers), cobalt: getComputedStyle(document.documentElement).getPropertyValue("--academic-blue-900").trim(), flowPaths, feedbackPaths };
      });
    });
    if (browser.slideCount !== contract.slideCount) errors.push(`expected ${contract.slideCount} slides, found ${browser.slideCount}`);
    if (browser.badGeometry) errors.push(`${browser.badGeometry} slide(s) overflow or violate 1600x900`);
    if (browser.smallBody) errors.push(`${browser.smallBody} body text element(s) are below 18px`);
    if (browser.maxHeader > 75) errors.push(`content header is ${browser.maxHeader}px; expected compact <=75px`);
    if (browser.cobalt.toLowerCase() !== "#173f9e") errors.push("cobalt token mismatch");
    if (browser.flowPaths < 5 || browser.feedbackPaths < 1) errors.push("process Golden lacks true directed branch/merge/feedback SVG paths");
    for (const form of contract.requiredChartForms) if (!browser.chartForms.includes(form)) errors.push(`missing chart form: ${form}`);
    if (new Set(browser.silhouettes).size < 8) errors.push("rendered Golden has insufficient silhouette diversity");
    results.push({ id: directory, passed: errors.length === 0, errors, browser });
    continue;
  }
  const file = path.join(fixtureRoot, directory, "fixture.json");
  const fixture = JSON.parse(await readFile(file, "utf8"));
  const errors = [];
  const plan = fixture.visualPlan ?? {};
  if (fixture.id !== directory) errors.push("fixture id must match directory");
  if (fixture.synthetic !== true) errors.push("fixture must be explicitly synthetic");
  if (!fixture.materialType) errors.push("materialType is required");
  if (!/^L\d{2}$/.test(fixture.layout ?? "")) errors.push("layout must be an L01-L24 id");
  if (!plan.coreClaim || plan.coreClaim.length < 8) errors.push("visualPlan.coreClaim is too short");
  if (!Array.isArray(plan.evidenceKinds) || !plan.evidenceKinds.length || plan.evidenceKinds.some((kind) => !requiredKinds.has(kind))) {
    errors.push("visualPlan.evidenceKinds contains an unknown or missing kind");
  }
  if (!requiredCenters.has(plan.visualCenter)) errors.push("visualPlan.visualCenter is not a supported center");
  if (!Array.isArray(plan.availableVisualIds) || !plan.availableVisualIds.length) errors.push("availableVisualIds is required");
  if (!Array.isArray(plan.primaryVisualIds) || !plan.primaryVisualIds.length) errors.push("primaryVisualIds is required");
  if (!plan.evidenceWeight || Object.values(plan.evidenceWeight).some((weight) => !Number.isFinite(weight) || weight < 0 || weight > 1)) {
    errors.push("evidenceWeight must contain finite values in [0, 1]");
  }
  if (typeof plan.preserveWholeFigure !== "boolean" || !Array.isArray(plan.extractableSubfigures) || typeof plan.needsZoom !== "boolean") errors.push("figure preservation fields are required");
  if (!Array.isArray(plan.mergeOrBackupIds) || !Array.isArray(plan.omissionReasons)) errors.push("mergeOrBackupIds and omissionReasons are required");
  if (!Array.isArray(fixture.requiredChecks) || fixture.requiredChecks.length < 2) errors.push("at least two requiredChecks are expected");
  if (!Array.isArray(fixture.expectedFailures) || fixture.expectedFailures.length < 2) errors.push("expectedFailures are required");
  if (directory === "method-process-led" && !fixture.requiredChecks.includes("flowspec")) errors.push("method fixture must cover FlowSpec");
  results.push({ id: fixture.id, passed: errors.length === 0, errors });
}
const failed = results.filter((result) => !result.passed);
console.log(JSON.stringify({ passed: failed.length === 0, fixtureCount: results.length, results }, null, 2));
process.exit(failed.length ? 1 : 0);
