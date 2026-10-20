#!/usr/bin/env node

import { access, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { withDeckPage } from "./browser_helpers.mjs";
import { readAndValidateEditPatch, REGISTRY_FILENAME } from "./validate_edit_patch.mjs";

const root = path.resolve(process.argv[2] ?? process.cwd());
const manifestPath = path.join(root, "deck-manifest.json");
const failures = [], warnings = [], checks = [];
let manifest;
try { manifest = JSON.parse(await readFile(manifestPath, "utf8")); }
catch { console.error("[editor-runtime-validator] cannot read deck-manifest.json"); process.exit(2); }

const exists = (file) => access(file).then(() => true).catch(() => false);
const authoring = Boolean(manifest.authoring?.enabled);
const capabilityRequired = manifest.requestedCapabilities?.authoring === "required";
if (!authoring) {
  console.log(JSON.stringify({ project: root, authoring: false, passed: true, skipped: true, reason: "Authoring Layer is disabled" }, null, 2));
  process.exit(0);
}

const registryPath = path.resolve(root, manifest.authoring?.registry ?? REGISTRY_FILENAME);
if (!registryPath.startsWith(`${root}${path.sep}`) && registryPath !== path.join(root, REGISTRY_FILENAME)) failures.push("authoring registry must stay inside project root");
let registry;
try { registry = JSON.parse(await readFile(registryPath, "utf8")); }
catch { failures.push(`cannot read ${path.basename(registryPath)}`); }
if (registry) {
  if (registry.outputMode !== (manifest.outputMode ?? "slide-deck")) failures.push("editor Registry outputMode must match manifest");
  const fields = Array.isArray(registry.fields) ? registry.fields : [];
  if (!fields.length) failures.push("Authoring Layer requires auto-generated stable targets");
  if (!fields.some((field) => field.kind === "image")) warnings.push("Registry has no image target; verify the project contains no ordinary content image");
  const editIds = new Set(); const targetFields = new Set();
  for (const field of fields) {
    if (!field.editId || !field.targetId || !field.field) failures.push("every auto target needs editId, targetId, and field role");
    if (editIds.has(field.editId)) failures.push(`Registry contains duplicate editId '${field.editId}'`); else editIds.add(field.editId);
    const targetField = `${field.targetId}::${field.field}`;
    if (targetFields.has(targetField)) failures.push(`Registry contains duplicate targetId + field '${targetField}'`); else targetFields.add(targetField);
    if (field.selector && /:(?:nth|first|last|only)-|[>+~]/.test(field.selector)) failures.push(`target '${field.editId}' uses a fragile DOM-order selector`);
    if (manifest.stage === "complete" && /\bTODO\b|待真实|占位/i.test(typeof field.baseValue === "string" ? field.baseValue : JSON.stringify(field.baseValue))) failures.push(`complete Registry target '${field.editId}' still contains scaffold placeholder content`);
    if (field.strategy === "locked") checks.push(`lock target: ${field.editId}`);
  }
}

const patch = path.join(root, "presentation-edit-patch.json");
if (await exists(patch)) {
  try {
    const report = await readAndValidateEditPatch(root, patch, registryPath, { release: false });
    if (!report.passed) failures.push(...report.failures.map((failure) => `patch: ${failure}`));
    if (report.needsEvidenceReview) warnings.push("evidence-sensitive Patch is correctly non-release until revalidated");
  } catch (error) { failures.push(error instanceof Error ? error.message : String(error)); }
}

const sourceFiles = [
  path.join(root, "src", "runtime", "editor", "EditorShell.tsx"),
  path.join(root, "src", "runtime", "editor", "AutoEditRegistry.ts"),
  path.join(root, "src", "runtime", "editor", "EditStorageAdapter.ts"),
  path.join(root, "src", "AuthoringBoundary.tsx"),
];
for (const file of sourceFiles) if (!await exists(file)) failures.push(`authoring build is missing ${path.relative(root, file)}`);
const sourceContracts = [
  [path.join(root, "src", "runtime", "editor", "EditorShell.tsx"), "event.key.toLowerCase() === \"e\"", "E keyboard toggle"],
  [path.join(root, "src", "runtime", "editor", "EditorShell.tsx"), "storage.save", "Save persistence"],
  [path.join(root, "src", "runtime", "editor", "EditorShell.tsx"), "const undo", "Undo"],
  [path.join(root, "src", "runtime", "editor", "EditorShell.tsx"), "const redo", "Redo"],
  [path.join(root, "src", "runtime", "editor", "EditorShell.tsx"), "const resetAll", "Reset"],
  [path.join(root, "src", "runtime", "editor", "EditStorageAdapter.ts"), "/patch", "Reload endpoint"],
  [path.join(root, "src", "AuthoringBoundary.tsx"), "createLocalProjectAdapter", "local project adapter"],
];
for (const [file, token, name] of sourceContracts) {
  if (!await exists(file)) continue;
  const source = await readFile(file, "utf8");
  if (!source.includes(token)) failures.push(`authoring runtime is missing ${name}`);
}

async function startAuthoringServer() {
  const packagePath = path.join(root, "package.json");
  const viteCli = path.join(root, "node_modules", "vite", "bin", "vite.js");
  if (!await exists(packagePath) || !await exists(viteCli)) return null;
  let packageDocument;
  try { packageDocument = JSON.parse(await readFile(packagePath, "utf8")); } catch { return null; }
  if (!packageDocument.scripts?.author) return null;
  const port = 43800 + (process.pid % 700);
  const output = [];
  const child = spawn(process.execPath, [viteCli, "--mode", "authoring", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  child.stdout?.on("data", (chunk) => output.push(String(chunk)));
  child.stderr?.on("data", (chunk) => output.push(String(chunk)));
  const url = `http://127.0.0.1:${port}/`;
  try {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      if (child.exitCode !== null) throw new Error(output.join("").trim() || `Authoring server exited with code ${child.exitCode}`);
      try { const response = await fetch(url); if (response.ok) return { child, url }; } catch {}
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(output.join("").trim() || "Authoring server did not become ready");
  } catch (error) {
    child.kill();
    throw error;
  }
}

async function runAuthoringBehaviorTest() {
  const patchPath = path.join(root, "presentation-edit-patch.json");
  let backup = null;
  let hadPatch = false;
  try { backup = await readFile(patchPath, "utf8"); hadPatch = true; } catch {}
  let server;
  let authoringServerUnavailable = "";
  try {
    try {
      server = await startAuthoringServer();
    } catch (error) {
      // Some managed Windows sandboxes deny Vite's esbuild config-loader from
      // traversing pnpm's ../../.. symlink. The built deck still contains the
      // complete Authoring Layer, so exercise the same behavior through the
      // static delivery path and its browser-local persistence fallback.
      authoringServerUnavailable = error instanceof Error ? error.message : String(error);
      server = null;
    }
    const authoringTarget = server?.url ?? root;
    await withDeckPage(authoringTarget, async ({ page, baseUrl }) => {
      await page.goto(server?.url ?? baseUrl, { waitUntil: "domcontentloaded" });
      const rootLocator = page.locator("[data-editor-authoring='true']");
      await rootLocator.waitFor({ state: "attached", timeout: 10000 });
      await page.waitForTimeout(500);
      const toggle = page.locator("[data-editor-toggle='true']");
      if (await toggle.count() !== 1 || !await toggle.isVisible()) throw new Error("compact 编辑 E entry is not visible on initial load");
      if (await page.locator("[data-editor-panel='true']").count() !== 0) throw new Error("full EditorShell is not collapsed on initial load");
      const sameToolbarRow = await toggle.evaluate((element) => Boolean(element.parentElement?.matches("[data-runtime-controls='true']")));
      if ((manifest.outputMode ?? "slide-deck") === "slide-deck" && !sameToolbarRow) throw new Error("编辑 E is not in the deck runtime control row");
      const frameBefore = await page.locator(".deck-frame").count() ? await page.locator(".deck-frame").evaluate((element) => { const rect = element.getBoundingClientRect(); return { width: rect.width, height: rect.height }; }) : null;

      await toggle.click();
      await page.locator("[data-editor-panel='true']").waitFor({ state: "visible", timeout: 5000 });
      if (frameBefore) {
        const frameAfter = await page.locator(".deck-frame").evaluate((element) => { const rect = element.getBoundingClientRect(); return { width: rect.width, height: rect.height }; });
        if (frameAfter.width !== frameBefore.width || frameAfter.height !== frameBefore.height) throw new Error("opening Authoring changed the 16:9 canvas size");
      }
      await toggle.click();
      if (await page.locator("[data-editor-panel='true']").count() !== 0) throw new Error("EditorShell did not collapse after clicking E");
      await toggle.click();
      await page.locator("[data-editor-panel='true']").waitFor({ state: "visible", timeout: 5000 });
      await page.waitForTimeout(1000);

      const coverage = await page.locator("[data-editor-authoring='true']").evaluate((editorRoot) => {
        const textSelector = "h1,h2,h3,h4,h5,h6,p,li,blockquote,dt,dd,td,th,figcaption,span,strong,em,b,small,kbd,caption,cite,code,sup,sub,mark,label,a,time,svg text";
        const nonAudienceTextTags = new Set(["script", "style", "template", "noscript", "title", "option", "textarea", "select", "input", "datalist", "canvas"]);
        const candidates = [...document.querySelectorAll("*")].filter((element) => {
          const tag = element.tagName.toLowerCase();
          if (!(element.textContent ?? "").trim()) return false;
          if (nonAudienceTextTags.has(tag)) return false;
          if (!element.matches(textSelector) && element.children.length !== 0) return false;
          if (!element.closest(".slide,[data-report-section],.report-hero,.report-closing")) return false;
          if (element.closest("[data-editor-panel],[data-runtime-controls],[data-report-navigation]")) return false;
          // Chart SVG labels, evidence internals, and official brand surfaces are
          // intentionally locked by the Authoring contract. They remain visible
          // evidence, but are not ordinary audience-copy editing targets.
          if (element.closest("[data-evidence-chart-internals],[data-editor-lock='true'],[data-brand-role],[data-brand-audit]")) return false;
          if (element.closest("[hidden]")) return false;
          const hidden = element.closest("[aria-hidden='true']");
          const slide = element.closest("[data-slide-id]");
          return !hidden || Boolean(slide && hidden === slide);
        });
        const uncovered = candidates.filter((element) => !element.closest("[data-edit-id]"));
        const wronglyLocked = candidates.filter((element) => element.closest("[data-editor-lock='true'],[data-runtime-controls],[data-runtime-control],[data-report-navigation]") && !element.closest("[data-brand-role],[data-brand-audit]"));
        const allIds = [...editorRoot.querySelectorAll("[data-edit-id]")].map((element) => element.getAttribute("data-edit-id")).filter(Boolean);
        return {
          candidates: candidates.length,
          uncovered: uncovered.length,
          wronglyLocked: wronglyLocked.length,
          targetCount: allIds.length,
          fieldCount: Number(editorRoot.getAttribute("data-editor-registry-field-count") ?? 0),
         duplicateRegistryIds: Number(editorRoot.getAttribute("data-editor-registry-duplicate-count") ?? -1),
           registrySyncError: editorRoot.getAttribute("data-editor-registry-sync-error") || "",
           duplicateTargetFields: (() => { const keys = new Set(); let count = 0; for (const element of editorRoot.querySelectorAll("[data-edit-id]")) { const key = `${element.getAttribute("data-edit-target-id")}::${element.getAttribute("data-edit-field")}`; if (keys.has(key)) count += 1; keys.add(key); } return count; })(),
           placeholderText: candidates.filter((element) => /\bTODO\b|待真实|占位/i.test(element.textContent ?? "")).length,
           ids: allIds,
          textTargets: candidates.map((element) => ({ tag: element.tagName.toLowerCase(), index: [...document.querySelectorAll("[data-edit-id]")].indexOf(element), id: element.getAttribute("data-edit-id"), slide: element.closest("[data-slide-id]")?.getAttribute("data-slide-id") ?? element.closest("[data-report-section]")?.getAttribute("data-report-section") ?? "" })),
        };
      });
      if (!coverage.candidates || coverage.uncovered !== 0) throw new Error(`visible text coverage failed: ${coverage.uncovered} uncovered of ${coverage.candidates}`);
      if (coverage.wronglyLocked !== 0) throw new Error(`ordinary visible text remains incorrectly locked: ${coverage.wronglyLocked}`);
      if (!coverage.fieldCount || coverage.duplicateRegistryIds !== 0) throw new Error("registry field coverage or duplicate-ID check failed");
      if (coverage.registrySyncError) throw new Error(`registry synchronization failed: ${coverage.registrySyncError}`);
      if (coverage.duplicateTargetFields !== 0) throw new Error(`DOM targetId + field pairs are duplicated: ${coverage.duplicateTargetFields}`);
      if (manifest.stage === "complete" && coverage.placeholderText) throw new Error(`complete page still contains ${coverage.placeholderText} scaffold placeholder text node(s)`);
      if (coverage.ids.length !== new Set(coverage.ids).size) throw new Error("DOM edit target IDs are duplicated");
      await page.waitForTimeout(1000);
      const initialIds = coverage.ids;
      const textTargets = coverage.textTargets.filter((item) => item.index >= 0);
      const targetFor = (editId) => page.locator(`[data-edit-id="${editId}"]`).first();
      const slideOrder = (manifest.outputMode ?? "slide-deck") === "slide-deck"
        ? await page.locator(".slide").evaluateAll((elements) => elements.map((element) => element.getAttribute("data-slide-id") ?? ""))
        : [];
      for (const target of textTargets) {
        if (slideOrder.length && target.slide) {
          const slideIndex = slideOrder.indexOf(target.slide);
          if (slideIndex >= 0) {
            await page.evaluate((index) => { window.location.hash = `#/${index + 1}`; }, slideIndex);
            await page.waitForFunction((slideId) => document.querySelector(".slide.is-active")?.getAttribute("data-slide-id") === slideId, target.slide, { timeout: 5000 });
          }
        }
        const locator = targetFor(target.id);
        await locator.waitFor({ state: "attached", timeout: 5000 });
        if ((manifest.outputMode ?? "slide-deck") === "scroll-report") {
          // Tabs, cases and details retain stable targets while hidden. Reveal
          // their real controls before testing editability instead of treating
          // intentionally folded content as a missing or locked field.
          await locator.evaluate(element => {
            const ancestors=[];for(let node=element.parentElement;node;node=node.parentElement)ancestors.unshift(node);
            for(const node of ancestors){
              if(node.tagName==="DETAILS" && !node.open)node.open=true;
              if(node.hidden && node.id){const control=[...document.querySelectorAll("[aria-controls]")].find(button=>button.getAttribute("aria-controls")===node.id);if(control instanceof HTMLElement)control.click();}
            }
          });
          await page.waitForTimeout(80);
        }
        await locator.scrollIntoViewIfNeeded();
        // Full-page coverage is structural: every ordinary text target must be
        // bound as editable. A separate cover/body interaction below exercises
        // actual focus and mutation; clicking all 500+ targets would let the
        // floating inspector intercept lower-slide coordinates.
        let directEditable = await locator.evaluate((element) => element instanceof HTMLElement && element.isContentEditable);
        let inspectorVisible = await page.locator("[data-editor-text-input='true']").isVisible().catch(() => false);
        if (!directEditable && !inspectorVisible) {
          // DeckRuntime and the Authoring MutationObserver settle on the next
          // frame after a hash navigation. Give the target one bounded retry
          // before treating a genuinely locked/missing target as a failure.
          await page.waitForFunction((editId) => {
            const element = [...document.querySelectorAll("[data-edit-id]")].find((candidate) => candidate.getAttribute("data-edit-id") === editId);
            return Boolean(element && element instanceof HTMLElement && element.isContentEditable);
          }, target.id, { timeout: 3000 }).catch(() => undefined);
          directEditable = await locator.evaluate((element) => element instanceof HTMLElement && element.isContentEditable).catch(() => false);
          inspectorVisible = await page.locator("[data-editor-text-input='true']").isVisible().catch(() => false);
        }
        if (!directEditable && !inspectorVisible) throw new Error(`visible text target is not editable: ${target.id}`);
      }
      const coverTarget = textTargets.find((item) => item.tag === "h1") ?? textTargets[0];
      const bodyTarget = textTargets.find((item) => item.tag === "p" && item.id !== coverTarget?.id) ?? textTargets.find((item) => item.id !== coverTarget?.id);
      if (!coverTarget || !bodyTarget) throw new Error("real-page regression could not find cover and ordinary text targets");

      if (slideOrder.length && coverTarget.slide) {
        const coverIndex = slideOrder.indexOf(coverTarget.slide);
        if (coverIndex >= 0) {
          await page.evaluate((index) => { window.location.hash = `#/${index + 1}`; }, coverIndex);
          await page.waitForFunction((slideId) => document.querySelector(".slide.is-active")?.getAttribute("data-slide-id") === slideId, coverTarget.slide, { timeout: 5000 });
        }
      }
      const cover = targetFor(coverTarget.id);
      await cover.click();
      await page.waitForTimeout(100);
      await cover.fill("Authoring regression cover · 可直接保存 E · 错误结论 999%");
      const coverAfterFill = await cover.textContent();
      if (!coverAfterFill?.includes("Authoring regression cover")) throw new Error(`contenteditable fill did not change cover text (target ${coverTarget.id}; count ${await page.locator(`[data-edit-id="${coverTarget.id}"]`).count()}; tag ${await cover.evaluate((element) => element.tagName)}; contenteditable ${await cover.getAttribute("contenteditable")}; got: ${coverAfterFill})`);
      const activeBeforeE = await rootLocator.getAttribute("data-editor-active");
      await page.keyboard.press("E");
      if (await rootLocator.getAttribute("data-editor-active") !== activeBeforeE) throw new Error("typing E in editable text toggled Authoring state");
      await page.locator("[data-editor-action='save']").click();
      await page.getByRole("status").filter({ hasText: /原子写入|已保存/ }).waitFor({ state: "visible", timeout: 10000 });

      const body = targetFor(bodyTarget.id);
      await body.click();
      await body.fill("Authoring regression body · 可保存的任意测试文字：明显错误、999%、中文标点「」【】—…");
      const bodyAfterFill = await body.textContent();
      if (!bodyAfterFill?.includes("Authoring regression body")) throw new Error(`contenteditable fill did not change body text (got: ${bodyAfterFill})`);
      await page.keyboard.press("Control+S");
      await page.getByRole("status").filter({ hasText: /原子写入|已保存/ }).waitFor({ state: "visible", timeout: 10000 });
      const savedBeforeReload = await body.textContent();
      const diskPatch = await page.evaluate(async () => {
        const response = await fetch(`/presentation-edit-patch.json?authoring-regression=${Date.now()}`, { cache: "no-store" });
        return { status: response.status, body: await response.text() };
      });
      const diskSummary = (() => { try { const parsed = JSON.parse(diskPatch.body); return (parsed.operations ?? []).map((operation) => ({ targetId: operation.targetId, field: operation.field, value: operation.value })); } catch { return diskPatch.body.slice(0, 800); } })();
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.locator("[data-editor-authoring='true']").waitFor({ state: "attached", timeout: 10000 });
      await page.waitForTimeout(500);
      const reloadedIds = await page.locator("[data-edit-id]").evaluateAll((elements) => elements.map((element) => element.getAttribute("data-edit-id")));
      if (JSON.stringify(reloadedIds) !== JSON.stringify(initialIds)) throw new Error("stable edit IDs changed after reload");
      const reloadedState = await page.locator("[data-editor-authoring='true']").evaluate((element) => ({ operationCount: element.getAttribute("data-editor-operation-count"), notice: element.querySelector("[role='status']")?.textContent }));
      await page.locator("[data-editor-toggle='true']").click();
      await page.locator("[data-editor-panel='true']").waitFor({ state: "visible", timeout: 5000 });
      await page.waitForTimeout(1000);
      const panelNotice = await page.locator("[data-editor-panel='true']").textContent();
      if (!(await targetFor(coverTarget.id).textContent())?.includes("Authoring regression cover") || !(await targetFor(bodyTarget.id).textContent())?.includes("Authoring regression body")) throw new Error(`saved text did not persist after reload (body target ${bodyTarget.id}, body before reload: ${savedBeforeReload}; disk operations: ${JSON.stringify(diskSummary)}; reloaded state: ${JSON.stringify(reloadedState)}; panel: ${panelNotice})`);

      const undoTarget = targetFor(bodyTarget.id);
      await undoTarget.click();
      await undoTarget.fill("Undo redo regression text");
      const undoFilled = await undoTarget.textContent();
      if (!undoFilled?.includes("Undo redo regression text")) throw new Error(`contenteditable fill did not change text before undo (got: ${undoFilled})`);
      await page.locator("[data-editor-panel='true'] button").filter({ hasText: "撤销" }).click();
      const afterUndo = await undoTarget.textContent();
      await page.locator("[data-editor-panel='true'] button").filter({ hasText: "重做" }).click();
      const afterRedo = await undoTarget.textContent();
      if (!afterRedo?.includes("Undo redo regression text")) throw new Error(`redo did not restore the edited text (after undo: ${afterUndo}; after redo: ${afterRedo}; operations: ${await rootLocator.getAttribute("data-editor-operation-count")})`);
      const dialogHandler = (dialog) => dialog.accept();
      page.on("dialog", dialogHandler);
      await page.locator("[data-editor-panel='true'] button").filter({ hasText: "全部恢复" }).click();
      await page.locator("[data-editor-action='save']").click();
      await page.getByRole("status").filter({ hasText: /原子写入|已保存/ }).waitFor({ state: "visible", timeout: 10000 });
      page.off("dialog", dialogHandler);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.locator("[data-editor-authoring='true']").waitFor({ state: "attached", timeout: 10000 });
      if ((await targetFor(bodyTarget.id).textContent())?.includes("Undo redo regression text")) throw new Error("reset and resave did not restore base content");
      checks.push(authoringServerUnavailable
        ? "Authoring behavior: static built delivery fallback (Vite authoring server unavailable in managed sandbox), E toggle, full text scan, browser-local save/reload, undo/redo/reset/resave"
        : "real Authoring page: E toggle, full text reverse scan, focused save/reload, undo/redo/reset/resave");
    });
    return null;
  } finally {
    if (server?.child) server.child.kill();
    if (hadPatch) await writeFile(patchPath, backup, "utf8"); else await unlink(patchPath).catch(() => undefined);
  }
}

async function walkBuild(directory, result = []) {
  if (!await exists(directory)) return result;
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await walkBuild(file, result);
    else if (/\.(?:html|js|css|mjs)$/.test(entry.name)) result.push(file);
  }
  return result;
}

try {
  const behaviorFailure = await runAuthoringBehaviorTest();
  if (behaviorFailure) (capabilityRequired && manifest.stage === "complete" ? failures : warnings).push(behaviorFailure);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  (capabilityRequired && manifest.stage === "complete" ? failures : warnings).push(`real Authoring behavior check unavailable or failed: ${message}`);
}

const built = await exists(path.join(root, "dist", "index.html")) || await exists(path.join(root, "build", "index.html"));
if (!built) {
  (capabilityRequired && manifest.stage === "complete" ? failures : warnings).push("built output is unavailable; production editor-exclusion browser check was not run");
}
else {
  const buildRoot = await exists(path.join(root, "dist", "index.html")) ? path.join(root, "dist") : path.join(root, "build");
  const buildFiles = await walkBuild(buildRoot);
  const buildSources = await Promise.all(buildFiles.map(async (file) => ({ file, source: await readFile(file, "utf8") })));
  const productionContainsEditorControl = buildSources.some(({ source }) => /data-editor-toggle|presentation-editor-toggle/.test(source));
  // Prototype fixtures may intentionally ship a production build with the
  // authoring boundary stripped.  A complete project that explicitly
  // requires Authoring must still expose the ordinary-delivery control;
  // legacy/prototype fixtures should report the omission as a warning rather
  // than fail the whole compatibility smoke test.
  if (!productionContainsEditorControl) {
    const message = "ordinary production build omits the 编辑 control";
    if (capabilityRequired && manifest.stage === "complete") failures.push(message);
    else warnings.push(`${message}（原型/兼容构建允许；Authoring 仍在 authoring mode 校验）`);
  }
  try {
    await withDeckPage(root, async ({ page, baseUrl }) => {
      await page.goto(baseUrl, { waitUntil: "networkidle" });
      const ordinaryRoot = page.locator("[data-editor-authoring='true']");
      await ordinaryRoot.waitFor({ state: "attached", timeout: 10000 });
      const ordinaryToggle = page.locator("[data-editor-toggle='true']");
      if (await ordinaryToggle.count() !== 1 || !await ordinaryToggle.isVisible()) failures.push("ordinary production/static delivery hides the 编辑 E control");
      if ((manifest.outputMode ?? "slide-deck") === "slide-deck" && !await ordinaryToggle.evaluate((element) => Boolean(element.parentElement?.matches("[data-runtime-controls='true']")))) failures.push("ordinary production 编辑 E is not in the deck control row");
      await ordinaryToggle.click();
      await page.locator("[data-editor-panel='true']").waitFor({ state: "visible", timeout: 5000 });
      const firstTarget = page.locator("[data-edit-id]").first();
      await firstTarget.click({ force: true });
      const firstTargetEditable = await firstTarget.evaluate((element) => element instanceof HTMLElement && element.isContentEditable).catch(() => false);
      if (firstTargetEditable) await firstTarget.fill("静态回归测试：刷新后仍保留");
      else {
        const input = page.locator("[data-editor-text-input='true']");
        await input.fill("静态回归测试：刷新后仍保留");
        await input.blur();
      }
      await page.locator("[data-editor-action='save']").click();
      await page.getByRole("status").filter({ hasText: /当前浏览器|已保存/ }).waitFor({ state: "visible", timeout: 10000 });
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.locator("[data-editor-authoring='true']").waitFor({ state: "attached", timeout: 10000 });
      if (!(await page.locator("[data-edit-id]").first().textContent())?.includes("静态回归测试")) failures.push("static/localStorage Patch did not survive refresh");
      checks.push("ordinary production/static editor visibility and browser-local Save/Reload");
      await page.goto(`${baseUrl}?print=1`, { waitUntil: "networkidle" });
      const printUi = await page.locator("[data-editor-panel], .presentation-editor-shell, [data-editor-authoring='true']").count();
      if (printUi) failures.push("Print output contains Authoring UI");
      await page.goto(`${baseUrl}?presenter=1`, { waitUntil: "networkidle" });
      const presenterUi = await page.locator("[data-editor-panel], .presentation-editor-shell, [data-editor-authoring='true']").count();
      if (presenterUi) failures.push("Presenter output contains Authoring UI");
      checks.push("production/print/presenter editor exclusion");
    });
  } catch (error) { (capabilityRequired && manifest.stage === "complete" ? failures : warnings).push(`browser exclusion check unavailable: ${error instanceof Error ? error.message : String(error)}`); }
}

console.log(JSON.stringify({ project: root, authoring: true, passed: failures.length === 0, failures, warnings, checks }, null, 2));
process.exit(failures.length ? 1 : 0);
