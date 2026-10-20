export function ReportSynthesis({ title = "综合结论", findings }: { title?: string; findings: Array<{ id: string; finding: string; evidence: string; boundary?: string }> }) {
  return <div className="report-synthesis"><h2>{title}</h2>{findings.map((item, index) => <article key={item.id} data-finding-id={item.id}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{item.finding}</h3><p>{item.evidence}</p>{item.boundary ? <small>{item.boundary}</small> : null}</div></article>)}</div>;
}
