import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { healthHighlights } from "./health-highlights";

type Count = number | null;
export type DataHealthReport = {
  schemaVersion: 1; status: "pending" | "ready"; title: string;
  provenance?: { datasetId: string; sourceIds: string[]; sourceHash: string; rowsHash: string; transformIds: string[]; generatedAt: string };
  summary: { records: Count; duplicateExtraRecords: Count; duplicateKeyGroups: Count; incompleteKeyRecords: Count };
  fields: Array<{ id: string; label: string; type: string; unit: string; records: Count; valid: Count; missing: Count; invalid: Count }>;
  coverage: Array<{ groupId: string; label: string; periods: Array<{ period: string; records: Count }>; outsidePeriods: Count; missingPeriods: Count }>;
  anomalies: Array<{ fieldId: string; label: string; method: string; checked: Count; flagged: Count; status: "checked" | "insufficient" }>;
  usage: Array<{ analysisId: string; label: string; scope: string; reason: string; status: "registered" | "unregistered"; used: Count; notSelected: Count; sectionId?: string }>;
  limitations: string[];
};
const count = (n: Count) => n === null ? "未公开／未登记" : n.toLocaleString("zh-CN");

/** Derived diagnostics only; authoritative data and citations are supplied by their existing registries. */
export function DataHealth({ report, sources = [] }: { report: DataHealthReport; sources?: Array<{ id: string; label: string; href?: string }> }) {
  const [open, setOpen] = useState(false), [tab, setTab] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null), dialog = useRef<HTMLDialogElement>(null), tabsRef = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/:/g,""), titleId = `${uid}-title`;
  const highlights = healthHighlights(report);
  const highlight = (item: typeof highlights[number], index: number) => <li key={index} data-health-highlight={item.kind}><strong>{item.title}</strong><p>{item.detail}</p><button type="button" onClick={() => { setTab(item.tab); requestAnimationFrame(() => tabsRef.current?.querySelector<HTMLButtonElement>(`#${uid}-tab-${item.tab}`)?.focus()); }}>查看相关检查 →</button></li>;
  const tabs = ["体检概览", report.coverage.length ? "年份／时段覆盖" : "字段覆盖", "异常值提示", "分析使用范围"];
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) { dialog.current.close(); trigger.current?.focus({preventScroll:true}); }
  }, [open]);
  useEffect(() => { if (!open) return; const before=document.body.style.overflow; document.body.style.overflow="hidden"; return () => {document.body.style.overflow=before;}; }, [open]);
  const printMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("print") === "1";
  if (printMode) return null;
  return <div className="data-health" data-data-health="true" data-editor-lock="true">
    <button className="data-health-open" ref={trigger} type="button" aria-haspopup="dialog" aria-controls={`${uid}-dialog`} aria-expanded={open} onClick={()=>{setTab(0);setOpen(true);}}>查看数据体检 ↗</button>
    {createPortal(<dialog ref={dialog} id={`${uid}-dialog`} className="data-health-dialog" aria-modal="true" aria-labelledby={titleId} data-data-health-dialog="true" data-editor-lock="true" onCancel={e=>{e.preventDefault();setOpen(false);}} onClose={()=>setOpen(false)} onKeyDown={e=>{
      if(e.key!=="Tab") return;
      const nodes=[...e.currentTarget.querySelectorAll<HTMLElement>('button:not([tabindex="-1"]), a[href], [tabindex="0"]')].filter(n=>n.getClientRects().length);
      const first=nodes[0],last=nodes.at(-1);
      if(e.shiftKey && document.activeElement===first){e.preventDefault();last?.focus();}
      else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first?.focus();}
    }}>
      <header className="data-health-header"><div><p>DATA CHECK</p><h2 id={titleId}>{report.title}</h2></div><button type="button" aria-label="关闭数据体检" onClick={()=>setOpen(false)}>关闭 ×</button></header>
      <div className="data-health-tabs" ref={tabsRef} role="tablist" aria-label="数据体检内容">{tabs.map((label,i)=><button key={i} id={`${uid}-tab-${i}`} type="button" role="tab" aria-selected={tab===i} tabIndex={tab===i?0:-1} aria-controls={`${uid}-panel`} onClick={()=>setTab(i)} onKeyDown={e=>{
        if(!["ArrowLeft","ArrowRight","Home","End"].includes(e.key))return;e.preventDefault();const next=e.key==="Home"?0:e.key==="End"?3:(i+(e.key==="ArrowRight"?1:-1)+4)%4;setTab(next);tabsRef.current?.querySelector<HTMLButtonElement>(`#${uid}-tab-${next}`)?.focus();
      }}>{label}</button>)}</div>
      <div className="data-health-body" id={`${uid}-panel`} role="tabpanel" tabIndex={0} aria-labelledby={`${uid}-tab-${tab}`}>
        {report.status==="pending" ? <p role="status">等待真实数据和处理记录接入；此处尚未生成体检结果。</p> : <>
          {tab===0 && <>{highlights.length > 0 && <section className="data-health-highlights" aria-label="体检重点提示"><h3>先看这几项</h3><ul>{highlights.slice(0,3).map(highlight)}</ul>{highlights.length > 3 && <details><summary>还有{highlights.length-3}项提示</summary><ul>{highlights.slice(3).map(highlight)}</ul></details>}</section>}<dl className="data-health-stats"><div><dt>检查记录</dt><dd>{count(report.summary.records)}</dd></div><div><dt>重复额外记录</dt><dd>{count(report.summary.duplicateExtraRecords)}</dd></div><div><dt>重复键组</dt><dd>{count(report.summary.duplicateKeyGroups)}</dd></div><div><dt>键字段缺失记录</dt><dd>{count(report.summary.incompleteKeyRecords)}</dd></div></dl><p>缺失值、无效值按字段分别统计；没有声明唯一键时，不判断重复。零值不算缺失，负值是否有效取决于已声明的指标范围。</p>{report.fields.map(f=><article key={f.id}><h3>{f.label}{f.unit && `（${f.unit}）`}</h3><p>有效 {count(f.valid)} · 缺失 {count(f.missing)} · 无效 {count(f.invalid)}</p></article>)}</>}
          {tab===1 && <>{report.coverage.length ? <><p>以下按预先声明的分组和预期时段检查记录存在情况；数值是否有效另见字段检查。缺少记录不等于零。可左右滚动查看。</p><div className="data-health-table-scroll"><table><caption>记录时段覆盖</caption><thead><tr><th scope="col">分组</th>{report.coverage[0].periods.map(p=><th key={p.period} scope="col">{p.period}</th>)}<th scope="col">预期时段缺口</th><th scope="col">时段外记录</th></tr></thead><tbody>{report.coverage.map(g=><tr key={g.groupId}><th scope="row">{g.label}</th>{g.periods.map(p=><td key={p.period}>{count(p.records)}</td>)}<td>{count(g.missingPeriods)}</td><td>{count(g.outsidePeriods)}</td></tr>)}</tbody></table></div></> : <><p>本数据没有登记时间覆盖规则，按字段查看可用程度。</p>{report.fields.map(f=><article key={f.id}><h3>{f.label}</h3><p>有效 {count(f.valid)} / {count(f.records)} 条；缺失 {count(f.missing)} 条，无效 {count(f.invalid)} 条。</p></article>)}</>}</>}
          {tab===2 && <><p>仅提示复核，不自动删除、替换记录，也不解释成因。</p>{report.anomalies.length ? report.anomalies.map(a=><article key={a.fieldId}><h3>{a.label}</h3><p>{a.status==="insufficient" ? "有效样本不足，未进行筛选。" : `检查 ${count(a.checked)} 个有效值，标记 ${count(a.flagged)} 个。`}</p><details><summary>查看筛选方法</summary><p>{a.method}</p></details></article>) : <p>没有为本数据登记适合的异常筛选规则，因此没有执行异常检查；这不表示没有异常。</p>}</>}
          {tab===3 && <>{report.usage.length ? report.usage.map(u=><article key={u.analysisId}><h3>{u.label}</h3><p>{u.status==="unregistered" ? "尚未登记输入记录范围，无法判断使用数量。" : `本步骤使用 ${count(u.used)} 条，未选取 ${count(u.notSelected)} 条。`}</p><p>{u.scope}</p><p>{u.reason}</p><small>分析记录：{u.analysisId}</small>{u.sectionId && <p><a href={`#${u.sectionId}`} onClick={()=>setOpen(false)}>查看对应报告章节 →</a></p>}</article>) : <p>尚未登记分析输入范围，无法判断哪些记录没有进入分析。</p>}</>}
          <aside className="data-health-note"><h3>口径与局限</h3><ul>{report.limitations.map((v,i)=><li key={i}>{v}</li>)}</ul></aside>
        </>}
      </div>
      <footer className="data-health-footer">{report.provenance && <span>数据集：{report.provenance.datasetId} · 生成：{report.provenance.generatedAt.slice(0,10)}</span>}{sources.map(s=><span key={s.id}>{s.href && /^(https?:\/\/|#)/.test(s.href) ? <a href={s.href} target={s.href.startsWith('#')?undefined:"_blank"} rel="noreferrer">{s.label} ↗</a> : s.label}</span>)}</footer>
    </dialog>,document.body)}
  </div>;
}
