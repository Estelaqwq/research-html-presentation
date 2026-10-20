import { fingerprint, type PortableFlow } from "../portable-state";
export type FlowNode = { id: string; kind: string; title: string; description: string; color: "blue" | "cyan" | "red" | "gold"; x: number; y: number; referenceIds?: string[]; sectionId?: string };
export type FlowEdge = { id: string; from: string; to: string };
export type AnalysisFlowData = { schemaVersion: 1; generatedFrom?: Record<string, unknown>; nodes: FlowNode[]; edges: FlowEdge[] };

export function checkedGraph(value: unknown): AnalysisFlowData {
  const graph = value as AnalysisFlowData;
  if (graph?.schemaVersion !== 1 || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges) || graph.nodes.length > 500 || graph.edges.length > 2000) throw new Error("流程图结构或大小不受支持。");
  const ids = new Set<string>(), edges = new Set<string>(), pairs = new Set<string>();
  const text = (s: unknown, max: number): s is string => typeof s === "string" && s.length <= max;
  for (const node of graph.nodes) {
    if (!text(node.id, 200) || !node.id || ids.has(node.id) || !text(node.kind, 80) || !text(node.title, 2000) || !text(node.description, 20000) || !["blue", "cyan", "red", "gold"].includes(node.color) || !Number.isFinite(node.x) || !Number.isFinite(node.y) || node.x < 0 || node.y < 0 || node.x > 20000 || node.y > 20000 || (node.sectionId !== undefined && !text(node.sectionId, 200)) || (node.referenceIds !== undefined && (!Array.isArray(node.referenceIds) || !node.referenceIds.every(id => text(id, 200))))) throw new Error("流程节点含有无效字段或重复标识。");
    ids.add(node.id);
  }
  for (const edge of graph.edges) {
    const pair = JSON.stringify([edge.from, edge.to]);
    if (!text(edge.id, 200) || !edge.id || edges.has(edge.id) || !ids.has(edge.from) || !ids.has(edge.to) || edge.from === edge.to || pairs.has(pair)) throw new Error("流程连接含有重复、悬空或无效节点。");
    edges.add(edge.id); pairs.add(pair);
  }
  return JSON.parse(JSON.stringify(graph)) as AnalysisFlowData;
}
export async function flowTransfer(projectId: string, initial: AnalysisFlowData, graph: AnalysisFlowData): Promise<PortableFlow> {
  return { format: "zuel-analysis-flow", schemaVersion: 1, projectId, baselineHash: await fingerprint(JSON.stringify(initial)), graph: checkedGraph(graph) };
}
export async function parseFlowTransfer(value: unknown, projectId: string, initial: AnalysisFlowData) {
  const transfer = value as PortableFlow;
  if (transfer?.format !== "zuel-analysis-flow" || transfer.schemaVersion !== 1 || transfer.projectId !== projectId || transfer.baselineHash !== await fingerprint(JSON.stringify(initial))) throw new Error("流程文件属于其他报告或其他初始版本，未导入。");
  return checkedGraph(transfer.graph);
}
