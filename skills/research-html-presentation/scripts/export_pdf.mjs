#!/usr/bin/env node

import { access, copyFile, mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { withDeckPage } from "./browser_helpers.mjs";

const require = createRequire(import.meta.url);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(process.argv[2] ?? process.cwd());
const manifestPath = path.join(projectRoot, "deck-manifest.json");
let temporaryOutputPath = "";

function loadPdfLib() {
  const candidates = [
    process.env.PDF_LIB_PATH,
    "pdf-lib",
    path.join(projectRoot, "node_modules", "pdf-lib"),
    path.resolve(path.dirname(process.execPath), "..", "node_modules", "pdf-lib"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // Try the next explicitly available PDF parser.
    }
  }
  throw new Error("pdf-lib was not found. Set PDF_LIB_PATH to a trusted pdf-lib package or install pdf-lib in the deck project; PDF page-count validation is mandatory.");
}

function slugify(value) {
  const slug = value.normalize("NFKD").replace(/[^\p{Letter}\p{Number}]+/gu, "-").replace(/^-|-$/g, "").toLowerCase();
  return slug || "research-presentation";
}

async function readManifest() {
  try {
    return JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    throw new Error(`cannot read valid manifest JSON: ${manifestPath}`);
  }
}

function runRequiredScript(scriptName, args) {
  const scriptPath = path.join(scriptDirectory, scriptName);
  const result = spawnSync(process.execPath, [scriptPath, ...args], { encoding: "utf8", env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`${scriptName} failed before PDF export${detail ? `:\n${detail}` : ""}`);
  }
  return result.stdout.trim();
}

try {
  await access(projectRoot);
  const manifest = await readManifest();
  const stage = manifest.stage ?? "complete";
  if (stage !== "complete") throw new Error("PDF export is blocked because manifest.stage is 'prototype'. Obtain representative-page approval and change the manifest to stage 'complete' first.");

  const slides = Array.isArray(manifest.slides) ? manifest.slides : [];
  if (!slides.length) throw new Error("manifest.slides must contain at least one slide");

  const outputPath = path.resolve(process.argv[3] ?? path.join(projectRoot, "export", `${slugify(manifest.title ?? "research-presentation")}.pdf`));
  if (path.extname(outputPath).toLowerCase() !== ".pdf") throw new Error("output path must use the .pdf extension");
  await mkdir(path.dirname(outputPath), { recursive: true });
  await mkdir(path.join(projectRoot, ".deck-render"), { recursive: true });
  temporaryOutputPath = `${outputPath}.partial-${process.pid}`;
  const { PDFDocument } = loadPdfLib();

  runRequiredScript("validate_manifest.mjs", [manifestPath]);
  const auditPath = path.join(projectRoot, ".deck-render", "pdf-layout-audit.json");
  runRequiredScript("audit_layout.mjs", [projectRoot, auditPath]);

  const expectedIds = slides.map((slide) => slide.id);
  const browserReport = await withDeckPage(projectRoot, async ({ page, baseUrl }) => {
    const printUrl = new URL(baseUrl);
    printUrl.searchParams.set("print", "1");
    printUrl.hash = "";
    await page.goto(printUrl.toString(), { waitUntil: "networkidle" });
    await page.waitForSelector(".print-deck .slide", { timeout: 20000 });
    await page.waitForFunction(() => ["true", "error"].includes(document.documentElement.dataset.deckReady ?? ""), undefined, { timeout: 30000 });
    const deckReady = await page.evaluate(() => document.documentElement.dataset.deckReady);
    if (deckReady !== "true") throw new Error("print runtime reported an evidence-visual readiness failure");
    await page.emulateMedia({ media: "print" });

    const inspection = await page.evaluate(({ ids }) => {
      const failures = [];
      const slideElements = [...document.querySelectorAll(".print-deck .slide")];
      const actualIds = slideElements.map((slide) => slide.getAttribute("data-slide-id"));
      if (slideElements.length !== ids.length) failures.push(`print mode rendered ${slideElements.length} slides; manifest declares ${ids.length}`);
      if (JSON.stringify(actualIds) !== JSON.stringify(ids)) failures.push("print-mode slide order does not match manifest order");
      if (document.fonts && document.fonts.status !== "loaded") failures.push(`font loading status is '${document.fonts.status}'`);

      const brokenImages = [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.currentSrc || image.src || image.alt);
      if (brokenImages.length) failures.push(`broken images: ${brokenImages.join(", ")}`);

      const evidenceVisuals = [...document.querySelectorAll(".print-deck [data-evidence-visual]")];
      evidenceVisuals.forEach((visual) => {
        const visualId = visual.getAttribute("data-visual-id") || "unknown visual";
        if (visual.getAttribute("data-visual-ready") !== "true") failures.push(`${visualId} is not ready`);
        if (!visual.getAttribute("data-claim-ids")) failures.push(`${visualId} has no claim links`);
        if (visual.getAttribute("data-evidence-type") === "A" && (!visual.getAttribute("data-default-state") || !visual.getAttribute("data-print-state"))) failures.push(`${visualId} lacks deterministic default/print state`);
        if (visual.getAttribute("data-evidence-type") === "C" && visual.getAttribute("data-pixel-immutable") !== "true") failures.push(`${visualId} is Type C but is not pixel-immutable`);
      });

      slideElements.forEach((slide, index) => {
        if (!(slide instanceof HTMLElement)) return;
        if (Math.abs(slide.offsetWidth - 1600) > 1 || Math.abs(slide.offsetHeight - 900) > 1) failures.push(`slide ${index + 1} is ${slide.offsetWidth}×${slide.offsetHeight}, expected 1600×900`);
        if (slide.scrollWidth > slide.clientWidth + 1 || slide.scrollHeight > slide.clientHeight + 1) failures.push(`slide ${index + 1} overflows its 1600×900 canvas`);
        if (!slide.textContent?.trim() && !slide.querySelector("img, svg, canvas, table")) failures.push(`slide ${index + 1} is blank`);
      });

      const hiddenSelectors = [".deck-toolbar", ".nav-arrow", ".progress-track", ".chapter-panel", ".lightbox", ".presenter-view", ".presenter-notes", "[data-presenter-only]", "[data-debug-overlay]", "[data-chart-control]"];
      hiddenSelectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((element) => {
          if (getComputedStyle(element).display !== "none") failures.push(`${selector} remains visible in print mode`);
        });
      });

      document.querySelectorAll(".print-deck .fragment").forEach((element) => {
        const style = getComputedStyle(element);
        if (Number(style.opacity) < 0.99 || style.visibility === "hidden" || style.display === "none") failures.push("a fragment is not fully revealed in print mode");
      });

      return { slideCount: slideElements.length, actualIds, brokenImages, evidenceVisualCount: evidenceVisuals.length, failures };
    }, { ids: expectedIds });

    if (inspection.failures.length) throw new Error(`print-mode validation failed:\n- ${inspection.failures.join("\n- ")}`);
    const pdf = await page.pdf({
      path: temporaryOutputPath,
      width: "1600px",
      height: "900px",
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      printBackground: true,
      preferCSSPageSize: true,
    });
    return { ...inspection, bytesWritten: pdf.byteLength };
  });

  const outputInfo = await stat(temporaryOutputPath);
  if (outputInfo.size < 1024) throw new Error(`generated PDF is unexpectedly small (${outputInfo.size} bytes)`);

  const pdfDocument = await PDFDocument.load(await readFile(temporaryOutputPath));
  const pageCount = pdfDocument.getPageCount();
  if (pageCount !== slides.length) throw new Error(`PDF has ${pageCount} pages; manifest declares ${slides.length}`);
  const invalidRatios = pdfDocument.getPages().map((page, index) => {
    const { width, height } = page.getSize();
    return { page: index + 1, width, height, ratio: width / height };
  }).filter((page) => Math.abs(page.ratio - 16 / 9) > 0.003);
  if (invalidRatios.length) throw new Error(`PDF contains non-16:9 pages: ${invalidRatios.map((page) => `${page.page} (${page.width}×${page.height})`).join(", ")}`);

  await copyFile(temporaryOutputPath, outputPath);
  await unlink(temporaryOutputPath);
  temporaryOutputPath = "";

  const report = {
    project: projectRoot,
    manifest: manifestPath,
    stage,
    output: outputPath,
    slideCount: slides.length,
    pdfPageCount: pageCount,
    aspectRatio: "16:9",
    bytes: outputInfo.size,
    layoutAudit: auditPath,
    printMode: browserReport,
    passed: true,
  };
  await writeFile(`${outputPath}.json`, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  if (temporaryOutputPath) await unlink(temporaryOutputPath).catch(() => undefined);
  console.error(`[pdf-export] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
