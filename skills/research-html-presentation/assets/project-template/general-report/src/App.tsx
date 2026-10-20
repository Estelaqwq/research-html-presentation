import { BrandMark } from "./runtime/BrandMark";
import type { Branding } from "./runtime/branding";
import manifestDocument from "../deck-manifest.json";
import contentDocument from "../report-content.json";
import citationDocument from "../citations.json";
import { ReportRuntime, type ReportSection, type ReportRenderContext } from "./runtime/report-runtime/ReportRuntime";
import { ReportText, ReportOverview, ReportProcess, ReportComparison, ReportProgress, ReportCaseViewer, ReportTabs, ReportDetails, ReportStatus, type ReportWorkStatus } from "./runtime/report-runtime/ReportModules";

type Step = { id: string; title: string; detail?: string };
type Case = { id: string; title: string; summary: string; evidence?: string; status?: ReportWorkStatus };
type Block = { id: string; type: "text" | "image" | "overview" | "process" | "comparison" | "progress" | "cases" | "tabs" | "details"; title?: string; text?: string; src?: string; alt?: string; caption?: string; items?: Step[]; steps?: Step[]; columns?: string[]; rows?: Array<{ id: string; cells: string[] }>; completed?: number; total?: number; unit?: string; scope?: string; asOf?: string; approximate?: boolean; cases?: Case[]; options?: Array<{ id: string; label: string; blocks: Block[] }>; blocks?: Block[]; status?: ReportWorkStatus };
type SectionCopy = { lead?: string; notes?: string | string[]; status?: ReportWorkStatus; blocks?: Block[] };
type Content = { summary?: string; overview?: Step[]; sections: Record<string, SectionCopy> };
const manifest = manifestDocument as unknown as { branding?: Branding; title: string; profile: string; sections: Array<Omit<ReportSection, "render">>; visualStyle?: "academic-light" | "tech-engineering-dark"; scaffoldPlaceholder?: boolean; reportPresentation?: { toolbar?: boolean; copyDepth?: "compact" | "detailed" } };
const content = contentDocument as Content;
const citations = citationDocument as { citations: Array<{ citationId: string; title: string; claimIds: string[]; locator?: string; url?: string; doi?: string }> };

function sources(section: Omit<ReportSection, "render">) {
  const records=citations.citations.filter(source=>source.claimIds.some(id=>section.claimIds?.includes(id)));
  return records.length ? <aside className="general-report-sources" data-small-text>{records.map(source=>{const label=source.title+(source.locator ? ` · ${source.locator}` : "");const href=source.url ?? (source.doi ? `https://doi.org/${source.doi.replace(/^https?:\/\/(?:dx\.)?doi\.org\//, "")}` : undefined);return href ? <a key={source.citationId} data-citation-id={source.citationId} href={href} target="_blank" rel="noopener noreferrer">{label} ↗</a> : <span key={source.citationId} data-citation-id={source.citationId}>{label}</span>;})}</aside> : null;
}

function renderBlock(block: Block, owner: string, context: ReportRenderContext) {
  const id = `${owner}-${block.id}`;
  let body;
  switch (block.type) {
    case "image": body = <figure className="general-report-image"><img src={block.src} alt={block.alt ?? ""} />{block.caption && <figcaption><ReportText text={block.caption} /></figcaption>}</figure>; break;
    case "overview": body = <ReportOverview items={block.items ?? []} />; break;
    case "process": body = <ReportProcess steps={block.steps ?? []} />; break;
    case "comparison": body = <ReportComparison columns={block.columns ?? []} rows={block.rows ?? []} />; break;
    case "progress": body = <ReportProgress completed={block.completed!} total={block.total!} unit={block.unit} scope={block.scope ?? block.title ?? "进度"} asOf={block.asOf} approximate={block.approximate} />; break;
    case "cases": body = <ReportCaseViewer id={id} cases={block.cases ?? []} printMode={context.printMode} />; break;
    case "tabs": body = <ReportTabs id={id} printMode={context.printMode} options={(block.options ?? []).map(option => ({ id: option.id, label: option.label, content: option.blocks.map(child => renderBlock(child, `${id}-${option.id}`, context)) }))} />; break;
    case "details": body = <ReportDetails label={block.title ?? "查看详情"} printMode={context.printMode} speaking={context.speaking} readingExpanded>{(block.blocks ?? []).map(child => renderBlock(child, id, context))}</ReportDetails>; break;
    default: body = <p className="general-report-copy"><ReportText text={block.text ?? ""} /></p>;
  }
  return <article key={id} className="general-report-block" id={id} data-report-block={block.type}>{block.title && !["details", "progress"].includes(block.type) && <h3>{block.title}</h3>}{block.status && <ReportStatus value={block.status} />}{body}</article>;
}

const sections: ReportSection[] = manifest.sections.map((section, index) => {
  const copy = content.sections[section.id] ?? {};
  return { ...section, notes: copy.notes ?? section.notes, render: context => section.role === "hero" ? (
    <div className="general-report-hero" data-scaffold-placeholder={manifest.scaffoldPlaceholder ? "true" : undefined}>
      {manifest.branding?.profile === "zuel" && <header className="report-hero-brand" data-editor-lock="true"><BrandMark branding={manifest.branding} role="report-hero" /></header>}
      <h1 id={`${section.id}-title`} tabIndex={-1} data-report-section-heading data-safe data-check-text data-title-audit="true" data-title-mode={section.titleMode ?? "two-line"}>{section.title}</h1>
      {content.summary && <p><ReportText text={content.summary} /></p>}
      {content.overview?.length ? <ReportOverview items={content.overview} /> : null}
      {(copy.blocks ?? []).map(block => renderBlock(block, section.id, context))}
      {sources(section)}
    </div>
  ) : (
    <div data-scaffold-placeholder={manifest.scaffoldPlaceholder ? "true" : undefined}>
      <header className="report-section-header"><div><p>{String(index + 1).padStart(2, "0")} · {section.chapter}</p><h2 id={`${section.id}-title`} tabIndex={-1} data-report-section-heading data-safe data-check-text data-title-audit="true" data-title-mode={section.titleMode ?? "two-line"}>{section.title}</h2>{copy.lead && <p className="report-section-lead"><ReportText text={copy.lead} /></p>}{copy.status && <ReportStatus value={copy.status} />}</div></header>
      {(copy.blocks ?? []).map(block => renderBlock(block, section.id, context))}
      {sources(section)}
    </div>
  ) };
});

export function App() {
  return <ReportRuntime sections={sections} ariaLabel={manifest.title} visualStyle={manifest.visualStyle} presentationTools={{ enabled: manifest.reportPresentation?.toolbar !== false, title: manifest.title }} />;
}
