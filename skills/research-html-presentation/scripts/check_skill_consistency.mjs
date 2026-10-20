#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFile(path.join(skill, file), "utf8");
const failures = [];
const warnings = [];
const [skillMd, schema, manifestValidator, evidenceValidator, yaml, impl, scroll] = await Promise.all([
  read("SKILL.md"), read("schemas/deck-manifest.schema.json"), read("scripts/validate_manifest.mjs"), read("scripts/validate_evidence_visuals.mjs"), read("agents/openai.yaml"), read("references/implementation-contract.md"), read("references/dataset-scroll-report.md")
]);
const visualStyleCss = await read("assets/react-template/visual-styles/tech-engineering-dark.css");
const visualStyleReference = await read("references/visual-styles.md");
const visualComposition = await read("references/visual-composition-contract.md");
const smokeReferences = await read("scripts/smoke_reference_projects.mjs");
const layoutAudit = await read("scripts/audit_layout.mjs");
const visualReviewSchema = await read("schemas/visual-review.schema.json");
const slidePrimitives = await read("assets/react-template/SlidePrimitives.tsx");
const reportClosing = await read("assets/react-template/report-runtime/ReportClosing.tsx");
if (!/"const"\s*:\s*3/.test(schema)) failures.push("canonical manifest schema does not require datasetSemanticVersion 3");
for (const [name, source] of [["SKILL.md", skillMd], ["implementation contract", impl], ["manifest validator", manifestValidator], ["evidence validator", evidenceValidator]]) if (!/datasetSemanticVersion[^\n]{0,140}(?:3|>= 3)/.test(source)) failures.push(`${name} does not reference semantic version 3`);
if (/new [`']dataset-report[`'][^\n]{0,100}datasetSemanticVersion:\s*2/i.test(impl) || /new dataset[^\n]{0,120}(?:version|Version)\s*2/i.test(skillMd)) failures.push("a new project still declares semantic version 2");
const brandingReference = await read("references/branding.md");
const zuelReference = await read("references/zuel-branding.md");
const scaffold = await read("scripts/scaffold_project.mjs");
if (!/branding.profile: "none"/.test(skillMd) || !/explicitly request/.test(yaml)) failures.push("Skill metadata must default to no logo and require explicit opt-in");
if (!/--branding/.test(scaffold) || !/requestedBranding = value\("--branding"\) \?\? "none"/.test(scaffold)) failures.push("scaffold must expose an unbranded default and an explicit branding option");
if (!/zuel-branding.md/.test(brandingReference) || !/230–270/.test(zuelReference)) failures.push("optional ZUEL rules are missing or not routed");
const reportApp = await read("assets/project-template/report/src/App.tsx");
const generalApp = await read("assets/project-template/general-report/src/App.tsx");
// Documentation can discuss both forms in one paragraph; inspect the actual
// template boundary instead of treating co-occurring words as a violation.
if (!/scroll-report/.test(skillMd) || !reportApp.includes("ReportRuntime") || !generalApp.includes("ReportRuntime") || /\bDeckRuntime\b/.test(reportApp + generalApp)) failures.push("scroll-report templates do not preserve the shared ReportRuntime boundary");
if (!/NarrativeUnit/.test(impl) || !/slide-deck/.test(impl) || !/scroll-report/.test(impl)) failures.push("NarrativeUnit/outputMode canonical implementation contract is incomplete");
if (!/citation-and-source-rendering/.test(skillMd)) failures.push("citation reference is not routed from SKILL.md");
if (!/visual-composition-contract/.test(skillMd) || !/VisualPlan/.test(visualComposition) || !/FlowSpec/.test(visualComposition)) failures.push("material-adaptive visual composition contract is not routed or incomplete");
if (!/academic-light/.test(schema) || !/tech-engineering-dark/.test(schema)) failures.push("manifest schema is missing the constrained visualStyle enum");
if (!/Visual Style Gate|visual style/i.test(skillMd)) failures.push("SKILL.md does not define the Visual Style Gate");
if (!/data-visual-style/.test(impl) || !/academic-light/.test(impl)) failures.push("implementation contract does not define resolved visual-style inheritance");
if (!/compositionProfile/.test(impl) || !/FlowDiagram/.test(impl)) failures.push("implementation contract does not expose compositionProfile and FlowDiagram contracts");
if (!/Never repair style inheritance by hard-coding `academic-light`/.test(skillMd) || !/explicit light choice, an explicit dark choice, and a legacy omitted value/.test(visualStyleReference)) failures.push("dual-style inheritance and regression rules are incomplete");
if (!/tech-engineering-dark/.test(visualStyleCss) || !/data-visual-style/.test(visualStyleCss)) failures.push("scoped tech-engineering-dark stylesheet is missing or unscoped");
if (/neon|particle|glassmorphism/i.test(visualStyleCss)) failures.push("dark visual skin contains prohibited decorative vocabulary");
const scriptFiles = await readdir(path.join(skill, "scripts"));
if (!scriptFiles.includes("validate_citations.mjs") || !scriptFiles.includes("validate_flow_specs.mjs") || !scriptFiles.includes("verify_project.mjs")) failures.push("P0 citation, FlowSpec, or unified verification script is missing");
for (const rel of ["SKILL.md", "references/branding.md", "references/presentation-profiles.md", "references/implementation-contract.md", "references/evidence-policy.md"]) {
  if (/non-ZUEL[^\n]{0,90}out of scope|default ZUEL (?:reporting )?identity|must belong to Zhongnan/i.test(await read(rel))) failures.push(`${rel} retains the superseded ZUEL-only applicability`);
}
for (const token of ["flow-edge-label-gap", "flow-edge-label-hook", "flow-label-detached", "flow-connector-fragmented", "flow-horizontal-span", "flow-unbalanced-margins", "brand-painted-anchor", "brand-cross-role-anchor", "scaled-preview-overflow"]) if (!layoutAudit.includes(token)) failures.push(`layout audit is missing '${token}' enforcement`);
for (const token of ["renderFingerprint", "reviewedAt", "reviewEvidence", "flowGeometryStatus", "brandPlacementStatus", "scaledPreviewStatus"]) if (!visualReviewSchema.includes(token)) failures.push(`visual-review schema is missing '${token}'`);
if (!slidePrimitives.includes("恳请各位老师同学批评指正") || !reportClosing.includes("恳请各位老师同学批评指正")) failures.push("deck/report closing templates do not share the required default invitation");
if (/THANK YOU · QUESTIONS & DISCUSSION/.test(slidePrimitives)) failures.push("deck closing still uses the superseded default English line");

const styleRegressionCases = [
  { name: "golden-research-deck", expected: undefined, runtime: "src/runtime/DeckRuntime.tsx" },
  { name: "golden-editable-research-deck", expected: "academic-light", runtime: "src/runtime/DeckRuntime.tsx" },
  { name: "golden-tech-engineering-dark", expected: "tech-engineering-dark", runtime: "src/runtime/DeckRuntime.tsx" },
  { name: "golden-scroll-report", expected: undefined, runtime: "src/runtime/report-runtime/ReportRuntime.tsx" },
  { name: "golden-editable-research-deck/report-authoring", expected: "academic-light", runtime: "src/runtime/report-runtime/ReportRuntime.tsx" },
  { name: "golden-tech-engineering-dark-report", expected: "tech-engineering-dark", runtime: "src/runtime/report-runtime/ReportRuntime.tsx" },
];
for (const testCase of styleRegressionCases) {
  const manifest = JSON.parse(await read(`examples/${testCase.name}/deck-manifest.json`));
  const app = await read(`examples/${testCase.name}/src/App.tsx`);
  const runtime = await read(`examples/${testCase.name}/${testCase.runtime}`);
  if (manifest.visualStyle !== testCase.expected) failures.push(`${testCase.name} no longer represents its declared visual-style regression case`);
  if (!/visualStyle=\{resolveVisualStyle\(manifest\.visualStyle\)\}/.test(app)) failures.push(`${testCase.name} does not resolve the manifest visual style at the app boundary`);
  if (!/document\.documentElement\.dataset\.visualStyle/.test(runtime) || !/data-visual-style=\{resolvedVisualStyle\}/.test(runtime)) failures.push(`${testCase.name} runtime does not expose the resolved visual style`);
  if (!smokeReferences.includes(`"${testCase.name}"`)) failures.push(`${testCase.name} is missing from Golden smoke regression`);
}
console.log(JSON.stringify({ skill, passed: failures.length === 0, failures, warnings }, null, 2));
process.exit(failures.length ? 1 : 0);
