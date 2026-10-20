import type { ReactNode } from "react";

export function ReportHero({ titleId, title, subtitle, question, answer, logo, metadata = [], children, titleEditId, subtitleEditId, questionEditId, answerEditId }: {
  titleId: string;
  title: string;
  subtitle?: string;
  question: string;
  answer: string;
  logo: { src: string; alt: string; institution?: string; containsInstitutionName?: boolean };
  metadata?: Array<{ label: string; value: string }>;
  children?: ReactNode;
  titleEditId?: string;
  subtitleEditId?: string;
  questionEditId?: string;
  answerEditId?: string;
}) {
  const containsInstitutionName = logo.containsInstitutionName ?? true;
  const institutionText = containsInstitutionName ? undefined : logo.institution;
  return (
    <div className="report-hero">
      <header className="report-hero-brand" data-logo-contains-institution-name={containsInstitutionName ? "true" : "false"}>{institutionText ? <span data-institution-text="true">{institutionText}</span> : null}<img src={logo.src} alt={logo.alt} data-brand-role="report-hero" data-brand-audit="true" data-logo-contains-institution-name={containsInstitutionName ? "true" : "false"} /></header>
      <div className="report-hero-title"><p>{subtitle}</p><h1 id={titleId} tabIndex={-1} data-report-section-heading>{title}</h1></div>
      <article className="report-primary-answer"><span>PRIMARY ANALYTICAL QUESTION</span><h2>{question}</h2><p>{answer}</p></article>
      {metadata.length ? <dl className="report-hero-metadata">{metadata.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl> : null}
      {children}
    </div>
  );
}
