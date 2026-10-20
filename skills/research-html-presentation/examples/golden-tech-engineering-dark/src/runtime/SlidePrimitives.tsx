"use client";

import type { KeyboardEvent, ReactNode } from "react";
import type { SlideRenderContext, ZoomPayload } from "./DeckRuntime";

export function Emphasis({ children }: { children: ReactNode }) {
  return <span className="emphasis" data-visual-role="gold-label">{children}</span>;
}

export function SectionRail({ items, activeId, ariaLabel = "汇报章节" }: {
  items: Array<{ id: string; label: string }>;
  activeId: string;
  ariaLabel?: string;
}) {
  return (
    <nav className="section-rail" data-visual-role="section-rail" aria-label={ariaLabel} data-editor-lock="true">
      {items.map((item) => (
        <span key={item.id} className={item.id === activeId ? "is-active" : ""} aria-current={item.id === activeId ? "step" : undefined}>
          {item.label}
        </span>
      ))}
    </nav>
  );
}

export function SlideHeader({ number, section, title, logo, titleEditId }: {
  number: string;
  section: string;
  title: string;
  logo?: { src: string; alt: string };
  titleEditId?: string;
}) {
  return (
    <header className="slide-header" data-visual-role="title-band">
      <div className="title-mark" aria-hidden="true" />
      <div className="slide-heading-copy">
        <p className="section-kicker">{number} · {section}</p>
        <h2 className="slide-title">{title}</h2>
      </div>
      {logo ? <img className="content-logo" src={logo.src} alt={logo.alt} data-brand-role="content" data-brand-audit="true" data-logo-contains-institution-name="true" data-editor-lock="true" /> : null}
      <div className="header-rule" aria-hidden="true" />
    </header>
  );
}

export function SlideLead({ children, editId }: { children: ReactNode; editId?: string }) {
  // The local authoring layer discovers stable content targets from the
  // rendered model; normal deck rendering must not import editor UI.
  return <p className="slide-lead" data-safe data-visual-role="lead-band" data-content-role={editId ? "lead" : undefined}>{children}</p>;
}

export function CoverBrand({ logo }: { logo: { src: string; alt: string } }) {
  return <img className="cover-logo" src={logo.src} alt={logo.alt} data-visual-role="brand-plate" data-brand-role="cover" data-brand-audit="true" data-logo-contains-institution-name="true" data-editor-lock="true" />;
}

export function Takeaway({ children, editId }: { children: ReactNode; editId?: string }) {
  return <footer className="takeaway" data-safe data-visual-role="conclusion-band" data-content-role={editId ? "takeaway" : undefined}>{children}</footer>;
}

export function AcademicModule({ title, eyebrow, children, className = "", titleEditId }: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
  titleEditId?: string;
}) {
  return (
    <article className={`academic-module ${className}`} data-audit-box data-visual-role="tech-panel">
      <header>{eyebrow ? <span>{eyebrow}</span> : null}<h3>{title}</h3></header>
      <div className="academic-module-body">{children}</div>
    </article>
  );
}

export function EvidenceStrip({ label = "证据链", items, className = "" }: {
  label?: string;
  items: Array<{ title: string; body: ReactNode; critical?: boolean }>;
  className?: string;
}) {
  return (
    <div className={`evidence-strip ${className}`} data-audit-box data-visual-role="metric-strip">
      <b className="evidence-strip-label">{label}</b>
      {items.map((item, index) => (
        <div className={`evidence-strip-item ${item.critical ? "is-critical" : ""}`} key={`${item.title}-${index}`}>
          <strong>{item.title}</strong><span>{item.body}</span>
        </div>
      ))}
    </div>
  );
}

export function ScientificImage({ src, alt, cropSafe = false, className = "" }: {
  src: string;
  alt: string;
  cropSafe?: boolean;
  className?: string;
}) {
  return <img className={className} src={src} alt={alt} data-scientific="true" data-crop-safe={cropSafe ? "true" : undefined} />;
}

export function Fragment({ step, current, children, className = "" }: { step: number; current: number; children: ReactNode; className?: string }) {
  return <div className={`fragment ${current >= step ? "is-visible" : ""} ${className}`} data-fragment={step}>{children}</div>;
}

export function FocusableModule({ id, context, children, className = "" }: {
  id: string;
  context: Pick<SlideRenderContext, "focusedId" | "toggleFocus">;
  children: ReactNode;
  className?: string;
}) {
  const activate = () => context.toggleFocus(id);
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate();
    }
  };

  const stateClass = context.focusedId === id ? "is-focused" : context.focusedId ? "is-dimmed" : "";
  return <article className={`focusable ${stateClass} ${className}`} tabIndex={0} role="button" onClick={activate} onKeyDown={onKeyDown}>{children}</article>;
}

export function ZoomableFigure({ payload, openZoom, children, className = "", cropSafe = false, claim, captionEditId }: {
  payload: ZoomPayload;
  openZoom: SlideRenderContext["openZoom"];
  children?: ReactNode;
  className?: string;
  cropSafe?: boolean;
  claim?: string;
  captionEditId?: string;
}) {
  return (
    <figure className={`zoomable-figure ${className}`} data-audit-box data-figure-claim={claim}>
      <button onClick={(event) => openZoom(payload, event.currentTarget)} aria-label={`${payload.caption}，点击放大`}>
        {children ?? <ScientificImage src={payload.src} alt={payload.alt} cropSafe={cropSafe} />}
      </button>
      <figcaption>{payload.caption}<b aria-hidden="true">＋</b></figcaption>
    </figure>
  );
}

export function BodyParagraph({ children, editId, className = "" }: { children: ReactNode; editId?: string; className?: string }) {
  return <p className={className} data-content-role={editId ? "body" : undefined}>{children}</p>;
}

export function SynthesisRow({ index, title, evidence, finding }: {
  index: string;
  title: string;
  evidence: ReactNode;
  finding: ReactNode;
}) {
  return (
    <div className="synthesis-row" data-audit-box data-visual-role="tech-panel">
      <span>{index}</span><div><b>{title}</b><p data-small-text>{evidence}</p></div><strong>{finding}</strong>
    </div>
  );
}

export function BrandedClosing({ logo, invitation, english, metadata, researchTitle, institutionText }: {
  logo: { src: string; alt: string; institution?: string; containsInstitutionName?: boolean };
  invitation: string;
  english?: string;
  metadata: Array<{ label: string; value: string }>;
  researchTitle?: string;
  institutionText?: string;
}) {
  const containsInstitutionName = logo.containsInstitutionName ?? true;
  const visibleInstitutionText = containsInstitutionName ? undefined : institutionText;
  return (
    <div className="branded-closing" data-logo-contains-institution-name={containsInstitutionName ? "true" : "false"}>
      <div className="closing-brand-row"><div className="closing-lockup"><img src={logo.src} alt={logo.alt} data-brand-role="closing" data-brand-audit="true" data-logo-contains-institution-name={containsInstitutionName ? "true" : "false"} />{visibleInstitutionText ? <b data-institution-text="true">{visibleInstitutionText}</b> : null}</div></div>
      <div className="closing-title-band"><p>{english ?? "THANK YOU · QUESTIONS & DISCUSSION"}</p><h2>{invitation}</h2></div>
      <div className="closing-metadata">{metadata.map((item) => <div key={item.label}><span>{item.label}</span><b>{item.value}</b></div>)}</div>
      {researchTitle ? <p className="closing-research-title" data-small-text>{researchTitle}</p> : null}
    </div>
  );
}
