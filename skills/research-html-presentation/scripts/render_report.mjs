#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { withDeckPage } from "./browser_helpers.mjs";

const target = process.argv[2] ?? process.cwd();
const outputRoot = path.resolve(process.argv[3] ?? (target.startsWith("http") ? path.join(process.cwd(), ".report-render") : path.join(path.resolve(target), ".report-render")));
await mkdir(outputRoot, { recursive: true });

try {
  const result = await withDeckPage(target, async ({ page, baseUrl }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-report-runtime='ReportRuntime']", { timeout: 15000 });
    await page.waitForFunction(() => document.documentElement.dataset.reportReady === "true", undefined, { timeout: 30000 });
    await page.waitForFunction(() => [...document.querySelectorAll("[data-evidence-visual]")].every((visual) => visual.getAttribute("data-visual-ready") === "true"), undefined, { timeout: 30000 });
    const sections = await page.locator("[data-report-section]").evaluateAll((items) => items.map((item) => {
      const labelledBy = item.getAttribute("aria-labelledby");
      return { id: item.id, title: (labelledBy ? document.getElementById(labelledBy)?.textContent : null)?.trim() || item.id };
    }));
    const files = [];

    await page.screenshot({ path: path.join(outputRoot, "report-full-desktop.png"), fullPage: true });
    files.push("report-full-desktop.png");
    for (let index = 0; index < sections.length; index += 1) {
      const file = `section-${String(index + 1).padStart(2, "0")}-${sections[index].id}.png`;
      await page.locator(`#${sections[index].id}`).screenshot({ path: path.join(outputRoot, file) });
      files.push(file);
    }

    await page.setViewportSize({ width: 720, height: 900 });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => document.documentElement.dataset.reportReady === "true", undefined, { timeout: 30000 });
    await page.waitForFunction(() => [...document.querySelectorAll("[data-evidence-visual]")].every((visual) => visual.getAttribute("data-visual-ready") === "true"), undefined, { timeout: 30000 });
    await page.locator(".report-navigation-toggle").click();
    await page.waitForFunction(() => {
      const navigation = document.querySelector(".report-navigation-shell.is-open .report-navigation");
      return navigation instanceof HTMLElement && navigation.getBoundingClientRect().left >= -1;
    }, undefined, { timeout: 5000 });
    await page.screenshot({ path: path.join(outputRoot, "report-narrow-navigation.png"), fullPage: false });
    files.push("report-narrow-navigation.png");
    return { sectionCount: sections.length, sections, files };
  });

  const contactSheet = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>Report inspection sheet</title><style>body{margin:0;padding:20px;background:#172632;font-family:Arial,sans-serif}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.item{background:#fff;padding:9px}.item img{display:block;width:100%;height:520px;object-fit:contain;object-position:top}.item b{display:block;padding:8px;color:#163e5c}</style></head><body><div class="grid">${result.files.map((file) => `<div class="item"><img src="${file}" alt="${file}"><b>${file}</b></div>`).join("")}</div></body></html>`;
  await writeFile(path.join(outputRoot, "contact-sheet.html"), contactSheet, "utf8");
  console.log(JSON.stringify({ target, output: outputRoot, ...result }, null, 2));
} catch (error) {
  console.error(`[report-render] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
