#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { withDeckPage } from "./browser_helpers.mjs";

const target = process.argv[2] ?? process.cwd();
const manifestPath = path.resolve(process.argv[3] ?? path.join(path.resolve(target), "deck-manifest.json"));
let manifest;
try { manifest = JSON.parse(await readFile(manifestPath, "utf8")); }
catch { console.error(`[runtime-validator] cannot read valid manifest JSON: ${manifestPath}`); process.exit(2); }

const failures = [];
const checks = [];
const expectedVisualStyle = manifest.visualStyle ?? "academic-light";
const check = (condition, name, detail = "") => {
  checks.push({ name, passed: Boolean(condition), detail });
  if (!condition) failures.push(detail ? `${name}: ${detail}` : name);
};

try {
  await withDeckPage(target, async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}#/1`, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-deck-runtime='DeckRuntime']", { timeout: 15000 });
    check(await page.locator("[data-deck-runtime='DeckRuntime']").getAttribute("data-visual-style") === expectedVisualStyle, "resolved visual style", `${await page.locator("[data-deck-runtime='DeckRuntime']").getAttribute("data-visual-style")} / ${expectedVisualStyle}`);
    check(await page.evaluate(() => document.documentElement.dataset.visualStyle) === expectedVisualStyle, "document visual style attribute", `${await page.evaluate(() => document.documentElement.dataset.visualStyle)} / ${expectedVisualStyle}`);
    const slideCount = await page.locator(".slide").count();
    check(slideCount === manifest.slides.length, "shared slide source count", `${slideCount} rendered / ${manifest.slides.length} manifest`);
    if (manifest.branding?.profile === "none") {
      check(await page.locator(".slide [data-brand-audit], .slide [data-brand-role], .slide .closing-brand-row").count() === 0, "unbranded deck omits logos and brand-only rows");
    } else if (manifest.branding?.profile === "zuel") {
      check(await page.locator(".slide").evaluateAll((slides) => slides.every(slide => Boolean(slide.querySelector("img[data-brand-audit='true']")))), "selected ZUEL branding is present on every slide");
    }
    check(await page.locator("[data-deck-runtime='DeckRuntime'][data-slide-source='shared']").count() === 1, "DeckRuntime inheritance");
    if (manifest.newProject === true && Number(manifest.qualityContractVersion ?? 0) >= 1) {
      const pageContract = await page.locator(".slide").evaluateAll((slides) => slides.map((slide, index) => {
        const runtimePage = Number(slide.getAttribute("data-runtime-page"));
        return { index, runtimePage };
      }));
      const currentFooter = await page.locator(".deck-footer [data-runtime-page-display]").textContent();
      const currentMatch = String(currentFooter ?? "").match(/^(\d+)\s*\/\s*(\d+)$/);
      check(pageContract.every((item) => item.runtimePage === item.index + 1) && Number(currentMatch?.[1]) === 1 && Number(currentMatch?.[2]) === manifest.slides.length, "derived page numbering", JSON.stringify({ pageContract, currentFooter }));
    }

    const controls = page.locator("[data-runtime-control]");
    check(await controls.count() === 3, "visible M/P/F controls", `${await controls.count()} controls found`);
    for (const name of ["chapters", "fullscreen", "presenter"]) {
      const opacity = await page.locator(`[data-runtime-control='${name}']`).evaluate((element) => Number(getComputedStyle(element).opacity) * Number(getComputedStyle(element.parentElement).opacity));
      check(opacity >= .45, `${name} control discoverability`, `effective opacity ${opacity}`);
    }

    await page.locator("[data-runtime-control='chapters']").click();
    check(await page.locator("#chapter-panel.is-open").count() === 1, "chapter menu opens");
    const expectedChapters = Array.isArray(manifest.chapters) ? manifest.chapters.length : new Set(manifest.slides.map((slide) => slide.section)).size;
    check(await page.locator("#chapter-panel > button").count() === expectedChapters, "chapter count derives from slide metadata");
    await page.keyboard.press("Escape");
    check(await page.locator("#chapter-panel.is-open").count() === 0, "chapter menu closes with Escape");

    await page.keyboard.press("End");
    await page.waitForFunction((count) => location.hash === `#/${count}`, manifest.slides.length);
    const footerTotal = await page.locator(".deck-footer strong").textContent();
    check(footerTotal?.includes(String(manifest.slides.length).padStart(2, "0")), "current/total derives from slides", footerTotal ?? "missing footer total");
    await page.waitForTimeout(260);
    const progressAtEnd = await page.locator(".progress-track i").evaluate((element) => element.getBoundingClientRect().width / element.parentElement.getBoundingClientRect().width);
    check(Math.abs(progressAtEnd - 1) < .01, "progress reaches manifest total", String(progressAtEnd));
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowRight");
    await page.waitForFunction(() => location.hash === "#/2");
    check(true, "keyboard navigation and hash");

    await page.evaluate(() => {
      window.__fullscreenRequested = false;
      Object.defineProperty(document.documentElement, "requestFullscreen", { configurable: true, value: async () => { window.__fullscreenRequested = true; } });
    });
    await page.keyboard.press("f");
    check(await page.evaluate(() => window.__fullscreenRequested === true), "fullscreen shortcut invokes API");

    const popupPromise = page.waitForEvent("popup", { timeout: 10000 });
    await page.locator("[data-runtime-control='presenter']").click();
    const presenter = await popupPromise;
    await presenter.waitForLoadState("networkidle");
    await presenter.waitForSelector(".presenter-view", { timeout: 15000 });
    check(await presenter.locator(".presenter-view").getAttribute("data-visual-style") === expectedVisualStyle, "Presenter visual style inheritance", `${await presenter.locator(".presenter-view").getAttribute("data-visual-style")} / ${expectedVisualStyle}`);
    check(true, "Presenter View opens");
    await page.keyboard.press("End");
    await presenter.waitForFunction((count) => document.querySelector(".presenter-header > strong")?.textContent?.startsWith(String(count).padStart(2, "0")), manifest.slides.length);
    check(true, "Audience to Presenter synchronization");
    await presenter.locator(".presenter-navigation button").first().click();
    await page.waitForFunction((count) => location.hash === `#/${count - 1}`, manifest.slides.length);
    check(true, "Presenter to Audience synchronization");
    await presenter.close();

    await page.evaluate(() => { window.open = () => null; });
    page.once("dialog", (dialog) => dialog.accept());
    await page.locator("[data-runtime-control='presenter']").click();
    check(await page.locator(".runtime-notice").count() === 1, "popup failure is explicit");

    const runtimeHooks = Array.isArray(manifest.runtimeHooks) ? manifest.runtimeHooks : [];
    if (manifest.analysisMode === "predictive") {
      const actions = new Set(runtimeHooks.map((hook) => hook.action));
      check(actions.has("reset"), "predictive deck exposes chart reset");
      check(actions.has("tooltip") || actions.has("fold-tooltip"), "predictive deck exposes validation/fold tooltip");
      check(actions.has("metric-switch") || actions.has("group-switch") || actions.has("model-switch"), "predictive deck exposes model or metric comparison interaction");
    }
    const exercised = new Set();
    for (const hook of runtimeHooks) {
      const slideIndex = await page.evaluate((id) => {
        const element = [...document.querySelectorAll("[data-runtime-hook]")].find((node) => node.getAttribute("data-runtime-hook") === id);
        const slide = element?.closest(".slide");
        return slide ? [...document.querySelectorAll(".slide")].indexOf(slide) : -1;
      }, hook.id);
      check(slideIndex >= 0, `runtime hook exists: ${hook.id}`);
      if (slideIndex < 0) continue;
      await page.goto(`${baseUrl}#/${slideIndex + 1}`, { waitUntil: "networkidle" });
      await page.waitForFunction(() => [...document.querySelectorAll(".slide.is-active [data-evidence-visual]")].every((visual) => visual.getAttribute("data-visual-ready") === "true"), undefined, { timeout: 25000 });
      const locator = page.locator(`[data-runtime-hook='${hook.id.replaceAll("'", "\\'")}']`).first();
      check(await locator.getAttribute("data-chart-action") === hook.action, `runtime hook action matches: ${hook.id}`);
      if (["metric-switch", "group-switch", "model-switch", "time-range"].includes(hook.action)) {
        if (await locator.evaluate((element) => element instanceof HTMLSelectElement && element.options.length > 1)) await locator.selectOption({ index: 1 });
      } else if (["series-highlight", "legend-focus", "reset"].includes(hook.action)) {
        await locator.click();
      } else if (["tooltip", "fold-tooltip"].includes(hook.action)) {
        await page.waitForTimeout(700);
        const mark = page.locator(".slide.is-active .evidence-chart-canvas svg path[fill]:not([fill='none'])").first();
        if (await mark.count()) await mark.hover(); else await locator.focus();
        const tooltip = page.locator(".slide.is-active [data-chart-tooltip]");
        check(await tooltip.count() > 0 && await tooltip.isVisible(), `tooltip is exposed: ${hook.id}`);
      } else if (["point-detail", "cell-detail", "confusion-detail", "linked-evidence"].includes(hook.action)) {
        await page.waitForTimeout(700);
        const mark = page.locator(".slide.is-active .evidence-chart-canvas svg path[fill]:not([fill='none'])").first();
        if (await mark.count()) await mark.click(); else await locator.focus();
      }
      exercised.add(hook.id);
    }
    check(exercised.size === runtimeHooks.length, "all manifest runtime hooks exercised", `${exercised.size}/${runtimeHooks.length}`);

    const resetHooks = runtimeHooks.filter((hook) => hook.action === "reset");
    for (const hook of resetHooks) {
      const result = await page.locator(`[data-runtime-hook='${hook.id.replaceAll("'", "\\'")}']`).first().evaluate((element) => {
        const frame = element.closest(".dataset-chart-frame"); const visual = frame?.querySelector("[data-evidence-visual]");
        return { current: frame?.getAttribute("data-chart-current-state"), reset: visual?.getAttribute("data-reset-state") };
      });
      check(result.current === result.reset, `reset restores declared state: ${hook.id}`, `${result.current} / ${result.reset}`);
    }

    const interactiveSlide = await page.evaluate(() => {
      const slide = [...document.querySelectorAll(".slide")].find((item) => item.querySelector(".dataset-chart-frame"));
      return slide ? [...document.querySelectorAll(".slide")].indexOf(slide) : -1;
    });
    if (interactiveSlide >= 0) {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`${baseUrl}#/${interactiveSlide + 1}`, { waitUntil: "networkidle" });
      await page.waitForSelector(".slide.is-active .dataset-chart-frame[data-chart-mode='reduced-motion']", { timeout: 10000 });
      const reduced = await page.locator(".slide.is-active .dataset-chart-frame").first().evaluate((frame) => ({ current: frame.getAttribute("data-chart-current-state"), declared: frame.querySelector("[data-evidence-visual]")?.getAttribute("data-reduced-motion-state") }));
      check(reduced.current === reduced.declared, "reduced motion applies declared state", `${reduced.current} / ${reduced.declared}`);
    }

    const printUrl = new URL(baseUrl); printUrl.searchParams.set("print", "1"); printUrl.hash = "";
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(printUrl.toString(), { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.documentElement.dataset.deckReady === "true", undefined, { timeout: 30000 });
    check(await page.locator(".print-deck").getAttribute("data-visual-style") === expectedVisualStyle, "print visual style inheritance", `${await page.locator(".print-deck").getAttribute("data-visual-style")} / ${expectedVisualStyle}`);
    const printStates = await page.locator(".print-deck .dataset-chart-frame").evaluateAll((frames) => frames.map((frame) => ({ mode: frame.getAttribute("data-chart-mode"), current: frame.getAttribute("data-chart-current-state"), declared: frame.querySelector("[data-evidence-visual]")?.getAttribute("data-print-state") })));
    printStates.forEach((state, index) => check(state.mode === "print" && state.current === state.declared, `deterministic print state ${index + 1}`, JSON.stringify(state)));
    if (manifest.newProject === true && Number(manifest.qualityContractVersion ?? 0) >= 1) {
      const printOrder = await page.locator(".print-deck .print-slide").evaluateAll((slides) => slides.map((slide, index) => ({ index, page: Number(slide.getAttribute("data-runtime-page")), text: Number(slide.querySelector("[data-runtime-page-display]")?.textContent?.match(/\b(\d+)\s*\//)?.[1] ?? 0) })));
      check(printOrder.every((item) => item.page === item.index + 1 && item.text === item.index + 1), "print page order derives from slides", JSON.stringify(printOrder));
    }
    const visiblePrintControls = await page.locator(".print-deck [data-chart-control], .print-deck [data-runtime-controls], .print-deck .control-discovery-hint").evaluateAll((elements) => elements.filter((element) => getComputedStyle(element).display !== "none").length);
    check(visiblePrintControls === 0, "controls omitted from print", `${visiblePrintControls} visible`);
    const closingBrand = await page.locator(".print-deck .branded-closing img[data-brand-audit]").evaluateAll((images) => images.map((image) => { const container = image.closest("[data-logo-contains-institution-name], .branded-closing"); const contains = image.getAttribute("data-logo-contains-institution-name") === "true" || container?.getAttribute("data-logo-contains-institution-name") === "true"; const textVisible = Boolean(container?.querySelector("[data-institution-text='true']")); return { contains, textVisible, duplicate: contains && textVisible }; }));
    check(closingBrand.every((item) => !item.duplicate), "complete closing lockup has no duplicate institution text", JSON.stringify(closingBrand));
  });

  const report = { target, manifest: manifestPath, passed: failures.length === 0, failures, checks };
  console.log(JSON.stringify(report, null, 2));
  process.exit(failures.length ? 1 : 0);
} catch (error) {
  console.error(`[runtime-validator] ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  process.exit(1);
}
