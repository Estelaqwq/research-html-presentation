#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { withDeckPage } from "./browser_helpers.mjs";

const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const golden = path.join(skillRoot, "examples", "golden-visual-contracts", "rendered-academic-light-v2");
const contactSheet = path.join(golden, "contact-sheet.png");
const pdf = path.join(golden, "golden.pdf");
const metrics = await withDeckPage(golden, async ({ page, baseUrl }) => {
  await page.goto(`${baseUrl}?contact=1`, { waitUntil: "networkidle" });
  await page.setViewportSize({ width: 2460, height: 1500 });
  await page.reload({ waitUntil: "networkidle" });
  await page.screenshot({ path: contactSheet, fullPage: true });
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  const slideLocator = page.locator("[data-golden-slide]");
  for (let index = 0; index < await slideLocator.count(); index += 1) {
    await slideLocator.nth(index).screenshot({ path: path.join(golden, `slide-${String(index + 1).padStart(2, "0")}.png`) });
  }
  const result = await page.evaluate(() => [...document.querySelectorAll("[data-golden-slide]")].map((slide) => {
    const rect = slide.getBoundingClientRect();
    const fonts = [...slide.querySelectorAll("p:not(.kicker),li")].map((node) => Number.parseFloat(getComputedStyle(node).fontSize)).filter(Number.isFinite);
    return { id: slide.getAttribute("data-silhouette"), width: rect.width, height: rect.height, overflow: slide.scrollWidth > slide.clientWidth || slide.scrollHeight > slide.clientHeight, minBodyFont: fonts.length ? Math.min(...fonts) : null, chartForms: [...slide.querySelectorAll("[data-chart-host='true']")].map((node) => node.getAttribute("data-chart-form")) };
  }));
  await page.emulateMedia({ media: "print" });
  await page.pdf({ path: pdf, width: "1600px", height: "900px", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
  return result;
});
await writeFile(path.join(golden, "layout-metrics.json"), `${JSON.stringify({ generatedAt: new Date().toISOString(), slides: metrics }, null, 2)}\n`, "utf8");
const forbidden = /不是.{0,40}而是|而不是|本页|本报告|这组数据|需要组合阅读/;
const html = await (await import("node:fs/promises")).readFile(path.join(golden, "index.html"), "utf8");
await writeFile(path.join(golden, "copy-check.json"), `${JSON.stringify({ passed: !forbidden.test(html), synthetic: true }, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ passed: true, golden, contactSheet, pdf, slideCount: metrics.length }, null, 2));
