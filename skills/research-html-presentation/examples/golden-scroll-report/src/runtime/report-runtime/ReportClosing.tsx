
export function ReportClosing({ titleId, invitation, researchTitle, logo, metadata = [], invitationEditId, researchTitleEditId }: {
  titleId: string;
  invitation: string;
  researchTitle?: string;
  logo: { src: string; alt: string; institution?: string; containsInstitutionName?: boolean };
  metadata?: Array<{ label: string; value: string }>;
  invitationEditId?: string;
  researchTitleEditId?: string;
}) {
  const containsInstitutionName = logo.containsInstitutionName ?? true;
  const institutionText = containsInstitutionName ? undefined : logo.institution;
  return <footer className="report-closing" data-logo-contains-institution-name={containsInstitutionName ? "true" : "false"}><header>{institutionText ? <span data-institution-text="true">{institutionText}</span> : null}<img src={logo.src} alt={logo.alt} data-brand-role="report-closing" data-brand-audit="true" data-logo-contains-institution-name={containsInstitutionName ? "true" : "false"} data-editor-lock="true" /></header><div><p>QUESTIONS · DISCUSSION</p><h2 id={titleId} tabIndex={-1} data-report-section-heading>{invitation}</h2>{researchTitle ? <strong>{researchTitle}</strong> : null}</div>{metadata.length ? <dl>{metadata.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl> : null}</footer>;
}
