#!/usr/bin/env node
import { readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] ?? ".");
const target = path.join(root, "analysis-flow.json");
const force = process.argv.includes("--force");
const readJson = async (name) => JSON.parse(await readFile(path.join(root, name), "utf8"));
const manifest = await readJson("deck-manifest.json");
if (manifest.profile !== "dataset-report" || manifest.outputMode !== "scroll-report") throw new Error("Analysis flow is available only for dataset scroll reports");
const evidence = await readJson(manifest.evidenceRegistry ?? "evidence-visuals.json");
try {
  await access(target);
  const existing = await readJson("analysis-flow.json");
  if (!force && existing.nodes?.length) throw new Error("Initial analysis-flow.json already exists; refusing to overwrite its restore baseline");
} catch (error) {
  if (error?.code !== "ENOENT" && !String(error?.message).includes("already exists")) throw error;
  if (String(error?.message).includes("already exists")) throw error;
}

const safeId = (kind, id) => `${kind}:${String(id)}`;
const nodes = [];
const edges = [];
const seenEdges = new Set();
const addEdge = (from, to) => {
  if (from === to || !nodes.some((n) => n.id === from) || !nodes.some((n) => n.id === to)) return;
  const id = `${from}->${to}`;
  if (!seenEdges.has(id)) { seenEdges.add(id); edges.push({ id, from, to }); }
};
const datasets = evidence.datasets ?? [];
const transforms = evidence.transforms ?? [];
const analyses = evidence.analyses ?? [];
const datasetId = (d) => d.datasetId ?? d.id;
const transformId = (t) => t.transformId ?? t.id;
const analysisId = (a) => a.analysisId ?? a.id;
for (const d of datasets) {
  const id = datasetId(d);
  if (!id) continue;
  nodes.push({ id: safeId("dataset", id), kind: "dataset", title: d.taskRole || path.basename(d.sourceRef ?? id), description: [d.rowCount != null ? `${d.rowCount} 条原始记录` : "", d.observationGrain ?? "", d.sourceRef ? `来源：${d.sourceRef}` : ""].filter(Boolean).join("；"), color: "blue", x: 40, y: 40, referenceIds: [id] });
}
for (const t of transforms) {
  const id = transformId(t);
  if (!id) continue;
  nodes.push({ id: safeId("transform", id), kind: "transform", title: t.operation ?? id, description: [t.rationale, t.affectedRows != null ? `涉及 ${t.affectedRows} 条记录` : "", t.parameters ? `参数：${JSON.stringify(t.parameters)}` : ""].filter(Boolean).join("；"), color: "cyan", x: 300, y: 40, referenceIds: [id, ...(t.datasetId ? [t.datasetId] : [])] });
}
for (const a of analyses) {
  const id = analysisId(a);
  if (!id) continue;
  const section = (manifest.sections ?? []).find((s) => (s.findingIds ?? []).includes(id) && s.role !== "hero");
  nodes.push({ id: safeId("analysis", id), kind: "analysis", title: a.question ?? id, description: [a.findingStatement, a.method ? `方法：${a.method}` : ""].filter(Boolean).join("；"), color: "red", x: 560, y: 40, referenceIds: [id, ...(a.transformIds ?? [])], sectionId: section?.id });
}
nodes.push({ id: "report:final", kind: "report", title: manifest.title, description: `${(manifest.sections ?? []).length} 个报告章节；点击左侧导航可逐节阅读。`, color: "blue", x: 1080, y: 40, referenceIds: (manifest.sections ?? []).map((s) => s.id), sectionId: manifest.sections?.find((s) => s.role === "synthesis")?.id });

for (const t of transforms) if (t.datasetId) addEdge(safeId("dataset", t.datasetId), safeId("transform", transformId(t)));
for (const a of analyses) {
  const chain = (a.transformIds ?? []).filter((id) => nodes.some((n) => n.id === safeId("transform", id)));
  for (let i = 1; i < chain.length; i++) addEdge(safeId("transform", chain[i - 1]), safeId("transform", chain[i]));
  if (chain.length) addEdge(safeId("transform", chain.at(-1)), safeId("analysis", analysisId(a)));
  else if (a.datasetId) addEdge(safeId("dataset", a.datasetId), safeId("analysis", analysisId(a)));
  addEdge(safeId("analysis", analysisId(a)), "report:final");
}
const depth = new Map(nodes.filter((n) => n.kind === "dataset").map((n) => [n.id, 0]));
for (let pass = 0; pass < nodes.length; pass++) for (const edge of edges) depth.set(edge.to, Math.max(depth.get(edge.to) ?? 0, (depth.get(edge.from) ?? 0) + 1));
const columns = new Map();
for (const node of nodes) {
  const d = Math.min(5, depth.get(node.id) ?? 0);
  const index = columns.get(d) ?? 0;
  columns.set(d, index + 1);
  node.x = 26 + d * 230;
  node.y = 45 + index * 155;
}
const result = { schemaVersion: 1, generatedFrom: { evidenceRegistry: manifest.evidenceRegistry ?? "evidence-visuals.json", datasetIds: datasets.map(datasetId).filter(Boolean), transformIds: transforms.map(transformId).filter(Boolean), analysisIds: analyses.map(analysisId).filter(Boolean) }, nodes, edges };
await writeFile(target, JSON.stringify(result, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ path: target, nodes: nodes.length, edges: edges.length }));
