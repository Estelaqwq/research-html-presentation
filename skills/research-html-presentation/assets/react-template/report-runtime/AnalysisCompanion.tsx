"use client";

import { useEffect, useId, useRef, useState } from "react";
import { answerQuestion, answerText, availableQuestions, type CompanionEvidence, type CompanionResult, type CompanionSelection } from "./analysis-companion";
import { runGuidedAnalysis, type GuidedOperation, type GuidedPlan } from "./companion-exploration";

type Note = { id: string; savedAt: string; evidenceVersion?: string; result: CompanionResult };
const storageKey = (projectId: string) => `zuel-analysis-companion:${projectId}:notes:v1`;
type NextStep = { label: string; plan: GuidedPlan };
function nextSteps(evidence: CompanionEvidence, result: CompanionResult | null): NextStep[] {
  if (!result) return [];
  const raw = result.plan;
  const measure = evidence.measures.find((item) => item.id === raw?.measureId);
  if (result.status === "answered" && measure && raw) {
    const groups = Array.isArray(raw.groups) ? raw.groups.filter((item): item is string => typeof item === "string" && measure.groups.includes(item)) : [];
    const to = typeof raw.to === "string" ? raw.to : typeof raw.year === "string" ? raw.year : "";
    const from = typeof raw.from === "string" ? raw.from : to;
    if (!groups.length || !to || !from) return [];
    const actions: NextStep[] = [];
    if (raw.kind === "single-year") {
      const other = measure.groups.find((item) => !groups.includes(item));
      if (other) actions.push({ label: `同年加入${other}比较`, plan: { operation: "single-year", measureId: measure.id, groups: [...groups, other], from: to, to } });
      const firstYear = measure.periods?.[0];
      if (measure.aggregation === "sum" && firstYear && firstYear < to) actions.push({ label: `查看${firstYear}—${to}年变化`, plan: { operation: "endpoint-change", measureId: measure.id, groups, from: firstYear, to } });
    }
    if (raw.kind === "period-total") actions.push({ label: "改看两端年度变化", plan: { operation: "endpoint-change", measureId: measure.id, groups, from, to } });
    if ((raw.kind === "period-total" || raw.kind === "endpoint-change") && measure.aggregation === "sum" && measure.groups.length > 1) {
      const endIndex = measure.periods?.indexOf(to) ?? -1;
      const alternative = measure.periods?.[Math.max(0, endIndex - 4)];
      if (alternative && alternative > from && alternative !== to) actions.push({ label: `终点改为${alternative}年，检查排序`, plan: { operation: "sensitivity", measureId: measure.id, groups: measure.groups, from, to, alternateTo: alternative } });
    }
    return actions.slice(0, 3);
  }
  if (result.status === "answered") return [];
  const query = result.question.toLocaleLowerCase();
  const matched = evidence.measures.filter((item) => [item.label, ...(item.queryTerms ?? [])].some((term) => query.includes(term.toLocaleLowerCase())));
  if (matched.length !== 1) return [];
  const target = matched[0];
  const matchedGroups = target.groups.filter((item) => [item, ...(target.groupAliases?.[item] ?? [])].some((name) => result.question.includes(name)));
  const chosen = matchedGroups.length === 1 ? matchedGroups : [];
  const first = target.periods?.[0], last = target.periods?.at(-1);
  if (!chosen.length || !first || !last) return [];
  if (target.aggregation === "sum" && first < last) return [{ label: `先确认${chosen[0]}的年度变化`, plan: { operation: "endpoint-change", measureId: target.id, groups: chosen, from: first, to: last } }];
  return [{ label: `查看${chosen[0]}${last}年的已登记值`, plan: { operation: "single-year", measureId: target.id, groups: chosen, from: last, to: last } }];
}

export function AnalysisCompanion({ evidence, projectId, activeFindingIds, activeSectionId, activeSectionTitle, printMode, llm, evidenceVersion = "unversioned" }: {
  evidence: CompanionEvidence; projectId: string; activeFindingIds: string[]; activeSectionId: string; activeSectionTitle: string; printMode: boolean;
  llm?: { enabled: boolean; apiPath: string }; evidenceVersion?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [questionScope, setQuestionScope] = useState<"section" | "all">("section");
  const defaultQuestionId = evidence.questions[0]?.id ?? "";
  const defaultMeasureId = evidence.measures[0]?.id ?? "";
  const [questionId, setQuestionId] = useState(defaultQuestionId);
  const [measureId, setMeasureId] = useState(defaultMeasureId);
  const measure = evidence.measures.find((item) => item.id === measureId);
  const [group, setGroup] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [compareGroup, setCompareGroup] = useState("");
  const [operation, setOperation] = useState<GuidedOperation>("single-year");
  const [alternateTo, setAlternateTo] = useState("");
  const [result, setResult] = useState<CompanionResult | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [storageError, setStorageError] = useState("");
  const [busy, setBusy] = useState(false);
  const [connectionMode, setConnectionMode] = useState("");
  const pendingRef = useRef<AbortController | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const sectionSuggestions = availableQuestions(evidence, activeFindingIds, activeSectionId);
  const allSuggestions = availableQuestions(evidence, evidence.questions.map((item) => item.findingId));
  const suggestions = questionScope === "section" ? sectionSuggestions : allSuggestions;
  const contextualSteps = nextSteps(evidence, result);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey(projectId));
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) setNotes(parsed.filter((item) => item?.result?.status === "answered").slice(0, 100));
      }
    } catch { setStorageError("本地笔记不可读取；本次会话仍可继续探索。"); }
  }, [projectId]);
  useEffect(() => { if (open) panelRef.current?.focus(); }, [open]);
  useEffect(() => {
    const onEvidence = (event: Event) => {
      const detail = (event as CustomEvent<{ measureId?: string; group?: string; year?: string }>).detail;
      const selected = evidence.measures.find((item) => item.id === detail?.measureId);
      if (!selected) return;
      const chosenGroup = detail.group && selected.groups.includes(detail.group) ? detail.group : selected.groups[0];
      const chosenYear = detail.year && selected.periods?.includes(detail.year) ? detail.year : selected.periods?.at(-1) ?? "";
      if (!chosenGroup || !chosenYear) return;
      setMeasureId(selected.id); setGroup(chosenGroup); setCompareGroup(""); setFrom(chosenYear); setTo(chosenYear); setOperation("single-year"); setResult(null);
      setQuery(`${chosenYear} 年${chosenGroup}${selected.queryTerms?.[0] ?? selected.label}是多少？`);
      setOpen(true);
    };
    window.addEventListener("zuel:companion-evidence", onEvidence);
    return () => window.removeEventListener("zuel:companion-evidence", onEvidence);
  }, [evidence]);
  useEffect(() => {
    if (!open || !llm?.enabled) return;
    let live = true;
    fetch(`${llm.apiPath}/status`, { credentials: "same-origin" }).then((response) => response.json()).then((status) => {
      if (live) setConnectionMode(status.modelAvailable ? status.mode === "mock" ? "离线模拟可用" : "模型服务已连接" : "模型未连接 · 确定性问答可用");
    }).catch(() => { if (live) setConnectionMode("服务未连接 · 已登记追问可用"); });
    return () => { live = false; };
  }, [open, llm?.enabled, llm?.apiPath]);
  useEffect(() => {
    if (!result || !open || !resultRef.current || !panelRef.current) return;
    const panel = panelRef.current;
    panel.scrollTo({ top: resultRef.current.offsetTop - panel.offsetTop - 14, behavior: "smooth" });
    resultRef.current.focus({ preventScroll: true });
  }, [result, open]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); toggleRef.current?.focus(); }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  if (printMode) return null;

  const selection = (): CompanionSelection => ({ measureId, group: group || measure?.groups[0] || "", ...(measure?.aggregation === "snapshot" ? { from: from || to || measure.periods?.at(-1), to: to || from || measure.periods?.at(-1) } : { ...(from ? { from } : {}), ...(to ? { to } : {}) }) });
  const runQuestion = (id: string) => { const chosen = evidence.questions.find((item) => item.id === id); if (!chosen) return; setMeasureId(chosen.measureId); setQuestionId(id); setFrom(chosen.defaultSelection?.from ?? ""); setTo(chosen.defaultSelection?.to ?? ""); setGroup(chosen.defaultSelection?.group ?? ""); setQuery(chosen.prompt); setResult(answerQuestion(evidence, id)); };
  const reset = () => { pendingRef.current?.abort(); pendingRef.current = null; setBusy(false); setMeasureId(defaultMeasureId); setQuestionId(defaultQuestionId); setGroup(""); setCompareGroup(""); setFrom(""); setTo(""); setAlternateTo(""); setOperation("single-year"); setResult(null); setQuery(""); };
  const runGuided = (plan: GuidedPlan) => { const next = runGuidedAnalysis(evidence, plan); setQuery(next.question); setResult(next); };
  const ask = async (text = query) => {
    if (!llm?.enabled) { setResult(answerText(evidence, text)); return; }
    pendingRef.current?.abort();
    const controller = new AbortController();
    pendingRef.current = controller;
    setBusy(true);
    try {
      const context = result?.status === "answered" && result.plan && result.resolvedQuestion ? { question: result.resolvedQuestion, plan: result.plan } : undefined;
      const response = await fetch(llm.apiPath, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: text, ...(context ? { context } : {}) }), signal: controller.signal, credentials: "same-origin" });
      if (!response.ok) throw new Error("研究助手服务暂不可用");
      const received: unknown = await response.json();
      if (!received || typeof received !== "object" || !("status" in received) || !("answer" in received)) throw new Error("研究助手返回了无效结果");
      if (!controller.signal.aborted) setResult(received as CompanionResult);
    } catch {
      if (!controller.signal.aborted) setResult({ ...answerText(evidence, text), fallbackReason: "模型服务未连接，已退回已登记问题的确定性问答。" });
    } finally {
      if (pendingRef.current === controller) { pendingRef.current = null; setBusy(false); }
    }
  };
  const save = () => {
    if (!result || result.status !== "answered") return;
    const next = [{ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, savedAt: new Date().toISOString(), evidenceVersion, result }, ...notes].slice(0, 100);
    try { localStorage.setItem(storageKey(projectId), JSON.stringify(next)); setNotes(next); setStorageError(""); }
    catch { setStorageError("笔记保存失败：浏览器本地存储不可用。"); }
  };
  const deleteNote = (id: string) => {
    const next = notes.filter((note) => note.id !== id);
    try { localStorage.setItem(storageKey(projectId), JSON.stringify(next)); setNotes(next); setStorageError(""); }
    catch { setStorageError("笔记删除失败：浏览器本地存储不可用。"); }
  };
  const exportNotes = () => {
    const lines = ["个人分析摘录", "以下内容来自读者临时探索，不属于正式报告结论。", ""];
    for (const note of notes) lines.push(`${note.savedAt}　${note.result.question}`, `证据版本：${note.evidenceVersion ?? "旧版未记录"}${note.evidenceVersion !== evidenceVersion ? "（与当前报告版本不同）" : ""}`, `结果状态：${note.result.answerStatus ?? "已核验数据计算"}`, note.result.answer, ...(note.result.aiExplanation ? [`AI 辅助说明：${note.result.aiExplanation}`] : []), `口径：${JSON.stringify(note.result.selection ?? {})}`, `方法：${note.result.method ?? ""}`, `计算记录：${JSON.stringify(note.result.analysisRecord ?? {})}`, `数据集：${note.result.datasetId ?? ""}；分析：${note.result.analysisId ?? ""}；变换：${note.result.transformIds.join(", ")}`, `来源：${note.result.sourceIds.join(", ")}；主张：${note.result.claimIds.join(", ")}；发现：${note.result.findingId ?? ""}；图表：${note.result.visualId ?? ""}`, `证据链接：${(note.result.citations ?? []).map((citation) => citation.url).join("、")}`, `局限：${note.result.limitations.join("；")}`, "");
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "个人分析摘录.txt"; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <div className="analysis-companion" data-analysis-companion="true" data-editor-lock="true">
    <button ref={toggleRef} className="analysis-companion-toggle" type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>研究助手</button>
    {open && <aside ref={panelRef} id={panelId} className="analysis-companion-panel" tabIndex={-1} aria-label="研究助手">
      <header><h2>研究助手</h2><button type="button" onClick={() => { setOpen(false); toggleRef.current?.focus(); }} aria-label="关闭研究助手">×</button></header>
      <section className="analysis-companion-ask" aria-label="证据问答" aria-busy={busy}><h3>你想了解什么？</h3>{llm?.enabled && <p className="analysis-companion-connection" role="status">{connectionMode || "正在检查连接…"}</p>}<form onSubmit={(event) => { event.preventDefault(); void ask(); }}><label className="analysis-companion-visually-hidden" htmlFor={`${panelId}-query`}>{llm?.enabled ? "输入有关本报告的问题" : "输入已登记的问题"}</label><input id={`${panelId}-query`} value={query} maxLength={400} placeholder={llm?.enabled ? "例如：日本排放下降了多少？" : "输入或选择已登记的问题"} onChange={(event) => setQuery(event.target.value)} /><button type="submit" aria-label="查询证据" disabled={busy || !query.trim()}>提问</button></form>{busy && <p role="status">正在核对数据与证据…</p>}</section>
      <section className="analysis-companion-prompts" aria-label="建议追问"><div className="analysis-companion-prompts-header"><h3>{questionScope === "section" ? "本节可以问" : "全部问题"}</h3><div role="group" aria-label="追问范围"><button type="button" aria-pressed={questionScope === "section"} onClick={() => setQuestionScope("section")}>本节</button><button type="button" aria-pressed={questionScope === "all"} onClick={() => setQuestionScope("all")}>全部</button></div></div>{questionScope === "section" && <p className="analysis-companion-context">{activeSectionTitle}</p>}{suggestions.length ? <div className="analysis-companion-suggestions">{suggestions.map((item) => <button key={item.id} type="button" onClick={() => runQuestion(item.id)}>{item.prompt}<span aria-hidden="true">→</span></button>)}</div> : <p>本节暂未登记可回答的追问。可查看全部问题。</p>}</section>
      {result && <section ref={resultRef} tabIndex={-1} className="analysis-companion-result" aria-live="polite" data-companion-status={result.status}>
        <h3>{result.status === "answered" ? "回答" : result.status === "clarify" ? "请明确分析口径" : "证据不足"}</h3>
        <p className="analysis-companion-result-question">{result.question}</p>
        {result.resolvedQuestion && result.resolvedQuestion !== result.question && <p className="analysis-companion-context">沿用上一问的已核验口径：{result.resolvedQuestion}</p>}
        <p className="analysis-companion-verification">{result.answerStatus ?? (result.status === "answered" ? "已核验数据计算" : "证据不足")}</p>
        <p className="analysis-companion-answer">{result.answer}</p>
        {result.aiExplanation && <p className="analysis-companion-ai-explanation"><strong>AI 辅助说明：</strong>{result.aiExplanation}</p>}
        {result.fallbackReason && <p className="analysis-companion-fallback">{result.fallbackReason}</p>}
        {result.status === "answered" && <>
          {result.citations?.length ? <div className="analysis-companion-citations"><strong>来源</strong>{result.citations.map((citation) => <a key={citation.citationId} href={citation.url} target="_blank" rel="noreferrer">{citation.title} ↗</a>)}</div> : null}
          <details className="analysis-companion-evidence"><summary>查看筛选口径、方法与局限</summary><dl>
            <dt>方法</dt><dd>{result.method}</dd>
            <dt>筛选口径</dt><dd>{result.analysisRecord ? JSON.stringify(result.analysisRecord.inputScope) : result.selection ? "groups" in result.selection ? `${result.selection.groups.join("、")}；${result.selection.from ?? ""}—${result.selection.to ?? result.selection.year ?? ""}` : `${result.selection.group}；${result.selection.from || "起始不限"}—${result.selection.to || "结束不限"}` : "登记的方法说明"}</dd>
            <dt>来源</dt><dd>{result.sourceIds.join("、")}</dd>
            <dt>分析与变换</dt><dd>{[result.analysisId, ...result.transformIds].filter(Boolean).join("、")}</dd>
            <dt>局限</dt><dd>{result.limitations.join("；") || "无额外登记局限"}</dd>
          </dl></details>
          {result.analysisRecord && <details><summary>查看可复核的计算记录</summary><pre>{JSON.stringify(result.analysisRecord, null, 2)}</pre></details>}
          {(result.visualId || result.findingId) && <button type="button" onClick={() => { const visual = result.visualId ? document.querySelector(`[data-visual-id="${CSS.escape(result.visualId)}"]`) : null; const finding = result.findingId ? [...document.querySelectorAll("[data-report-section]")].find((node) => node.getAttribute("data-finding-ids")?.split(" ").includes(result.findingId!)) : null; const target = visual ?? finding; target?.scrollIntoView({ behavior: "smooth", block: "center" }); target?.classList.add("analysis-companion-highlight"); window.setTimeout(() => target?.classList.remove("analysis-companion-highlight"), 2400); setOpen(false); }}>查看报告证据</button>}
          <button type="button" onClick={save}>保存到笔记</button>
        </>}
        {contextualSteps.length > 0 && <div className="analysis-companion-next"><strong>{result.status === "answered" ? "接下来可以检验" : "现有数据可以先做"}</strong>{contextualSteps.map((step) => <button key={step.label} type="button" onClick={() => runGuided(step.plan)}>{step.label} →</button>)}</div>}
        {result.status !== "answered" && !contextualSteps.length && suggestions.slice(0, 2).length > 0 && <div className="analysis-companion-next"><strong>可先查看已登记问题</strong>{suggestions.slice(0, 2).map((item) => <button key={item.id} type="button" onClick={() => runQuestion(item.id)}>{item.prompt} →</button>)}</div>}
        <button type="button" onClick={reset}>恢复报告口径</button>
      </section>}
      <GuidedBuilder evidence={evidence} measureId={measureId} group={group} compareGroup={compareGroup} from={from} to={to} alternateTo={alternateTo} operation={operation} onMeasure={setMeasureId} onGroup={setGroup} onCompareGroup={setCompareGroup} onFrom={setFrom} onTo={setTo} onAlternateTo={setAlternateTo} onOperation={setOperation} onRun={runGuided} onReset={reset} />
      <details className="analysis-companion-notebook"><summary>发现笔记本（{notes.length}）</summary><div><button type="button" disabled={!notes.length} onClick={exportNotes}>导出个人分析摘录</button>{storageError && <p role="alert">{storageError}</p>}{notes.map((note) => <div className="analysis-companion-note" key={note.id}><p>{note.result.answer}</p>{note.evidenceVersion !== evidenceVersion && <small>旧版证据摘录，请重新核对</small>}<button type="button" onClick={() => deleteNote(note.id)} aria-label={`删除笔记：${note.result.question}`}>删除</button></div>)}</div></details>
      <details className="analysis-companion-boundary"><summary>数据使用与隐私说明</summary><p>{llm?.enabled ? "提问文字和回答所需的最小证据会发送至已配置的模型服务。数值由核准数据计算，模型只辅助表述。" : "确定性问答只使用已登记的汇总数据。"} 探索结果与个人笔记不会改写正式报告或进入正式打印。</p></details>
    </aside>}
  </div>;
}

function GuidedBuilder({ evidence, measureId, group, compareGroup, from, to, alternateTo, operation, onMeasure, onGroup, onCompareGroup, onFrom, onTo, onAlternateTo, onOperation, onRun, onReset }: {
  evidence: CompanionEvidence; measureId: string; group: string; compareGroup: string; from: string; to: string; alternateTo: string; operation: GuidedOperation;
  onMeasure: (value: string) => void; onGroup: (value: string) => void; onCompareGroup: (value: string) => void; onFrom: (value: string) => void; onTo: (value: string) => void;
  onAlternateTo: (value: string) => void; onOperation: (value: GuidedOperation) => void; onRun: (plan: GuidedPlan) => void; onReset: () => void;
}) {
  const measure = evidence.measures.find((item) => item.id === measureId);
  if (!measure) return null;
  const years = measure.periods ?? [];
  const selectedFrom = from || (operation === "single-year" ? years.at(-1) : years[0]) || "";
  const selectedTo = to || years.at(-1) || "";
  const selectedAlternate = alternateTo || years[Math.max(0, years.indexOf(selectedTo) - 4)] || "";
  const plan: GuidedPlan = { operation, measureId, groups: operation === "sensitivity" ? measure.groups : [group || measure.groups[0], ...(compareGroup && compareGroup !== (group || measure.groups[0]) ? [compareGroup] : [])], from: operation === "single-year" ? selectedTo : selectedFrom, to: selectedTo, ...(operation === "sensitivity" ? { alternateTo: selectedAlternate } : {}) };
  const valid = Boolean(plan.groups.length && selectedTo && (operation === "single-year" || selectedFrom <= selectedTo) && (operation !== "sensitivity" || selectedAlternate > selectedFrom && selectedAlternate !== selectedTo));
  return <details className="analysis-companion-workspace"><summary>比较向导 · 选择口径与计算</summary><div className="analysis-companion-builder">
    <label>指标<select value={measureId} onChange={(event) => { const next = evidence.measures.find((item) => item.id === event.target.value); onMeasure(event.target.value); onGroup(""); onCompareGroup(""); onOperation("single-year"); onFrom(next?.periods?.at(-1) ?? ""); onTo(next?.periods?.at(-1) ?? ""); onAlternateTo(""); }}>{evidence.measures.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    <label>计算<select value={operation} onChange={(event) => onOperation(event.target.value as GuidedOperation)}><option value="single-year">单年值</option>{measure.aggregation === "sum" && <><option value="period-total">期间累计</option><option value="endpoint-change">绝对与相对变化</option>{measure.groups.length > 1 && <option value="sensitivity">终点年份敏感性</option>}</>}</select></label>
    {operation !== "sensitivity" && <div className="analysis-companion-time"><label>国家／分组<select value={group || measure.groups[0]} onChange={(event) => onGroup(event.target.value)}>{measure.groups.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label>加入比较<select value={compareGroup} onChange={(event) => onCompareGroup(event.target.value)}><option value="">不比较</option>{measure.groups.filter((item) => item !== (group || measure.groups[0])).map((item) => <option key={item} value={item}>{item}</option>)}</select></label></div>}
    {operation !== "single-year" && <label>起始年份<select value={selectedFrom} onChange={(event) => onFrom(event.target.value)}>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>}
    <label>{operation === "single-year" ? "查询年份" : "报告终点"}<select value={selectedTo} onChange={(event) => { onTo(event.target.value); if (operation === "single-year") onFrom(event.target.value); }}>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
    {operation === "sensitivity" && <label>对照终点<select value={selectedAlternate} onChange={(event) => onAlternateTo(event.target.value)}>{years.filter((year) => year > selectedFrom && year !== selectedTo).map((year) => <option key={year} value={year}>{year}</option>)}</select></label>}
    <p className="analysis-companion-builder-scope">将计算：{valid ? guidedLabel(plan, measure.label) : "请调整年份，使比较范围有效"}。正式报告图表与结论不会改变。</p>
    <div className="analysis-companion-actions"><button type="button" disabled={!valid} onClick={() => onRun(plan)}>执行已核准分析</button><button type="button" onClick={onReset}>恢复报告口径</button></div>
  </div></details>;
}

function guidedLabel(plan: GuidedPlan, label: string) {
  const who = plan.operation === "sensitivity" ? `${plan.groups.length} 个分组` : plan.groups.join("、");
  if (plan.operation === "single-year") return `${who} ${plan.to} 年${label}单年值`;
  if (plan.operation === "period-total") return `${who} ${plan.from}—${plan.to} 年${label}期间累计`;
  if (plan.operation === "endpoint-change") return `${who} ${plan.from}—${plan.to} 年${label}两端变化`;
  return `${who}以${plan.from}年为起点，比较${plan.to}与${plan.alternateTo}两个终点的排序`;
}
