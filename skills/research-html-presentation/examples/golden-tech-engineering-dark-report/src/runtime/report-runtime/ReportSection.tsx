import type { ReactNode } from "react";

export function ReportEvidenceBlock({ title, children, className = "", titleEditId }: { title: string; children: ReactNode; className?: string; titleEditId?: string }) {
  return <article className={`report-evidence-block ${className}`} data-audit-box><h3>{title}</h3><div>{children}</div></article>;
}

export function ReportFindingBand({ label = "核心判断", children, editId }: { label?: string; children: ReactNode; editId?: string }) {
  return <aside className="report-finding-band" data-safe><b>{label}</b><div>{children}</div></aside>;
}

export function ReportParagraph({ children, editId, className = "" }: { children: ReactNode; editId?: string; className?: string }) {
  return <p className={className}>{children}</p>;
}
