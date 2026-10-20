#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { withDeckPage } from "./browser_helpers.mjs";

const target = process.argv[2] ?? process.cwd();
const outputRoot = path.resolve(process.argv[3] ?? (target.startsWith("http") ? path.join(process.cwd(), ".deck-render") : path.join(path.resolve(target), ".deck-render")));

await mkdir(outputRoot, { recursive: true });
await mkdir(path.join(outputRoot, "thumbnails"), { recursive: true });

try {
  const result = await withDeckPage(target, async ({ page, baseUrl }) => {
    await page.goto(`${baseUrl}#/1`, { waitUntil: "networkidle" });
    await page.waitForSelector(".slide", { timeout: 15000 });
    const slideCount = await page.locator(".slide").count();
    const files = [];

    for (let index = 1; index <= slideCount; index += 1) {
      await page.goto(`${baseUrl}#/${index}`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(180);
      await page.waitForFunction((expected) => [...document.querySelectorAll(".slide")][expected - 1]?.classList.contains("is-active"), index, { timeout: 10000 });
      await page.waitForFunction(() => [...document.querySelectorAll('.slide')].every(slide => slide.classList.contains('is-active') ? Number(getComputedStyle(slide).opacity) > .999 : Number(getComputedStyle(slide).opacity) < .001));
      await page.waitForFunction(() => {
        const active = document.querySelector(".slide.is-active") ?? [...document.querySelectorAll(".slide")].find((node) => node.getAttribute("aria-hidden") !== "true");
        if (!active) return false;
        return [...active.querySelectorAll("[data-evidence-visual]")].every((visual) => visual.getAttribute("data-visual-ready") === "true");
      }, undefined, { timeout: 25000 });
      const filename = `slide-${String(index).padStart(2, "0")}.png`;
      await page.screenshot({ path: path.join(outputRoot, filename), fullPage: false });
      files.push(filename);
    }

    await page.setViewportSize({ width: 500, height: 281 });
    const thumbnails = [];
    for (let index = 1; index <= slideCount; index += 1) {
      await page.goto(`${baseUrl}#/${index}`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction((expected) => [...document.querySelectorAll(".slide")][expected - 1]?.classList.contains("is-active"), index, { timeout: 10000 });
      await page.waitForFunction(() => [...document.querySelectorAll('.slide')].every(slide => slide.classList.contains('is-active') ? Number(getComputedStyle(slide).opacity) > .999 : Number(getComputedStyle(slide).opacity) < .001));
      const filename = `slide-${String(index).padStart(2, "0")}.png`;
      await page.screenshot({ path: path.join(outputRoot, "thumbnails", filename), fullPage: false });
      thumbnails.push(`thumbnails/${filename}`);
    }

    return { slideCount, files, thumbnails };
  });

  const contactSheet = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>Deck contact sheet</title><style>body{margin:0;background:#172632;font-family:Arial,sans-serif}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;padding:18px}.item{background:#fff;padding:8px;box-shadow:0 4px 16px #0005}.item img{display:block;width:100%;aspect-ratio:16/9;object-fit:contain}.item b{display:block;padding:7px 2px 1px;color:#163e5c}</style></head><body><div class="grid">${result.files.map((file, index) => `<div class="item"><img src="${file}" alt="第 ${index + 1} 页"><b>${String(index + 1).padStart(2, "0")}</b></div>`).join("")}</div></body></html>`;
  await writeFile(path.join(outputRoot, "contact-sheet.html"), contactSheet, "utf8");
  const thumbnailSheet = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>Deck thumbnail browser check</title><style>body{margin:0;background:#172632;font-family:Arial,sans-serif}.grid{display:grid;grid-template-columns:repeat(3,500px);gap:18px;padding:18px}.item{background:#fff;padding:8px}.item img{display:block;width:500px;height:281px;object-fit:contain}.item b{display:block;padding:7px 2px 1px;color:#163e5c}</style></head><body><div class="grid">${result.thumbnails.map((file, index) => `<div class="item"><img src="${file}" alt="第 ${index + 1} 页 500 像素浏览器预览"><b>${String(index + 1).padStart(2, "0")}</b></div>`).join("")}</div></body></html>`;
  await writeFile(path.join(outputRoot, "thumbnail-contact-sheet.html"), thumbnailSheet, "utf8");
  console.log(JSON.stringify({ target, output: outputRoot, ...result }, null, 2));
} catch (error) {
  console.error(`[deck-render] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
