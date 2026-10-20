
export function ReportHeader({ id, eyebrow, title, lead, logo, titleEditId, leadEditId }: {
  id: string;
  eyebrow: string;
  title: string;
  lead?: string;
  logo?: { src: string; alt: string };
  titleEditId?: string;
  leadEditId?: string;
}) {
  return (
    <header className="report-section-header">
      <div><p>{eyebrow}</p><h2 id={id} tabIndex={-1} data-report-section-heading>{title}</h2>{lead ? <div className="report-section-lead">{lead}</div> : null}</div>
      {logo ? <img src={logo.src} alt={logo.alt} data-brand-role="report-header" data-brand-audit="true" /> : null}
    </header>
  );
}
