#!/usr/bin/env node

import { createHash } from "node:crypto";
import { copyFile, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const value = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; };
const help = args.includes("--help") || args.includes("-h");
const mode = value("--mode");
const requestedProfile = value("--profile");
const contentProfiles = new Set(["thesis-defense", "literature-review", "project-review", "grant-review", "conference-talk", "course-report", "reading-deck", "work-report"]);
const output = value("--output");
const requestedBranding = value("--branding") ?? "none";
const requestedVisualStyle = value("--visual-style") ?? "academic-light";
const requestedCompositionProfile = value("--composition-profile") ?? (requestedVisualStyle === "academic-light" ? "compact-academic-board" : "standard");
const noAuthoring = args.includes("--no-authoring");
const scientificCharts = args.includes("--scientific-charts");
const requestedDisplayFont = value("--display-font") ?? process.env.RESEARCH_HTML_PRESENTATION_FONT;
const analysisCompanion = mode === "dataset-scroll-report" && !args.includes("--no-analysis-companion");
const analysisFlow = mode === "dataset-scroll-report" && !args.includes("--no-analysis-flow");
const dataHealth = mode === "dataset-scroll-report" && !args.includes("--no-data-health");
const companionModelApi = args.includes("--analysis-companion-llm");
// --authoring remains accepted as a backwards-compatible no-op. New projects
// include the local Authoring Layer unless the caller explicitly opts out.
const authoring = !noAuthoring;
const modes = new Set(["research-deck", "dataset-deck", "dataset-scroll-report", "general-scroll-report"]);
const visualStyles = new Set(["academic-light", "tech-engineering-dark"]);
const compositionProfiles = new Set(["standard", "compact-academic-board"]);
if (help) {
  console.log("Usage: node scaffold_project.mjs --mode <research-deck|dataset-deck|dataset-scroll-report|general-scroll-report> --output <new-directory> [--profile <content-profile>] [--visual-style <academic-light|tech-engineering-dark>] [--branding <none|zuel>] [--composition-profile <standard|compact-academic-board>] [--no-authoring] [--scientific-charts] [--display-font <licensed-woff-path>] [--no-analysis-companion] [--no-analysis-flow] [--no-data-health] [--analysis-companion-llm]");
  console.log("Authoring is enabled by default for new projects; --authoring is retained as a compatibility alias.");
  process.exit(0);
}
if (!modes.has(mode) || !output || !visualStyles.has(requestedVisualStyle) || !compositionProfiles.has(requestedCompositionProfile)) {
  console.error("--mode and --output are required; --visual-style must be academic-light or tech-engineering-dark; --composition-profile must be standard or compact-academic-board. Run with --help for supported modes.");
  process.exit(2);
}
if (args.includes("--analysis-companion") && args.includes("--no-analysis-companion")) {
  console.error("--analysis-companion conflicts with --no-analysis-companion");
  process.exit(2);
}
if (args.includes("--analysis-flow") && args.includes("--no-analysis-flow")) {
  console.error("--analysis-flow conflicts with --no-analysis-flow");
  process.exit(2);
}
if (mode !== "dataset-scroll-report" && ["--analysis-companion", "--no-analysis-companion", "--analysis-flow", "--no-analysis-flow", "--no-data-health"].some((flag) => args.includes(flag))) {
  console.error("Analysis companion and flow options are supported only for dataset-scroll-report");
  process.exit(2);
}
if (companionModelApi && !analysisCompanion) {
  console.error("--analysis-companion-llm requires an enabled companion in dataset-scroll-report");
  process.exit(2);
}

if (!["none", "zuel"].includes(requestedBranding)) { console.error("--branding must be none or zuel"); process.exit(2); }

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(scriptDirectory, "..");
const templateRoot = path.join(skillRoot, "assets", "project-template");
const runtimeRoot = path.join(skillRoot, "assets", "react-template");
const branding = requestedBranding === "zuel"
  ? JSON.parse(await readFile(path.join(skillRoot, "assets", "branding", "zuel.json"), "utf8"))
  : { profile: "none" };
const root = path.resolve(output);
try {
  await stat(root);
  console.error(`Refusing to modify existing path: ${root}`);
  process.exit(2);
} catch {
  // A new output directory is required so existing projects are never migrated implicitly.
}

async function copyTree(source, destination) {
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) await copyTree(from, to);
    else await copyFile(from, to);
  }
}

async function copyRuntimeFile(relative) {
  const from = path.join(runtimeRoot, relative);
  const to = path.join(root, "src", "runtime", relative);
  await mkdir(path.dirname(to), { recursive: true });
  await copyFile(from, to);
}

const general = mode === "general-scroll-report";
const dataset = mode === "dataset-deck" || mode === "dataset-scroll-report";
const scroll = mode === "dataset-scroll-report" || general;
const profile = dataset ? "dataset-report" : requestedProfile ?? (general ? "work-report" : "thesis-defense");
if ((!dataset && !contentProfiles.has(profile)) || (dataset && requestedProfile && requestedProfile !== "dataset-report")) { console.error("--profile must match the content route; use dataset modes only for dataset-led analysis"); process.exit(2); }
const outputMode = scroll ? "scroll-report" : "slide-deck";
const units = general
  ? [
      { id: "hero", chapter: "概览", role: "hero", title: "汇报标题（待填充）", titleMode: "two-line", claimIds: [], visualIds: [], narrativeUnitId: "narrative-hero" },
      { id: "work", chapter: "主要内容", role: "work", title: "主要工作或材料（待填充）", titleMode: "two-line", claimIds: [], visualIds: [], narrativeUnitId: "narrative-work", visualCenter: "text-structure" },
      { id: "method", chapter: "方法与实例", role: "method", title: "方法或实例（待填充）", titleMode: "two-line", claimIds: [], visualIds: [], narrativeUnitId: "narrative-method", visualCenter: "method-process" }
    ]
  : scroll
  ? [
       { id: "hero", chapter: "概览", role: "hero", title: "数据集分析报告（待填充）", claimIds: [], visualIds: [], narrativeUnitId: "narrative-hero" },
       { id: "analysis-design", chapter: "分析设计", role: "analysis-design", title: "分析设计（待填充）", claimIds: [], visualIds: [], narrativeUnitId: "narrative-analysis-design" },
       { id: "decisive-result", chapter: "核心发现", role: "decisive-result", title: "决定性结果（待填充）", claimIds: [], visualIds: [], narrativeUnitId: "narrative-decisive-result" },
    ]
  : [
       { id: "cover", section: "封面", type: "cover", layout: "L01", title: "科研汇报标题（待填充）", claimIds: [], visualIds: [], narrativeUnitId: "narrative-cover" },
       { id: "method", section: "研究设计", type: "content", layout: "L08", bodySilhouette: "process-board", title: "方法或技术路线（待填充）", claimIds: [], visualIds: [], narrativeUnitId: "narrative-method", visualPlan: { coreClaim: "真实材料接入后形成可验证的研究路径", evidenceKinds: ["explanatory-structure"], availableVisualIds: [], visualCenter: "technical-route", primaryVisualIds: [], evidenceWeight: {}, preserveWholeFigure: false, extractableSubfigures: [], needsZoom: false, mergeOrBackupIds: [], omissionReasons: [] } },
       { id: "result", section: "核心发现", type: "content", layout: "L16", bodySilhouette: "figure-support-matrix", title: "决定性证据（待填充）", claimIds: [], visualIds: [], narrativeUnitId: "narrative-result", visualPlan: { coreClaim: "真实主证据与解释边界共同支撑结论", evidenceKinds: ["scientific-evidence", "data-evidence"], availableVisualIds: [], visualCenter: "dominant-scientific-figure", primaryVisualIds: [], evidenceWeight: {}, preserveWholeFigure: true, extractableSubfigures: [], needsZoom: false, mergeOrBackupIds: [], omissionReasons: [] } },
    ];
const manifest = {
  title: "科研汇报（结构占位，不含研究事实）",
  branding,
  scaffoldPlaceholder: true,
  profile,
  outputMode,
  outputFormVersion: 1,
  visualStyle: requestedVisualStyle,
  ...(requestedVisualStyle === "academic-light" ? { designSystemVersion: 2 } : {}),
  compositionProfile: requestedCompositionProfile,
  stage: "prototype",
  prototypeApproval: { status: "pending", reviewedPrototypeIds: [], reviewEvidence: [] },
  qualityContractVersion: 1,
  newProject: true,
  requestedCapabilities: { authoring: authoring ? "required" : "disabled" },
  ...(dataset ? { datasetSemanticVersion: 3, analysisMode: "dataset-portrait", primaryQuestion: "由真实数据和任务合同确定" } : {}),
  evidenceRegistry: "evidence-visuals.json",
  citationRegistry: "citations.json",
  ...(scroll ? { sections: units } : { slides: units }),
  ...(general ? { reportContent: "report-content.json", reportPresentation: { toolbar: true, copyDepth: "compact" } } : {}),
  authoring: authoring ? { enabled: true, mode: "browser-with-local-fallback", registry: "presentation-edit-registry.json" } : { enabled: false },
  ...(mode === "dataset-scroll-report" ? { analysisCompanion: { enabled: analysisCompanion, ...(analysisCompanion ? { mode: "deterministic", projectId: `research-${mode}-scaffold`, ...(companionModelApi ? { llm: { enabled: true, apiPath: "/api/research-assistant" } } : {}) } : {}) } } : {}),
  ...(mode === "dataset-scroll-report" ? { dataHealth: { enabled: dataHealth, ...(dataHealth ? { report: "data-health.json" } : {}) } } : {}),
  ...(mode === "dataset-scroll-report" ? { analysisFlow: { enabled: analysisFlow, ...(analysisFlow ? { projectId: `research-${mode}-scaffold`, initialGraph: "analysis-flow.json" } : {}) } } : {}),
};
const evidence = { claims: [], datasets: [], transforms: [], analyses: [], narrativeUnits: [], visuals: [], ...(analysisCompanion ? { analysisCompanion: { measures: [], questions: [], ...(companionModelApi ? { toolPolicy: { allowedOperations: [], measureIds: [], analysisIds: [], maxGroups: 6, maxPeriods: 25 } } : {}) } } : {}) };
const citations = { citations: [] };
const visualReview = scroll
  ? { sections: units.map((unit) => ({ sectionId: unit.id, compositionReviewed: false, detailReviewed: false, densityStatus: "pending", titleStatus: "pending", plotOccupancyStatus: "pending", evidenceWeightStatus: "pending", overflowStatus: "pending", silhouetteStatus: "pending", reviewerNotes: "等待真实内容与浏览器测量；complete 阶段需逐节完成复核。", metrics: {} })) }
  : { slides: units.map((unit) => ({ slideId: unit.id, bodySilhouette: unit.bodySilhouette, compositionReviewed: false, detailReviewed: false, densityStatus: "pending", titleStatus: "pending", plotOccupancyStatus: "pending", evidenceWeightStatus: "pending", overflowStatus: "pending", silhouetteStatus: "pending", reviewerNotes: "等待真实内容与浏览器测量；complete 阶段需逐页完成复核。", metrics: {} })) };

await copyTree(path.join(templateRoot, "common"), root);
await copyTree(path.join(templateRoot, general ? "general-report" : scroll ? "report" : "deck"), root);
if (general) await writeFile(path.join(root, "report-content.json"), JSON.stringify({ summary: "填写材料、工作范围和当前重点；不要复制完整讲稿。", overview: [], sections: { hero: { blocks: [] }, work: { lead: "从真实材料选择必要的工作、观点或对照。", blocks: [{ id: "content", type: "text", text: "待填充真实内容。" }] }, method: { lead: "按需要使用流程、对照、案例或交互示意，不强制统计结果。", blocks: [{ id: "method", type: "text", text: "待填充真实方法或实例。" }] } } }, null, 2)+"\n");
await Promise.all([mkdir(path.join(root, "public"), { recursive: true }), mkdir(path.join(root, "scripts"), { recursive: true })]);
if (branding.profile === "zuel") await copyFile(path.join(skillRoot, "assets", "branding", "zuel-logo.png"), path.join(root, "public", "zuel-logo.png"));
// User-confirmed display typography belongs only to new 16:9 technology decks.
if (!scroll && requestedVisualStyle === "tech-engineering-dark") {
  await mkdir(path.join(root, "public", "fonts"), { recursive: true });
  const typographyRoot = path.join(skillRoot, "assets", "typography");
  const fontSource = requestedDisplayFont
    ? path.resolve(requestedDisplayFont)
    : path.join(typographyRoot, "shangwei-full.woff");
  let fontAvailable = false;
  try { fontAvailable = (await stat(fontSource)).isFile(); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  if (requestedDisplayFont && (!fontAvailable || path.extname(fontSource).toLowerCase() !== ".woff")) {
    throw new Error("--display-font / RESEARCH_HTML_PRESENTATION_FONT must point to an existing licensed .woff file");
  }
  if (fontAvailable) await copyFile(fontSource, path.join(root, "public", "fonts", "shangwei-full.woff"));
  await copyFile(path.join(typographyRoot, "PosterTitle.tsx"), path.join(root, "src", "PosterTitle.tsx"));
  const titleCss = await readFile(path.join(typographyRoot, "poster-title.css"), "utf8");
  await writeFile(path.join(root, "src", "poster-title.css"), fontAvailable
    ? titleCss
    : titleCss.replace(/@font-face\s*\{[^}]*\}/g, ""), "utf8");
}
if (companionModelApi) for (const name of ["research-companion-core.mjs", "research-companion-server.mjs"]) await copyFile(path.join(skillRoot, "scripts", name), path.join(root, "scripts", name));
if (mode === "dataset-scroll-report") await writeFile(path.join(root, "analysis-flow.json"), JSON.stringify({ schemaVersion: 1, generatedFrom: {}, nodes: [], edges: [] }, null, 2) + "\n", "utf8");

if (mode === "dataset-scroll-report") await writeFile(path.join(root, "data-health.json"), JSON.stringify({schemaVersion:1,status:"pending",title:"数据体检",summary:{records:null,duplicateExtraRecords:null,duplicateKeyGroups:null,incompleteKeyRecords:null},fields:[],coverage:[],anomalies:[],usage:[],limitations:[]}, null, 2)+"\n");
if (dataHealth) await copyFile(path.join(skillRoot,"scripts","build_data_health.mjs"),path.join(root,"scripts","build-data-health.mjs"));

const deckRuntimeFiles = [
  "portable-state.ts", "DeckRuntime.tsx", "PresenterView.tsx", "SlidePrimitives.tsx", "EvidenceVisualizationTypes.ts", "CitationTypes.ts", "FlowDiagram.tsx", "overflowAudit.ts",
  "presentation-core.css", "layout-recipes.css", "presenter-view.css", "print-export.css",
  "evidence-visualization.css", "visual-style.ts", "visual-styles/tech-engineering-dark.css",
];
const reportRuntimeFiles = [
  "portable-state.ts", "presentation-core.css", "evidence-visualization.css", "visual-style.ts", "visual-styles/tech-engineering-dark.css",
  "report-runtime/health-highlights.ts", "report-runtime/analysis-flow-transfer.ts", "report-runtime/ReportRuntime.tsx", "report-runtime/ReportNavigation.tsx", "report-runtime/ReportHeader.tsx",
  "report-runtime/ReportSection.tsx", "report-runtime/ReportHero.tsx", "report-runtime/ReportSynthesis.tsx",
  "report-runtime/ReportClosing.tsx", "report-runtime/index.ts", "report-runtime/ReportModules.tsx", "report-runtime/ReportToolbar.tsx", "report-styles/general-report.css",
  "report-runtime/AnalysisCompanion.tsx", "report-runtime/analysis-companion.ts", "report-runtime/companion-exploration.ts",
  "report-runtime/AnalysisFlow.tsx", "report-runtime/DataHealth.tsx", "report-styles/data-health.css",
  "report-styles/report-core.css", "report-styles/report-navigation.css", "report-styles/report-print.css", "report-styles/analysis-companion.css", "report-styles/analysis-flow.css",
];
for (const relative of ["branding.ts", "BrandMark.tsx"]) await copyRuntimeFile(relative);
for (const relative of scroll ? reportRuntimeFiles : deckRuntimeFiles) await copyRuntimeFile(relative);
if (dataset || scientificCharts) {
  for (const directory of ["dataset-charts", "chart-adapters", "chart-interaction"])
    await copyTree(path.join(runtimeRoot, directory), path.join(root, "src", "runtime", directory));
  for (const relative of ["EvidenceVisualizationTypes.ts", "CitationTypes.ts", "StructuredEvidenceChart.tsx", "ScientificEvidenceFigure.tsx"]) await copyRuntimeFile(relative);
}

if (authoring) {
  await copyTree(path.join(templateRoot, "authoring"), root);
  await copyTree(path.join(runtimeRoot, "editor"), path.join(root, "src", "runtime", "editor"));
  await copyFile(path.join(skillRoot, "scripts", "presentation_editor_local_server.mjs"), path.join(root, "scripts", "presentation_editor_local_server.mjs"));
  await copyFile(path.join(skillRoot, "scripts", "validate_edit_patch.mjs"), path.join(root, "scripts", "validate_edit_patch.mjs"));
  const baseValue = units[0].title;
  const expectedValueHash = `sha256:${createHash("sha256").update(baseValue).digest("hex")}`;
  const baseFingerprint = `sha256:${createHash("sha256").update(JSON.stringify({ mode, units })).digest("hex")}`;
  const registry = {
     schemaVersion: "2.0",
    projectId: general ? `research-${mode}-${createHash("sha256").update(root).digest("hex").slice(0,12)}` : `research-${mode}-scaffold`,
    outputMode,
    baseFingerprint,
    fields: [{
      editId: scroll ? "hero.title" : "cover.title",
      targetId: units[0].id,
      field: "title",
      scope: outputMode,
      strategy: "plain-copy",
      baseValue,
      expectedValueHash,
      resize: scroll
        ? { mode: "report", minWidth: 320, maxWidth: 1120, minHeight: 48, maxMinHeight: 360, snap: 8 }
        : { mode: "slide", minWidth: 480, maxWidth: 1320, minHeight: 64, maxMinHeight: 300, snap: 8 },
    }],
  };
  await writeFile(path.join(root, "presentation-edit-registry.json"), `${JSON.stringify(registry, null, 2)}\n`, "utf8");
}

const packageJson = {
  name: `research-${mode}-prototype`, private: true, version: "0.0.0", type: "module",
  scripts: {
    dev: authoring ? "vite --mode authoring --host 127.0.0.1" : "vite --host 127.0.0.1",
    ...(authoring ? { author: "vite --mode authoring --host 127.0.0.1", "dev:readonly": "vite --host 127.0.0.1" } : {}),
    build: "tsc --noEmit && vite build",
    preview: "vite preview --host 127.0.0.1",
    ...(scroll ? { "export:offline": "node scripts/export-offline-report.mjs ." } : {}),
    ...(dataHealth ? { "data:health": "node scripts/build-data-health.mjs ." } : {}),
    ...(companionModelApi ? { "preview:companion": "node scripts/research-companion-server.mjs" } : {}),
    verify: "npm run build && node scripts/run-skill-verifier.mjs --runtime",
    "verify:render": "npm run build && node scripts/run-skill-verifier.mjs --runtime --render",
  },
  dependencies: { react: "^18.3.1", "react-dom": "^18.3.1", ...(dataset || scientificCharts ? { echarts: "^6.1.0" } : {}) },
  devDependencies: { "@types/node": "^22.10.2", "@types/react": "^18.3.12", "@types/react-dom": "^18.3.1", "@vitejs/plugin-react": "^4.3.4", typescript: "^5.7.2", vite: "^5.4.14" },
};

const authoringImport = authoring ? 'import { presentationEditorPlugin } from "./scripts/editor-vite-plugin.mjs";\n' : "";
const authoringPlugin = authoring ? "...(authoringServer ? [presentationEditorPlugin({ projectRoot })] : []), " : "";
// The boundary is part of the ordinary browser build. Only the filesystem
// save plugin is development-only; static/file:// delivery uses its local
// browser Patch adapter instead of silently removing the Edit button.
const authoringTarget = authoring ? '"src/AuthoringBoundary.tsx"' : '"src/NoAuthoringBoundary.tsx"';
const viteConfig = `import { fileURLToPath } from "node:url";\nimport path from "node:path";\nimport react from "@vitejs/plugin-react";\nimport { defineConfig } from "vite";\n${authoringImport}\nconst projectRoot = fileURLToPath(new URL(".", import.meta.url));\nexport default defineConfig(({ mode }) => {\n  const authoringServer = mode === "authoring";\n  return {\n    root: projectRoot,\n    base: "./",\n    plugins: [${authoringPlugin}react()],\n    resolve: { alias: { "@authoring-boundary": path.resolve(projectRoot, ${authoringTarget}) } },\n    build: { outDir: "dist", emptyOutDir: true },\n    server: { host: "127.0.0.1" },\n    preview: { host: "127.0.0.1" },\n  };\n});\n`;

if (scroll) await copyFile(path.join(skillRoot, "scripts", "export_offline_report.mjs"), path.join(root, "scripts", "export-offline-report.mjs"));
const embeddedSkillRoot = JSON.stringify(skillRoot);
const verifierWrapper = `#!/usr/bin/env node\nimport { access } from "node:fs/promises";\nimport { spawnSync } from "node:child_process";\nimport path from "node:path";\nimport process from "node:process";\nimport { fileURLToPath } from "node:url";\n\nconst projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");\nconst skillRoot = path.resolve(process.env.RESEARCH_HTML_PRESENTATION_SKILL_DIR || ${embeddedSkillRoot});\nconst verifier = path.join(skillRoot, "scripts", "verify_project.mjs");\ntry { await access(verifier); } catch { console.error("Cannot locate research-html-presentation. Set RESEARCH_HTML_PRESENTATION_SKILL_DIR to the installed skill directory."); process.exit(2); }\nconst child = spawnSync(process.execPath, [verifier, projectRoot, ...process.argv.slice(2)], { cwd: projectRoot, stdio: "inherit", env: process.env });\nif (child.error) { console.error(child.error.message); process.exit(2); }\nprocess.exit(child.status ?? 1);\n`;

await Promise.all([
  writeFile(path.join(root, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`, "utf8"),
  // pnpm 11 reads lifecycle-build approvals from pnpm-workspace.yaml.  Vite
  // needs only esbuild's official platform binary; other lifecycle scripts
  // remain unapproved.
  writeFile(path.join(root, "pnpm-workspace.yaml"), "allowBuilds:\n  esbuild: true\n", "utf8"),
  writeFile(path.join(root, "vite.config.ts"), viteConfig, "utf8"),
  writeFile(path.join(root, "deck-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8"),
  writeFile(path.join(root, "evidence-visuals.json"), `${JSON.stringify(evidence, null, 2)}\n`, "utf8"),
  writeFile(path.join(root, "citations.json"), `${JSON.stringify(citations, null, 2)}\n`, "utf8"),
  writeFile(path.join(root, "visual-review.json"), `${JSON.stringify(visualReview, null, 2)}\n`, "utf8"),
  writeFile(path.join(root, "scripts", "run-skill-verifier.mjs"), verifierWrapper, "utf8"),
]);

console.log(JSON.stringify({ created: root, mode, branding: branding.profile, outputMode, datasetSemanticVersion: manifest.datasetSemanticVersion, runtime: scroll ? "ReportRuntime" : "DeckRuntime", authoring: authoring ? "enabled-browser-with-local-fallback" : "disabled", analysisCompanion: analysisCompanion ? "enabled" : "disabled", analysisFlow: analysisFlow ? "enabled" : "disabled", dataHealth: dataHealth ? "enabled" : "disabled", next: ["install dependencies", "npm run build", "npm run verify"] }, null, 2));
