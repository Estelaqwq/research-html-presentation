export function ChartAnnotation({ label, detail, critical = false }: { label: string; detail: string; critical?: boolean }) {
  return <aside className={`chart-annotation ${critical ? "is-critical" : ""}`} data-chart-overlay="true"><b>{label}</b><span>{detail}</span></aside>;
}
