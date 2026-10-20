#!/usr/bin/env node

import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] ?? process.cwd());
const array = (value) => Array.isArray(value) ? value : [];
const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0;
const sourceTypes = new Set(["paper", "dataset", "report", "website", "figure", "table", "software"]);
const localPath = /(?:[a-z]:\\\\|file:\/\/|\\\\\\\\|\/(?:Users|home|tmp)\/)/i;
const isUrl = (value) => /^https:\/\/[^\s]+$/i.test(value ?? "");
const isDoi = (value) => /^(?:https?:\/\/(?:dx\.)?doi\.org\/)?10\.\d{4,9}\/.+$/i.test(value ?? "");

async function readJson(file) { return JSON.parse(await readFile(file, "utf8")); }
async function exists(file) { try { await stat(file); return true; } catch { return false; } }
async function collectHtml(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (["node_modules", ".git", "dist", "build"].includes(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectHtml(full));
    else if (path.extname(entry.name).toLowerCase() === ".html") files.push(full);
  }
  return files;
}

const failures = [];
const warnings = [];
let manifest = {};
let registry = {};
try { manifest = await readJson(path.join(root, "deck-manifest.json")); } catch { failures.push("cannot read deck-manifest.json"); }
const citationPath = manifest.citationRegistry ? path.resolve(root, manifest.citationRegistry) : path.join(root, "citations.json");
if (await exists(citationPath)) {
  try { registry = await readJson(citationPath); } catch { failures.push("cannot read citation registry JSON"); }
} else if (manifest.citationRegistry) failures.push("manifest citationRegistry does not resolve");

let evidence = {};
if (manifest.evidenceRegistry) {
  try { evidence = await readJson(path.resolve(root, manifest.evidenceRegistry)); } catch { failures.push("cannot read evidence registry for citation validation"); }
}
const citations = array(registry.citations ?? evidence.citations);
const claimIds = new Set(array(evidence.claims).map((item) => item?.id).filter(nonEmpty));
const visualIds = new Set(array(evidence.visuals).map((item) => item?.visualId).filter(nonEmpty));
const usedCitationIds = new Set();
for (const unit of [...array(manifest.slides), ...array(manifest.sections), ...array(evidence.narrativeUnits)]) array(unit?.citationIds).forEach((id) => usedCitationIds.add(id));
array(evidence.visuals).forEach((visual) => array(visual?.citationIds).forEach((id) => usedCitationIds.add(id)));
const ids = new Set();
for (const [index, citation] of citations.entries()) {
  const at = `citation ${index + 1}`;
  if (!nonEmpty(citation?.citationId) || ids.has(citation?.citationId)) failures.push(`${at}: citationId must be unique and non-empty`);
  ids.add(citation?.citationId);
  if (!sourceTypes.has(citation?.sourceType)) failures.push(`${at}: sourceType is invalid`);
  if (!nonEmpty(citation?.title)) failures.push(`${at}: title is required`);
  if (!Array.isArray(citation?.claimIds) || !citation.claimIds.length) failures.push(`${at}: claimIds must be a non-empty array`);
  array(citation?.claimIds).forEach((id) => { if (!claimIds.has(id)) failures.push(`${at}: claimId '${id}' does not resolve`); });
  array(citation?.visualIds).forEach((id) => { if (!visualIds.has(id)) failures.push(`${at}: visualId '${id}' does not resolve`); });
  if (citation?.doi && !isDoi(citation.doi)) failures.push(`${at}: DOI format is invalid`);
  if (citation?.url && !isUrl(citation.url)) failures.push(`${at}: URL must be an https link`);
  [citation?.title, citation?.locator, citation?.url, citation?.doi, ...array(citation?.authors)].forEach((value) => { if (localPath.test(String(value ?? ""))) failures.push(`${at}: audience citation exposes a local absolute path`); });
}
usedCitationIds.forEach((id) => { if (!ids.has(id)) failures.push(`audience citation '${id}' has no registry record`); });
if (usedCitationIds.size && !citations.length) failures.push("audience citation markers exist but no Citation Registry is available");
if (citations.length && !usedCitationIds.size) warnings.push("Citation Registry has no explicit audience citationIds; verify markers/reference list are rendered from it");

for (const claim of array(evidence.claims)) {
  const external = claim?.external === true || claim?.evidenceStatus === "CONTEXTUAL";
  const cited = citations.some((citation) => array(citation.claimIds).includes(claim?.id));
  if (external && !cited) failures.push(`external claim '${claim?.id}' lacks a traceable citation`);
}

for (const html of await collectHtml(root)) {
  const source = await readFile(html, "utf8");
  // Offline fonts/images are encoded binary, not audience path strings. Their
  // base64 can randomly contain /Tmp/ or /Users/; inspect the surrounding HTML
  // and code while excluding only the well-delimited data-URI payload bytes.
  const pathSource = source.replace(/data:[a-z0-9.+\/-]+(?:;[a-z0-9=.+-]+)*;base64,[a-z0-9+/=]+/gi, "data:embedded-asset");
  if (localPath.test(pathSource)) failures.push(`audience HTML exposes a local absolute path: ${path.relative(root, html)}`);
  const markerIds = [...source.matchAll(/data-citation-id=["']([^"']+)["']/g)].map((match) => match[1]);
  markerIds.forEach((id) => { if (!ids.has(id)) failures.push(`HTML marker '${id}' has no registry record`); });
  if (/data-citation-id=/.test(source)) {
    const nonLinks = [...source.matchAll(/<(?!a\b)[^>]*data-citation-id=[^>]*>/gi)];
    if (nonLinks.length) warnings.push(`HTML has non-link citation marker(s) in ${path.relative(root, html)}; only citations without DOI/URL may be plain text`);
  }
}

const report = { project: root, citationRegistry: citations.length ? citationPath : undefined, citations: citations.length, passed: failures.length === 0, failures, warnings };
console.log(JSON.stringify(report, null, 2));
process.exit(failures.length ? 1 : 0);
