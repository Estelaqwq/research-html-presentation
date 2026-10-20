import { useEffect, useState, type ReactNode } from "react";

export type ReportWorkStatus = "completed" | "in-progress" | "method-ready" | "pending" | "verification-needed" | "not-adopted";
const statusLabels: Record<ReportWorkStatus, string> = { completed: "已完成", "in-progress": "进行中", "method-ready": "方法已明确 · 尚未开展", pending: "待开展", "verification-needed": "待核验", "not-adopted": "尝试后未采用" };

/** Deliberately limited inline emphasis; report copy never executes supplied HTML. */
export function ReportText({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => part.startsWith("**") && part.endsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> : part)}</>;
}

export function ReportStatus({ value }: { value: ReportWorkStatus }) {
  return <span className={`general-report-status status-${value}`}>{statusLabels[value]}</span>;
}

export function ReportOverview({ items }: { items: Array<{ id: string; title: string; detail?: string }> }) {
  return <div className="general-report-overview">{items.map(item => <div key={item.id}><strong>{item.title}</strong>{item.detail && <p><ReportText text={item.detail} /></p>}</div>)}</div>;
}

export function ReportProcess({ steps }: { steps: Array<{ id: string; title: string; detail?: string }> }) {
  return <ol className="general-report-process" aria-label="操作步骤">{steps.map((step, index) => <li key={step.id}><small data-small-text>{String(index + 1).padStart(2, "0")}</small><h3>{step.title}</h3>{step.detail && <p><ReportText text={step.detail} /></p>}</li>)}</ol>;
}

export function ReportComparison({ columns, rows }: { columns: string[]; rows: Array<{ id: string; cells: string[] }> }) {
  return <div className="general-report-table-scroll"><table className="general-report-comparison"><thead><tr>{columns.map((column, index) => <th key={index} scope="col">{column}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.id}>{row.cells.map((cell, index) => <td key={index} data-label={columns[index]}><ReportText text={cell} /></td>)}</tr>)}</tbody></table></div>;
}

export function ReportProgress({ completed, total, unit = "项", scope, asOf, approximate = false }: { completed: number; total: number; unit?: string; scope: string; asOf?: string; approximate?: boolean }) {
  if (!Number.isFinite(completed) || !Number.isFinite(total) || total <= 0 || completed < 0 || completed > total) throw new Error("Progress requires a positive total and completed between zero and total");
  const share = completed / total * 100;
  return <figure className="general-report-progress"><figcaption>{scope}</figcaption><div className="general-report-progress-values"><strong>{approximate ? "约" : ""}{completed.toLocaleString()}／{total.toLocaleString()}{unit}</strong><span>{approximate ? "约" : ""}{share.toFixed(1)}%</span></div><div className="general-report-progress-track" role="progressbar" aria-label={scope} aria-valuemin={0} aria-valuemax={total} aria-valuenow={completed} data-chart-host="true" data-chart-form="completion-share" data-editor-lock="true"><i data-chart-bar="true" style={{ width: `${share}%` }} /></div>{asOf && <small data-small-text>截至{asOf}</small>}</figure>;
}

function useReportInteraction(defaultId: string, printMode: boolean) {
  const [active, setActive] = useState(defaultId);
  const [printing, setPrinting] = useState(printMode);
  useEffect(() => { setPrinting(printMode); }, [printMode]);
  useEffect(() => {
    const reset = () => setActive(defaultId);
    const before = () => setPrinting(true);
    const after = () => setPrinting(false);
    window.addEventListener("report-reset", reset); window.addEventListener("beforeprint", before); window.addEventListener("afterprint", after);
    return () => { window.removeEventListener("report-reset", reset); window.removeEventListener("beforeprint", before); window.removeEventListener("afterprint", after); };
  }, [defaultId]);
  return { active, setActive, printing };
}

export function ReportTabs({ id, options, printMode = false }: { id: string; options: Array<{ id: string; label: string; content: ReactNode }>; printMode?: boolean }) {
  const state = useReportInteraction(options[0]?.id ?? "", printMode);
  return <div className="general-report-tabs" data-report-widget="tabs"><div role="tablist" aria-label="切换方案或示例" data-report-interaction-control="true" data-editor-lock="true">{options.map((option, index) => <button key={option.id} id={`${id}-tab-${option.id}`} role="tab" aria-selected={state.active === option.id} aria-controls={`${id}-panel-${option.id}`} tabIndex={state.active === option.id ? 0 : -1} onClick={() => state.setActive(option.id)} onKeyDown={event => { let next = index; if (event.key === "ArrowRight") next = (index + 1) % options.length; else if (event.key === "ArrowLeft") next = (index + options.length - 1) % options.length; else if (event.key === "Home") next = 0; else if (event.key === "End") next = options.length - 1; else return; event.preventDefault(); state.setActive(options[next].id); document.getElementById(`${id}-tab-${options[next].id}`)?.focus(); }}>{option.label}</button>)}</div>{options.map(option => <div key={option.id} id={`${id}-panel-${option.id}`} role="tabpanel" aria-labelledby={`${id}-tab-${option.id}`} hidden={!state.printing && state.active !== option.id}><h4 className="general-report-print-label" data-editor-lock="true">{option.label}</h4>{option.content}</div>)}</div>;
}

export function ReportCaseViewer({ id, cases, printMode = false }: { id: string; cases: Array<{ id: string; title: string; summary: string; evidence?: string; status?: ReportWorkStatus }>; printMode?: boolean }) {
  const state = useReportInteraction(cases[0]?.id ?? "", printMode);
  return <div className="general-report-cases" data-report-widget="cases"><div className="general-report-case-selector" data-report-interaction-control="true" data-editor-lock="true">{cases.map(item => <button key={item.id} type="button" aria-pressed={item.id === state.active} aria-controls={`${id}-case-${item.id}`} onClick={() => state.setActive(item.id)}>{item.title}</button>)}</div><div className="general-report-case-body" aria-live="polite">{cases.map(item => <article key={item.id} id={`${id}-case-${item.id}`} hidden={!state.printing && state.active !== item.id}><h3>{item.title}</h3>{item.status && <ReportStatus value={item.status} />}<p><ReportText text={item.summary} /></p>{item.evidence && <p className="general-report-case-evidence"><ReportText text={item.evidence} /></p>}</article>)}</div></div>;
}

export function ReportDetails({ label, children, printMode = false, speaking = false, readingExpanded = false }: { label: string; children: ReactNode; printMode?: boolean; speaking?: boolean; readingExpanded?: boolean }) {
  const [open, setOpen] = useState(readingExpanded && !speaking), [printing, setPrinting] = useState(printMode);
  useEffect(() => { if (readingExpanded) setOpen(!speaking); }, [readingExpanded, speaking]);
  useEffect(() => { setPrinting(printMode); }, [printMode]);
  useEffect(() => { const reset = () => setOpen(readingExpanded && !speaking); const before = () => setPrinting(true); const after = () => setPrinting(false); window.addEventListener("report-reset", reset); window.addEventListener("beforeprint", before); window.addEventListener("afterprint", after); return () => { window.removeEventListener("report-reset", reset); window.removeEventListener("beforeprint", before); window.removeEventListener("afterprint", after); }; }, [readingExpanded, speaking]);
  return <details className="general-report-details" open={printing || open} onToggle={event => { if (!printing) setOpen(event.currentTarget.open); }}><summary>{label}</summary><div>{children}</div></details>;
}
