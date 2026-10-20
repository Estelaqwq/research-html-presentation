export function LinkedEvidencePanel({ title = "证据解释", evidence, source }: { title?: string; evidence: string; source?: string }) {
  return <aside className="linked-evidence-panel" data-chart-overlay="true" aria-live="polite"><b>{title}</b><p>{evidence}</p>{source ? <small>{source}</small> : null}</aside>;
}
