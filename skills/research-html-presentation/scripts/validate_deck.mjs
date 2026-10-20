#!/usr/bin/env node

import { access, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = path.resolve(process.argv[2] ?? process.cwd());
const ignored = new Set(["node_modules", ".git", ".next", ".vinext", ".wrangler", "dist", "build", ".deck-render"]);
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".html", ".css"]);

async function collect(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collect(full));
    else if (sourceExtensions.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

try {
  await access(projectRoot);
  if (!(await stat(projectRoot)).isDirectory()) throw new Error("Project root is not a directory");
} catch {
  console.error(`[deck-validator] invalid project root: ${projectRoot}`);
  process.exit(2);
}

const files = await collect(projectRoot);
const source = (await Promise.all(files.map(async (file) => `\n/* ${path.relative(projectRoot, file)} */\n${await readFile(file, "utf8")}`))).join("\n");
const cssFiles = files.filter((file) => file.endsWith(".css"));
const cssSource = (await Promise.all(cssFiles.map((file) => readFile(file, "utf8")))).join("\n");
const audienceCssFiles = cssFiles.filter((file) => !/[\\/](?:presenter-view|print-export)\.css$/i.test(file));
const audienceCssSource = (await Promise.all(audienceCssFiles.map((file) => readFile(file, "utf8")))).join("\n");

const checks = [
  ["fixed 1600 logical width", /(?:DECK_WIDTH|BASE_WIDTH|width)\s*(?::|=)\s*1600|width:\s*1600px/i],
  ["fixed 900 logical height", /(?:DECK_HEIGHT|BASE_HEIGHT|height)\s*(?::|=)\s*900|height:\s*900px/i],
  ["one-slide ARIA semantics", /aria-roledescription=["'{`]slide/i],
  ["active slide state", /is-active/],
  ["URL hash page state", /location\.hash|#\//],
  ["forward keyboard navigation", /ArrowRight/],
  ["backward keyboard navigation", /ArrowLeft/],
  ["fullscreen support", /requestFullscreen/],
  ["page progress", /progress-track|deck-progress/],
  ["polite page announcement", /aria-live=["'{`]polite/i],
  ["fragment support", /fragment/],
  ["zoom or lightbox support", /lightbox|image-zoom|zoomable/i],
  ["focus support", /focusable|focusedId|data-focus/i],
  ["Presenter View support", /PresenterView|presenter-mode|presenter=1/],
  ["Presenter View keyboard shortcut", /event\.key\.toLowerCase\(\)\s*===\s*["']p["']/i],
  ["print/PDF runtime mode", /print-deck|print-mode|print=1/],
  ["reduced-motion support", /prefers-reduced-motion/],
  ["development overflow audit", /scrollWidth|auditActiveSlide|deck-overflow/],
];

const failures = checks.filter(([, pattern]) => !pattern.test(source)).map(([name]) => name);
if (!/html\s*,?\s*body[\s\S]{0,260}overflow:\s*hidden/i.test(cssSource) && !/body[\s\S]{0,180}overflow:\s*hidden/i.test(cssSource)) {
  failures.push("document overflow hidden");
}
if (!/\.slide[\s\S]{0,320}overflow:\s*hidden/i.test(cssSource)) failures.push("slide overflow hidden");
if (/https?:\/\/[^\s"']*(?:echarts|jsdelivr|unpkg|cdnjs)/i.test(source)) failures.push("remote chart/CDN dependency detected; evidence charts must use local project dependencies");

// Type declarations may mention the hook without a project actually rendering
// a chart. Only an emitted JSX/HTML attribute activates the chart contract.
const hasEvidenceVisuals = /<[^>]+data-evidence-visual(?:\s|=|>)/.test(source);
if (hasEvidenceVisuals) {
  const evidenceChecks = [
    ["evidence visual ID hook", /data-visual-id/],
    ["evidence claim-link hook", /data-claim-ids/],
    ["evidence readiness hook", /data-visual-ready/],
    ["evidence status hook", /data-evidence-status/],
    ["representation status hook", /data-representation-status/],
    ["chart default-state hook", /data-default-state/],
    ["chart print-state hook", /data-print-state/],
  ];
  failures.push(...evidenceChecks.filter(([, pattern]) => !pattern.test(source)).map(([name]) => name));
}

const forbiddenOverflow = [...cssSource.matchAll(/\.slide[^{}]*\{[^{}]*overflow(?:-y)?:\s*(auto|scroll)/gi)].map((match) => match[0]);
if (forbiddenOverflow.length) failures.push("slide contains scrollable overflow");

const warnings = [];
if (/backdrop-filter|glassmorphism|particle|neon|mouse-follow/i.test(source)) warnings.push("possible prohibited web/tech visual effect");
if ((source.match(/linear-gradient|radial-gradient/g) ?? []).length > 4) warnings.push("many gradients detected; verify they are narrow structural bands only");
if (!/figcaption/.test(source)) warnings.push("no figure captions detected; verify scientific figures retain context");
if (!/data-scientific|ScientificImage/.test(source)) warnings.push("no scientific-figure audit hooks detected; add them to research evidence images");
if (!hasEvidenceVisuals) warnings.push("no data-evidence-visual hooks detected; legacy figures remain supported, but new scientific evidence should use the evidence wrappers");
if (hasEvidenceVisuals && !/data-accessible-summary|AccessibleDataSummary|aria-label=/.test(source)) warnings.push("evidence visuals have no detectable accessible data summary");
if (/object-fit:\s*cover/i.test(cssSource) && !/cropSafe|data-crop-safe/i.test(source)) warnings.push("object-fit: cover detected without an explicit crop-safe declaration");
if (!/synthesis|conclusion|结论|总结/i.test(source)) warnings.push("no explicit synthesis/conclusion slide detected");
if (!/branded-closing|slide-closing|type:\s*["']closing|data-slide-type=["']closing/i.test(source)) warnings.push("no dedicated closing slide detected");
if (/\b(?:0?1)\s*\/\s*(?:10|11|12|13|14|15|16|17|18)\b/.test(source) && !/totalSlides|slides\.length/.test(source)) warnings.push("possible hard-coded page total; derive page count from slide data");

const smallCss = [...audienceCssSource.matchAll(/font-size:\s*(1[0-7]|[6-9])px/gi)].length;
if (smallCss > 8) warnings.push(`${smallCss} CSS declarations below 18 px; reserve small text for captions, sources, and footers only`);

const report = {
  project: projectRoot,
  sourceFiles: files.length,
  passed: failures.length === 0,
  failures,
  warnings,
};

console.log(JSON.stringify(report, null, 2));
process.exit(failures.length ? 1 : 0);
