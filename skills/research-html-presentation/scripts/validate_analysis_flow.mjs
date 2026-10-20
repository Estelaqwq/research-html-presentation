#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { withDeckPage } from "./browser_helpers.mjs";

const root = path.resolve(process.argv[2] ?? ".");
const manifest = JSON.parse(await readFile(path.join(root, "deck-manifest.json"), "utf8"));
if (!manifest.analysisFlow?.enabled) {
  console.log(JSON.stringify({ passed: true, skipped: true, reason: "analysisFlow.enabled is false" }));
  process.exit(0);
}
if (manifest.profile !== "dataset-report" || manifest.outputMode !== "scroll-report") throw new Error("analysisFlow requires a dataset scroll report");
const initial = JSON.parse(await readFile(path.resolve(root, manifest.analysisFlow.initialGraph), "utf8"));
const failures = [];
const check = (value, name) => { if (!value) failures.push(name); };
check(initial.schemaVersion === 1, "schemaVersion");
check(Array.isArray(initial.nodes) && (manifest.scaffoldPlaceholder || initial.nodes.length > 0), "initial nodes");
check(Array.isArray(initial.edges), "initial edges");
const ids = new Set((initial.nodes ?? []).map((node) => node.id));
check(ids.size === initial.nodes?.length, "unique node IDs");
for (const node of initial.nodes ?? []) check(typeof node.title === "string" && typeof node.description === "string" && Number.isFinite(node.x) && Number.isFinite(node.y), `node shape ${node.id}`);
for (const edge of initial.edges ?? []) check(ids.has(edge.from) && ids.has(edge.to), `edge endpoints ${edge.id}`);
if (!manifest.scaffoldPlaceholder) {
  const evidence = JSON.parse(await readFile(path.resolve(root, manifest.evidenceRegistry), "utf8"));
  const expected = [...(evidence.datasets ?? []).map((x) => `dataset:${x.datasetId ?? x.id}`), ...(evidence.transforms ?? []).map((x) => `transform:${x.transformId ?? x.id}`), ...(evidence.analyses ?? []).map((x) => `analysis:${x.analysisId ?? x.id}`), "report:final"];
  for (const id of expected) check(ids.has(id), `initial record mapping ${id}`);
}
if (!process.argv.includes("--runtime") || manifest.scaffoldPlaceholder) {
  console.log(JSON.stringify({ passed: failures.length === 0, checks: "static", failures }));
  process.exit(failures.length ? 1 : 0);
}
try {
  await withDeckPage(root, async ({ page, baseUrl }) => {
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-report-runtime='ReportRuntime']");
    const toggle = page.getByRole("button", { name: "分析流程", exact: true });
    check(await toggle.isVisible(), "flow entry visible");
    check(await page.getByRole("dialog", { name: "分析流程图" }).count() === 0, "collapsed default");
    await toggle.click();
    const dialog = page.getByRole("dialog", { name: "分析流程图" });
    check(await dialog.isVisible(), "opens dialog");
    check(await page.locator("[data-flow-node-id]").count() === initial.nodes.length, "initial nodes rendered");
    await page.locator("[data-flow-node-id]").first().click();
    check(await dialog.getByText(initial.nodes[0].description, { exact: true }).count() > 0, "node details");
    await dialog.getByRole("button", { name: "编辑流程图" }).click();
    await dialog.getByRole("button", { name: "新增节点" }).click();
    check(await page.locator("[data-flow-node-id]").count() === initial.nodes.length + 1, "add node");
    await dialog.getByLabel("节点名称").fill("浏览器交互测试节点");
    await dialog.getByRole("textbox", { name: "说明", exact: true }).fill("可自由编辑的节点说明");
    const current = await dialog.getByLabel("节点名称").inputValue();
    check(current === "浏览器交互测试节点", "edit title");
    await dialog.locator(".analysis-flow-fields select").selectOption("gold");
    const customNode = page.locator("[data-flow-node-id]").last();
    check(await customNode.evaluate((node) => node.classList.contains("is-gold")), "edit node color");
    const beforeDrag = await customNode.evaluate((node) => Number.parseInt(node.style.left, 10));
    const box = await customNode.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 30, { steps: 5 });
      await page.mouse.up();
    }
    const afterDrag = await customNode.evaluate((node) => Number.parseInt(node.style.left, 10));
    check(afterDrag >= beforeDrag + 40, "pointer drag node");
    await dialog.getByRole("button", { name: "左移" }).click();
    await dialog.getByRole("button", { name: "撤销" }).click();
    await dialog.getByRole("button", { name: "重做" }).click();
    await dialog.locator(".analysis-flow-edge-form select").first().selectOption(initial.nodes[0].id);
    const customId = await page.locator("[data-flow-node-id]").last().getAttribute("data-flow-node-id");
    await dialog.locator(".analysis-flow-edge-form select").nth(1).selectOption(customId);
    await dialog.getByRole("button", { name: "添加连接" }).click();
    check(await dialog.getByRole("button", { name: /删除连接：/ }).count() === initial.edges.length + 1, "add edge");
    await dialog.getByRole("button", { name: "保存", exact: true }).click();
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("button", { name: "分析流程", exact: true }).click();
    check(await page.locator("[data-flow-node-id]").count() === initial.nodes.length + 1, "saved reload");
    await page.getByRole("dialog", { name: "分析流程图" }).getByRole("button", { name: "编辑流程图" }).click();
    await page.getByRole("dialog", { name: "分析流程图" }).getByRole("button", { name: "恢复初始版" }).click();
    await page.getByRole("button", { name: "确定恢复" }).click();
    check(await page.locator("[data-flow-node-id]").count() === initial.nodes.length, "restore initial");
    await page.setViewportSize({ width: 390, height: 820 });
    check(await page.getByRole("dialog", { name: "分析流程图" }).isVisible(), "narrow dialog");
    const firstNode = page.locator("[data-flow-node-id]").first();
    await firstNode.click();
    const beforeMove = await firstNode.evaluate((node) => Number.parseInt((node).style.left, 10));
    await firstNode.press("ArrowRight");
    const afterMove = await firstNode.evaluate((node) => Number.parseInt((node).style.left, 10));
    check(afterMove === beforeMove + 10, "keyboard move");
    await page.getByRole("button", { name: "右移" }).click();
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "narrow no page overflow");
    await page.goto(`${baseUrl}?print=1`, { waitUntil: "networkidle" });
    check(await page.locator("[data-analysis-flow]").count() === 0, "formal print isolation");
  });
} catch (error) { failures.push(`browser: ${error.message}`); }
console.log(JSON.stringify({ passed: failures.length === 0, checks: "static+browser", failures }, null, 2));
process.exit(failures.length ? 1 : 0);
