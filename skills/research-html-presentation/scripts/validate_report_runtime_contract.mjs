#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { withDeckPage } from "./browser_helpers.mjs";

const target = process.argv[2] ?? process.cwd();
const manifestPath = path.resolve(process.argv[3] ?? path.join(path.resolve(target), "deck-manifest.json"));
let manifest;
try { manifest = JSON.parse(await readFile(manifestPath, "utf8")); }
catch { console.error(`[report-runtime-validator] cannot read valid manifest JSON: ${manifestPath}`); process.exit(2); }

if (manifest.outputMode !== "scroll-report") {
  console.error("[report-runtime-validator] requires explicit outputMode='scroll-report'; content profile is independent");
  process.exit(2);
}

const sections = Array.isArray(manifest.sections) ? manifest.sections : [];
const expectedVisualStyle = manifest.visualStyle ?? "academic-light";
const failures = [];
const checks = [];
const check = (condition, name, detail = "") => {
  checks.push({ name, passed: Boolean(condition), detail });
  if (!condition) failures.push(detail ? `${name}: ${detail}` : name);
};

try {
  await withDeckPage(target, async ({ page, baseUrl }) => {
    const firstId = sections[0]?.id;
    await page.goto(`${baseUrl}#${firstId}`, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-report-runtime='ReportRuntime']", { timeout: 15000 });
    await page.waitForFunction(() => document.documentElement.dataset.reportReady === "true", undefined, { timeout: 30000 });

    check(await page.locator("[data-report-runtime='ReportRuntime']").getAttribute("data-visual-style") === expectedVisualStyle, "resolved visual style", `${await page.locator("[data-report-runtime='ReportRuntime']").getAttribute("data-visual-style")} / ${expectedVisualStyle}`);
    check(await page.evaluate(() => document.documentElement.dataset.visualStyle) === expectedVisualStyle, "document visual style attribute", `${await page.evaluate(() => document.documentElement.dataset.visualStyle)} / ${expectedVisualStyle}`);
    check(await page.locator("[data-report-runtime='ReportRuntime'][data-section-source='shared']").count() === 1, "ReportRuntime inheritance");
    check(await page.locator("[data-report-section]").count() === sections.length, "shared section source count", `${await page.locator("[data-report-section]").count()} rendered / ${sections.length} manifest`);
    check(await page.locator("[data-report-nav-item]").count() === sections.length, "navigation derives from sections");
    const renderedIds = await page.locator("[data-report-section]").evaluateAll((items) => items.map((item) => item.id));
    check(JSON.stringify(renderedIds) === JSON.stringify(sections.map((section) => section.id)), "section order matches manifest", JSON.stringify(renderedIds));

    const nav = page.locator("[data-report-navigation]");
    check(await nav.isVisible(), "desktop left navigation visible");
    const navPosition = await nav.evaluate((element) => ({ position: getComputedStyle(element).position, width: element.getBoundingClientRect().width }));
    check(navPosition.position === "fixed" && navPosition.width >= 220 && navPosition.width <= 270, "desktop navigation geometry", JSON.stringify(navPosition));

    const continuity = await page.locator("[data-report-section]").evaluateAll((items) => items.map((item, index) => {
      const rect = item.getBoundingClientRect(); const next = items[index + 1]?.getBoundingClientRect();
      const candidates = [...item.querySelectorAll("[data-report-section-heading], [data-audit-box], [data-evidence-visual], .report-finding-band, p, dl, table, figure")].filter((node) => node instanceof HTMLElement && node.offsetParent !== null).map((node) => node.getBoundingClientRect()).filter((box) => box.width > 2 && box.height > 2);
      const contentTop = candidates.length ? Math.min(...candidates.map((box) => box.top)) : rect.top; const contentBottom = candidates.length ? Math.max(...candidates.map((box) => box.bottom)) : rect.top;
      return { id: item.id, role: item.getAttribute("data-section-role"), gapAfter: next ? next.top - rect.bottom : 0, height: rect.height, emptyTail: rect.bottom - contentBottom, occupied: (contentBottom - contentTop) / Math.max(1, rect.height), contribution: item.getAttribute("data-substantive-contribution"), kinds: item.getAttribute("data-substantive-kinds") };
    }));
    continuity.forEach((item) => {
      check(item.gapAfter <= 120, `continuous section gap: ${item.id}`, JSON.stringify(item));
      if (!["hero", "closing"].includes(item.role)) {
        check(item.emptyTail <= Math.max(240, item.height * .32), `content-driven section height: ${item.id}`, JSON.stringify(item));
        check(!(item.height >= 810 && item.occupied < .58), `report is not stacked-slide geometry: ${item.id}`, JSON.stringify(item));
        // Scaffold placeholders intentionally omit evidence-bearing contribution
        // metadata; enforce the stronger contract only once real content replaces
        // the placeholder. This preserves the legacy prototype compatibility path.
        if (Number(manifest.datasetSemanticVersion ?? 0) >= 2 && !manifest.scaffoldPlaceholder) check(Boolean(item.contribution && item.kinds), `substantive navigation target: ${item.id}`, JSON.stringify(item));
      }
    });

    if (sections.length > 1) {
      const second = sections[1].id;
      await page.locator(`[data-report-nav-item='${second}']`).click();
      await page.waitForFunction((id) => location.hash === `#${id}`, second);
      await page.waitForFunction((id) => document.querySelector(`[data-report-nav-item='${id}']`)?.getAttribute("aria-current") === "location", second, { timeout: 10000 });
      await page.waitForFunction((id) => Math.abs(document.getElementById(id)?.getBoundingClientRect().top ?? 9999) < 90, second, { timeout: 10000 });
      check(true, "click navigation updates hash and active item");
      const top = await page.locator(`#${second}`).evaluate((element) => Math.abs(element.getBoundingClientRect().top));
      check(top < 90, "click navigation reaches section", `section top ${top}`);
    }

    if (sections.length > 2) {
      const second = sections[1].id;
      const third = sections[2].id;
      await page.locator(`[data-report-nav-item='${second}']`).click();
      await page.locator(`[data-report-nav-item='${third}']`).click();
      await page.goBack({ waitUntil: "domcontentloaded" });
      await page.waitForFunction((id) => location.hash === `#${id}`, second);
      check(true, "browser back restores section hash");
      await page.goForward({ waitUntil: "domcontentloaded" });
      await page.waitForFunction((id) => location.hash === `#${id}`, third);
      check(true, "browser forward restores section hash");
    }

    const naturalTarget = sections[Math.min(sections.length - 1, 2)]?.id;
    if (naturalTarget) {
      await page.waitForTimeout(400);
      await page.locator(`#${naturalTarget}`).evaluate((element) => window.scrollTo({ top: window.scrollY + element.getBoundingClientRect().top + 200, behavior: "auto" }));
      await page.waitForFunction((id) => document.querySelector(`[data-report-nav-item='${id}']`)?.getAttribute("aria-current") === "location", naturalTarget, { timeout: 10000 });
      check(await page.evaluate((id) => location.hash === `#${id}`, naturalTarget), "scrollspy follows manual scrolling into the third section");
      if (manifest.analysisCompanion?.enabled) {
        const toggle = page.locator(".analysis-companion-toggle");
        await toggle.click();
        check((await page.locator(".analysis-companion-context").innerText()).trim() === sections[Math.min(sections.length - 1, 2)].title, "companion prompts follow the active third section");
        await toggle.click();
      }
    }

    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "auto" }));
    await page.waitForTimeout(240);
    const progress = await page.locator(".report-reading-progress i").evaluate((element) => element.getBoundingClientRect().width / element.parentElement.getBoundingClientRect().width);
    check(progress > .97, "reading progress reaches completion", String(progress));
    await page.locator(".report-back-to-top").click();
    await page.waitForFunction(() => window.scrollY < 40, undefined, { timeout: 10000 });
    check(true, "keyboard-accessible back to top");

    const runtimeHooks = Array.isArray(manifest.runtimeHooks) ? manifest.runtimeHooks : [];
    if (manifest.analysisMode === "predictive") {
      const actions = new Set(runtimeHooks.map((hook) => hook.action));
      check(actions.has("reset"), "predictive report exposes chart reset");
      check(actions.has("tooltip") || actions.has("fold-tooltip"), "predictive report exposes validation/fold tooltip");
      check(actions.has("metric-switch") || actions.has("group-switch") || actions.has("model-switch"), "predictive report exposes model or metric comparison interaction");
    }
    const exercised = new Set();
    for (const hook of runtimeHooks) {
      const locator = page.locator(`[data-runtime-hook='${hook.id.replaceAll("'", "\\'")}']`).first();
      check(await locator.count() > 0, `runtime hook exists: ${hook.id}`);
      if (!await locator.count()) continue;
      await locator.scrollIntoViewIfNeeded();
      check(await locator.getAttribute("data-chart-action") === hook.action, `runtime hook action matches: ${hook.id}`);
      if (["metric-switch", "group-switch", "model-switch", "time-range"].includes(hook.action)) {
        if (await locator.evaluate((element) => element instanceof HTMLSelectElement && element.options.length > 1)) await locator.selectOption({ index: 1 });
      } else if (["series-highlight", "legend-focus", "reset"].includes(hook.action)) await locator.click();
      else if (["tooltip", "fold-tooltip"].includes(hook.action)) {
        const frame = locator.locator("xpath=ancestor::*[contains(@class,'dataset-chart-frame')]").first();
        const host = frame.locator(".evidence-chart-canvas").first();
        if (await host.count()) {
          await host.scrollIntoViewIfNeeded();
          const box = await host.boundingBox();
          if (box) await page.mouse.move(box.x + box.width * .55, box.y + box.height * .5);
        } else await locator.focus();
        check(await frame.locator("[data-chart-tooltip]").count() > 0, `tooltip exposed: ${hook.id}`);
      } else {
        const frame = locator.locator("xpath=ancestor::*[contains(@class,'dataset-chart-frame')]").first();
        const mark = frame.locator(".evidence-chart-canvas svg path[fill]:not([fill='none'])").first();
        if (await mark.count()) await mark.click(); else await locator.focus();
      }
      exercised.add(hook.id);
    }
    check(exercised.size === runtimeHooks.length, "all manifest runtime hooks exercised", `${exercised.size}/${runtimeHooks.length}`);

    const companionEnabled = manifest.analysisCompanion?.enabled === true;
    const companion = page.locator("[data-analysis-companion='true']");
    check(await companion.count() === (companionEnabled ? 1 : 0), "optional research companion boundary");
    if (companionEnabled) {
      const toggle = companion.locator(".analysis-companion-toggle");
      check(await toggle.isVisible(), "companion entry visible");
      check(await companion.locator(".analysis-companion-panel").count() === 0, "companion starts collapsed");
      await toggle.click();
      check(await toggle.getAttribute("aria-expanded") === "true", "companion expands accessibly");
      const input = companion.locator("input").first();
      await input.fill("未登记的问题");
      await companion.getByRole("button", { name: "查询证据" }).click();
      await companion.locator("[data-companion-status='insufficient']").waitFor({ timeout: 10000 });
      check(await companion.locator("[data-companion-status='insufficient']").count() === 1, "unknown question refuses unsupported answer");
      await companion.getByRole("button", { name: "恢复报告口径" }).click();
      check(await companion.locator("[data-companion-status]").count() === 0, "companion reset clears temporary result");
      const evidencePath = path.resolve(target, manifest.evidenceRegistry ?? "evidence-visuals.json");
      const evidence = JSON.parse(await readFile(evidencePath, "utf8"));
      const firstQuestion = evidence.analysisCompanion?.questions?.[0];
      if (firstQuestion) {
        await input.fill(firstQuestion.prompt);
        await companion.getByRole("button", { name: "查询证据" }).click();
        await companion.locator("[data-companion-status='answered']").waitFor({ timeout: 10000 });
        check(await companion.locator("[data-companion-status='answered']").count() === 1, "registered question resolves from evidence");
        const answer = await companion.locator("[data-companion-status='answered'] .analysis-companion-answer").innerText();
        check(answer.includes(String(evidence.analysisCompanion.measures.find((item) => item.id === firstQuestion.measureId)?.label ?? "")) || firstQuestion.action === "method", "answer states registered measure", answer);
        await companion.getByRole("button", { name: "保存到笔记" }).click();
        check(await companion.getByText("发现笔记本（1）").count() === 1, "reader notebook stores answered result");
        check(await page.evaluate((projectId) => Boolean(localStorage.getItem(`zuel-analysis-companion:${projectId}:notes:v1`)), manifest.analysisCompanion.projectId), "reader notebook uses separate local storage");
      }
      await page.keyboard.press("Escape");
      check(await companion.locator(".analysis-companion-panel").count() === 0 && await toggle.getAttribute("aria-expanded") === "false", "companion closes with Escape");
    }

    for (const hook of runtimeHooks.filter((item) => item.action === "reset")) {
      const result = await page.locator(`[data-runtime-hook='${hook.id.replaceAll("'", "\\'")}']`).first().evaluate((element) => {
        const frame = element.closest(".dataset-chart-frame");
        const visual = frame?.querySelector("[data-evidence-visual]");
        return { current: frame?.getAttribute("data-chart-current-state"), reset: visual?.getAttribute("data-reset-state") };
      });
      check(result.current === result.reset, `reset restores declared state: ${hook.id}`, `${result.current} / ${result.reset}`);
    }

    if (manifest.reportPresentation?.toolbar === true) {
      const toolbar = page.locator("[data-report-toolbar]");
      check(await toolbar.isVisible(), "general report toolbar visible");
      await toolbar.locator("[data-report-action='presentation']").click();
      check(await page.locator(".report-runtime.is-speaking").count() === 1, "presentation mode enlarges report copy");
      await toolbar.locator("[data-report-action='notes']").click();
      check(await toolbar.locator("[data-report-action='notes']").getAttribute("aria-pressed") === "true", "speaker notes toggle");
      for (const widget of await page.locator("[data-report-widget='tabs']").all()) {
        const tabs = widget.locator("[role='tab']");
        if (await tabs.count() > 1) { await tabs.nth(1).click(); check(await tabs.nth(1).getAttribute("aria-selected") === "true", "general method/example tab switches"); }
      }
      for (const widget of await page.locator("[data-report-widget='cases']").all()) {
        const buttons = widget.locator("button");
        if (await buttons.count() > 1) { await buttons.nth(1).click(); check(await buttons.nth(1).getAttribute("aria-pressed") === "true", "general case selection"); }
      }
      await toolbar.locator("[data-report-action='reset']").click();
      check(await page.locator(".report-runtime.is-speaking").count() === 0, "general presentation reset");
      check(await page.locator(".report-speaker-note:visible").count() === 0, "reset collapses speaker notes");
      for (const widget of await page.locator("[data-report-widget='tabs']").all()) check(await widget.locator("[role='tab']").first().getAttribute("aria-selected") === "true", "reset restores first tab");
    }

    const desktopOverflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    check(desktopOverflow.scrollWidth <= desktopOverflow.clientWidth + 1, "desktop has no horizontal overflow", JSON.stringify(desktopOverflow));

    await page.setViewportSize({ width: 720, height: 900 });
    const toggle = page.locator(".report-navigation-toggle");
    check(await toggle.isVisible(), "narrow navigation toggle visible");
    await toggle.click();
    check(await page.locator(".report-navigation-shell.is-open").count() === 1, "narrow navigation opens");
    if (manifest.analysisCompanion?.enabled === true) check(await page.locator("[data-analysis-companion]").count() === 0, "companion does not compete with narrow navigation drawer");
    await page.waitForFunction(() => {
      const navigation = document.querySelector(".report-navigation-shell.is-open .report-navigation");
      return navigation instanceof HTMLElement && navigation.getBoundingClientRect().left >= -1;
    }, undefined, { timeout: 5000 });
    check(await page.locator(".report-navigation-shell.is-open .report-navigation").isVisible(), "narrow navigation drawer is visible");
    await page.keyboard.press("Escape");
    check(await page.locator(".report-navigation-shell.is-open").count() === 0, "narrow navigation closes with Escape");
    if (manifest.analysisCompanion?.enabled === true) {
      const narrowCompanion = page.locator("[data-analysis-companion]");
      await narrowCompanion.locator(".analysis-companion-toggle").click();
      const panelBounds = await narrowCompanion.locator(".analysis-companion-panel").evaluate((element) => { const box = element.getBoundingClientRect(); return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: innerWidth, height: innerHeight }; });
      check(panelBounds.left >= 0 && panelBounds.right <= panelBounds.width && panelBounds.top >= 0 && panelBounds.bottom <= panelBounds.height, "narrow companion panel stays inside viewport", JSON.stringify(panelBounds));
      await page.keyboard.press("Escape");
    }
    const narrowOverflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    check(narrowOverflow.scrollWidth <= narrowOverflow.clientWidth + 1, "narrow viewport has no horizontal overflow", JSON.stringify(narrowOverflow));

    await page.setViewportSize({ width: 1600, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${baseUrl}#${firstId}`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.documentElement.dataset.reportReady === "true", undefined, { timeout: 30000 });
    const reduced = await page.evaluate(() => ({ behavior: getComputedStyle(document.documentElement).scrollBehavior, chartModes: [...document.querySelectorAll(".dataset-chart-frame")].map((item) => item.getAttribute("data-chart-mode")) }));
    check(reduced.behavior === "auto", "reduced motion disables smooth scrolling", reduced.behavior);
    check(reduced.chartModes.every((mode) => mode === "reduced-motion"), "reduced motion applies declared chart state", JSON.stringify(reduced.chartModes));

    const printUrl = new URL(baseUrl);
    printUrl.searchParams.set("print", "1");
    printUrl.hash = "";
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(printUrl.toString(), { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.documentElement.dataset.reportReady === "true", undefined, { timeout: 30000 });
    check(await page.locator("[data-report-runtime='ReportRuntime']").getAttribute("data-visual-style") === expectedVisualStyle, "report print visual style inheritance", `${await page.locator("[data-report-runtime='ReportRuntime']").getAttribute("data-visual-style")} / ${expectedVisualStyle}`);
    const printOrder = await page.locator("[data-report-section]").evaluateAll((items) => items.map((item) => item.id));
    check(JSON.stringify(printOrder) === JSON.stringify(sections.map((section) => section.id)), "print preserves section order");
    const printStates = await page.locator(".dataset-chart-frame").evaluateAll((frames) => frames.map((frame) => ({ mode: frame.getAttribute("data-chart-mode"), current: frame.getAttribute("data-chart-current-state"), declared: frame.querySelector("[data-evidence-visual]")?.getAttribute("data-print-state") })));
    printStates.forEach((state, index) => check(state.mode === "print" && state.current === state.declared, `deterministic report print state ${index + 1}`, JSON.stringify(state)));
    const visiblePrintControls = await page.locator("[data-report-navigation], .report-navigation-toggle, .report-reading-progress, .report-back-to-top, [data-chart-control], [data-chart-tooltip], [data-report-toolbar], [data-report-interaction-control], .report-speaker-note").evaluateAll((items) => items.filter((item) => getComputedStyle(item).display !== "none" && item.getBoundingClientRect().width > 0).length);
    check(visiblePrintControls === 0, "report navigation and interaction controls omitted from print", `${visiblePrintControls} visible`);
    check(await page.locator("[data-analysis-companion]").count() === 0, "research companion excluded from deterministic report print");

    const brand = await page.locator("img[data-brand-audit]").evaluateAll((images) => images.map((image) => { const container = image.closest("[data-logo-contains-institution-name], .report-hero-brand, .report-closing"); const contains = image.getAttribute("data-logo-contains-institution-name") === "true" || container?.getAttribute("data-logo-contains-institution-name") === "true"; const textVisible = Boolean(container?.querySelector("[data-institution-text='true']")); return { role: image.getAttribute("data-brand-role"), fit: getComputedStyle(image).objectFit, contains, textVisible, duplicate: contains && textVisible }; }));
    if (manifest.branding?.profile === "none") {
      check(await page.locator("[data-brand-audit], [data-brand-role], .report-hero-brand").count() === 0, "unbranded report omits logos and brand-only headers");
    } else {
      check(brand.length > 0 && brand.every((item) => item.fit !== "cover"), "shared brand assets use crop-safe geometry", JSON.stringify(brand));
    }
    check(brand.every((item) => !item.duplicate), "complete report lockup has no duplicate institution text", JSON.stringify(brand));
    const ordinaryBrandCount = await page.locator("[data-report-section]:not([data-section-role='hero']):not([data-section-role='closing']) img[data-brand-audit]").count();
    check(ordinaryBrandCount === 0, "ordinary report sections omit repeated lockup", `${ordinaryBrandCount} repeated logo(s)`);
  });

  const report = { target, manifest: manifestPath, outputMode: manifest.outputMode, sectionCount: sections.length, passed: failures.length === 0, failures, checks };
  console.log(JSON.stringify(report, null, 2));
  process.exit(failures.length ? 1 : 0);
} catch (error) {
  console.error(`[report-runtime-validator] ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  process.exit(1);
}
