"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { checkedGraph, flowTransfer, parseFlowTransfer, type FlowNode, type AnalysisFlowData } from "./analysis-flow-transfer";
import { downloadBlob, embeddedFlow, portableStorageSuffix, registerPortableFlow } from "../portable-state";
export type { FlowNode, FlowEdge, AnalysisFlowData } from "./analysis-flow-transfer";
type History = { past: AnalysisFlowData[]; present: AnalysisFlowData; future: AnalysisFlowData[] };

const clone = (data: AnalysisFlowData): AnalysisFlowData => JSON.parse(JSON.stringify(data));
const colors: FlowNode["color"][] = ["blue", "cyan", "red", "gold"];
const bounds = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const keyFor = (projectId: string) => `zuel:analysis-flow:${projectId}${portableStorageSuffix(projectId)}`;
const load = (projectId: string, initial: AnalysisFlowData) => {
  try {
    const saved = JSON.parse(localStorage.getItem(keyFor(projectId)) ?? "null");
    if (saved) return checkedGraph(saved);
  } catch { /* storage unavailable: editable in this session */ }
  return clone(initial);
};

export function AnalysisFlow({ initial, projectId }: { initial: AnalysisFlowData; projectId: string }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [history, setHistory] = useState<History>(() => ({ past: [], present: load(projectId, initial), future: [] }));
  const [saved, setSaved] = useState(() => JSON.stringify(load(projectId, initial)));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [status, setStatus] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; pointerX: number; pointerY: number; x: number; y: number; moved: boolean } | null>(null);
  const graph = history.present;
  const dirty = JSON.stringify(graph) !== saved;
  const selected = graph.nodes.find((node) => node.id === selectedId);
  const width = Math.max(1200, ...graph.nodes.map((node) => node.x + 235));
  const height = Math.max(560, ...graph.nodes.map((node) => node.y + 155));
  const nodeById = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);

  const change = (mutate: (draft: AnalysisFlowData) => void) => {
    setHistory((current) => {
      const next = clone(current.present);
      mutate(next);
      return { past: [...current.past.slice(-49), current.present], present: next, future: [] };
    });
    setStatus("");
    setConfirmReset(false);
  };
  const undo = () => setHistory((current) => current.past.length ? { past: current.past.slice(0, -1), present: current.past.at(-1)!, future: [current.present, ...current.future] } : current);
  const redo = () => setHistory((current) => current.future.length ? { past: [...current.past, current.present], present: current.future[0], future: current.future.slice(1) } : current);
  const save = () => {
    try { localStorage.setItem(keyFor(projectId), JSON.stringify(graph)); setSaved(JSON.stringify(graph)); setStatus("已保存到此浏览器。"); }
    catch { setStatus("保存失败：浏览器本地存储不可用。"); }
  };
  const reset = () => {
    const baseline = clone(initial);
    try {
      localStorage.setItem(keyFor(projectId), JSON.stringify(baseline));
      setSaved(JSON.stringify(baseline));
      setHistory({ past: [], present: baseline, future: [] });
      setSelectedId(null);
      setConfirmReset(false);
      setStatus("已恢复初始流程图。");
    } catch { setStatus("恢复失败：浏览器本地存储不可用。"); }
  };
  const close = () => {
    if (dirty && !window.confirm("流程图还有未保存的修改，确定关闭吗？")) return;
    setOpen(false);
    setEditing(false);
    setConfirmReset(false);
    toggleRef.current?.focus();
  };
  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close(); return; }
      if (event.key !== "Tab") return;
      const items = [...(panelRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href]") ?? [])].filter((item) => item.getClientRects().length);
      if (!items.length) return;
      const first = items[0], last = items.at(-1)!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, dirty]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const patchNode = (id: string, patch: Partial<FlowNode>) => change((draft) => { const node = draft.nodes.find((item) => item.id === id); if (node) Object.assign(node, patch); });
  const move = (id: string, dx: number, dy: number) => {
    const node = nodeById.get(id);
    if (node) patchNode(id, { x: bounds(node.x + dx, 10, 1800), y: bounds(node.y + dy, 10, 2000) });
  };
  const addNode = () => {
    const id = `custom:${crypto.randomUUID()}`;
    change((draft) => draft.nodes.push({ id, kind: "custom", title: "新步骤", description: "点击此处填写说明。", color: "blue", x: 60 + (draft.nodes.length % 4) * 250, y: 80 + Math.floor(draft.nodes.length / 4) * 155 }));
    setSelectedId(id);
    requestAnimationFrame(() => stageRef.current?.querySelector<HTMLElement>(`[data-flow-node-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" }));
  };
  const removeNode = (id: string) => {
    change((draft) => { draft.nodes = draft.nodes.filter((node) => node.id !== id); draft.edges = draft.edges.filter((edge) => edge.from !== id && edge.to !== id); });
    setSelectedId(null);
  };
  const addEdge = () => {
    if (!fromId || !toId || fromId === toId) { setStatus("请选择两个不同的节点。"); return; }
    if (graph.edges.some((edge) => edge.from === fromId && edge.to === toId)) { setStatus("这条连接已存在。"); return; }
    change((draft) => draft.edges.push({ id: `edge:${crypto.randomUUID()}`, from: fromId, to: toId }));
  };
  const importGraph = async (file: File) => {
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error("流程文件超过2 MB，无法导入。");
      const next = await parseFlowTransfer(JSON.parse(await file.text()), projectId, initial);
      change(draft => Object.assign(draft, next));
      setSelectedId(null); setStatus("流程已导入；点击保存可保留到此浏览器。");
    } catch (error) { setStatus(error instanceof Error ? error.message : String(error)); }
  };
  const exportGraph = async () => {
    try { downloadBlob(new Blob([JSON.stringify(await flowTransfer(projectId, initial, graph), null, 2)], { type: "application/json" }), "分析流程_修改.json"); setStatus("流程文件已导出，可在同一报告的其他设备中导入。"); }
    catch (error) { setStatus(error instanceof Error ? error.message : String(error)); }
  };
  useEffect(() => registerPortableFlow(projectId,
    () => flowTransfer(projectId, initial, graph),
    value => parseFlowTransfer(value, projectId, initial),
    value => { const next = checkedGraph(value); change(draft => Object.assign(draft, next)); setSelectedId(null); setStatus("流程已随报告修改导入，请保存。"); }), [graph, initial, projectId]);
  useEffect(() => {
    let cancelled = false;
    const transfer = embeddedFlow(projectId);
    let savedLocally = false;
    try { savedLocally = Boolean(localStorage.getItem(keyFor(projectId))); } catch { /* embedded state still works */ }
    if (transfer && !savedLocally) void parseFlowTransfer(transfer, projectId, initial).then(next => {
      if (!cancelled) { setHistory({ past: [], present: next, future: [] }); setSaved(JSON.stringify(next)); }
    }).catch(error => { if (!cancelled) setStatus(String(error.message ?? error)); });
    return () => { cancelled = true; };
  }, [initial, projectId]);
  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>, node: FlowNode) => {
    if (!editing) return;
    dragRef.current = { id: node.id, pointerX: event.clientX, pointerY: event.clientY, x: node.x, y: node.y, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || !editing) return;
    const dx = event.clientX - drag.pointerX, dy = event.clientY - drag.pointerY;
    if (Math.abs(dx) + Math.abs(dy) < 4 && !drag.moved) return;
    drag.moved = true;
    const x = bounds(Math.round((drag.x + dx) / 10) * 10, 10, 1800);
    const y = bounds(Math.round((drag.y + dy) / 10) * 10, 10, 2000);
    const el = stageRef.current?.querySelector<HTMLElement>(`[data-flow-node-id="${CSS.escape(drag.id)}"]`);
    if (el) { el.style.left = `${x}px`; el.style.top = `${y}px`; }
  };
  const onPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    if (!drag.moved) return;
    const x = bounds(Math.round((drag.x + event.clientX - drag.pointerX) / 10) * 10, 10, 1800);
    const y = bounds(Math.round((drag.y + event.clientY - drag.pointerY) / 10) * 10, 10, 2000);
    patchNode(drag.id, { x, y });
  };
  const onNodeKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, id: string) => {
    if (!editing || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const delta = event.shiftKey ? 40 : 10;
    move(id, event.key === "ArrowLeft" ? -delta : event.key === "ArrowRight" ? delta : 0, event.key === "ArrowUp" ? -delta : event.key === "ArrowDown" ? delta : 0);
  };

  return <div className="analysis-flow-entry" data-analysis-flow="true" data-editor-lock="true">
    <button ref={toggleRef} className="analysis-flow-toggle" type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>分析流程</button>
    {open && <div className="analysis-flow-backdrop">
      <div ref={panelRef} className="analysis-flow-dialog" role="dialog" aria-modal="true" aria-label="分析流程图" tabIndex={-1}>
        <header className="analysis-flow-header"><div><p>DATA TO REPORT</p><h2>分析流程图</h2></div><div className="analysis-flow-header-actions"><button type="button" onClick={() => setEditing((value) => !value)} aria-pressed={editing}>{editing ? "退出编辑" : "编辑流程图"}</button><button type="button" aria-label="关闭分析流程图" onClick={close}>关闭</button></div></header>
        <p className="analysis-flow-intro">点击节点查看说明。作者可以自由修改展示内容；初始版本可随时恢复。</p>
        <label className="analysis-flow-jump">定位节点<select value={selectedId ?? ""} onChange={(event) => { const id = event.target.value; setSelectedId(id || null); const node = graph.nodes.find((item) => item.id === id); if (node) stageRef.current?.parentElement?.scrollTo({ left: Math.max(0, node.x - 24), top: Math.max(0, node.y - 24), behavior: "smooth" }); }}><option value="">选择流程中的步骤</option>{graph.nodes.map((node) => <option key={node.id} value={node.id}>{node.title}</option>)}</select></label>
        {editing && <div className="analysis-flow-toolbar" aria-label="流程图编辑操作"><button type="button" onClick={addNode}>新增节点</button><button type="button" onClick={undo} disabled={!history.past.length}>撤销</button><button type="button" onClick={redo} disabled={!history.future.length}>重做</button><button type="button" onClick={save} disabled={!dirty}>保存</button><button type="button" onClick={() => void exportGraph()}>导出流程</button><button type="button" onClick={() => importRef.current?.click()}>导入流程</button><input ref={importRef} type="file" accept=".json,application/json" hidden aria-label="选择流程修改文件" onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) void importGraph(file); }} /><button type="button" onClick={() => setConfirmReset(true)}>恢复初始版</button><span>{dirty ? "有未保存修改" : "已保存"}</span></div>}
        {confirmReset && <div className="analysis-flow-confirm" role="alertdialog" aria-label="确认恢复初始版"><p>恢复后，当前流程图修改将被清除。确定恢复吗？</p><button type="button" onClick={reset}>确定恢复</button><button type="button" onClick={() => setConfirmReset(false)}>取消</button></div>}
        {status && <p className="analysis-flow-status" role="status">{status}</p>}
        <div className="analysis-flow-body">
          <div className="analysis-flow-scroll" aria-label="流程图画布"><div ref={stageRef} className="analysis-flow-stage" style={{ width, height }}>
            <svg className="analysis-flow-lines" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true"><defs><marker id="analysis-flow-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#8ba6c4"/></marker></defs>{graph.edges.map((edge) => { const from = nodeById.get(edge.from), to = nodeById.get(edge.to); if (!from || !to) return null; const startX = from.x + 210, startY = from.y + 44, endX = to.x, endY = to.y + 44; return <path key={edge.id} d={`M ${startX} ${startY} C ${startX + 50} ${startY}, ${endX - 50} ${endY}, ${endX} ${endY}`} fill="none" stroke="#8ba6c4" strokeWidth="2" markerEnd="url(#analysis-flow-arrow)"/>; })}</svg>
            {graph.nodes.map((node) => <button key={node.id} type="button" className={`analysis-flow-node is-${node.color} ${selectedId === node.id ? "is-selected" : ""}`} data-flow-node-id={node.id} style={{ left: node.x, top: node.y }} aria-pressed={selectedId === node.id} aria-label={`${node.title}，点击查看说明${editing ? "；方向键移动，按住 Shift 加速" : ""}`} onClick={() => setSelectedId(node.id)} onKeyDown={(event) => onNodeKeyDown(event, node.id)} onPointerDown={(event) => onPointerDown(event, node)} onPointerMove={onPointerMove} onPointerUp={onPointerUp}><small>{node.kind === "dataset" ? "原始数据" : node.kind === "transform" ? "数据处理" : node.kind === "analysis" ? "分析发现" : node.kind === "report" ? "正式报告" : "自定义步骤"}</small><strong>{node.title}</strong></button>)}
          </div></div>
          <aside className="analysis-flow-details" aria-label="节点详情与编辑">
            {selected ? <><h3>{selected.title}</h3><p>{selected.description}</p>{selected.referenceIds?.length ? <p className="analysis-flow-refs">初始关联：{selected.referenceIds.join("、")}</p> : null}{selected.sectionId && <a href={`#${selected.sectionId}`} onClick={close}>查看对应报告章节 →</a>}
              {editing && <div className="analysis-flow-fields"><label>节点名称<input value={selected.title} onChange={(event) => patchNode(selected.id, { title: event.target.value })}/></label><label>说明<textarea rows={5} value={selected.description} onChange={(event) => patchNode(selected.id, { description: event.target.value })}/></label><label>颜色<select value={selected.color} onChange={(event) => patchNode(selected.id, { color: event.target.value as FlowNode["color"] })}>{colors.map((color) => <option key={color} value={color}>{color === "blue" ? "深蓝" : color === "cyan" ? "青蓝" : color === "red" ? "暗红" : "暖金"}</option>)}</select></label><div className="analysis-flow-move"><span>移动节点</span><button type="button" onClick={() => move(selected.id, -20, 0)}>左移</button><button type="button" onClick={() => move(selected.id, 20, 0)}>右移</button><button type="button" onClick={() => move(selected.id, 0, -20)}>上移</button><button type="button" onClick={() => move(selected.id, 0, 20)}>下移</button></div><button type="button" className="analysis-flow-delete" onClick={() => removeNode(selected.id)}>删除此节点及相关连接</button></div>}
            </> : <p>选择一个节点查看详细说明。</p>}
            {editing && <div className="analysis-flow-edges"><h3>连接线</h3><div className="analysis-flow-edge-form"><label>从<select value={fromId} onChange={(event) => setFromId(event.target.value)}><option value="">选择节点</option>{graph.nodes.map((node) => <option key={node.id} value={node.id}>{node.title}</option>)}</select></label><label>到<select value={toId} onChange={(event) => setToId(event.target.value)}><option value="">选择节点</option>{graph.nodes.map((node) => <option key={node.id} value={node.id}>{node.title}</option>)}</select></label><button type="button" onClick={addEdge}>添加连接</button></div><ul>{graph.edges.map((edge) => <li key={edge.id}><span>{nodeById.get(edge.from)?.title ?? edge.from} → {nodeById.get(edge.to)?.title ?? edge.to}</span><button type="button" onClick={() => change((draft) => { draft.edges = draft.edges.filter((item) => item.id !== edge.id); })} aria-label={`删除连接：${nodeById.get(edge.from)?.title} 到 ${nodeById.get(edge.to)?.title}`}>删除</button></li>)}</ul></div>}
          </aside>
        </div>
      </div>
    </div>}
  </div>;
}
