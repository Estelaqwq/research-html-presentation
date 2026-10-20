import { BrandMark } from "./runtime/BrandMark";
import type { Branding } from "./runtime/branding";
import manifestDocument from "../deck-manifest.json";
import evidenceDocument from "../evidence-visuals.json";
import healthDocument from "../data-health.json";
import citationsDocument from "../citations.json";
import { DataHealth, type DataHealthReport } from "./runtime/report-runtime/DataHealth";
import flowDocument from "../analysis-flow.json";
import { ReportRuntime, type ReportSection } from "./runtime/report-runtime/ReportRuntime";
import type { AnalysisFlowData } from "./runtime/report-runtime/AnalysisFlow";
import type { CompanionEvidence } from "./runtime/report-runtime/analysis-companion";
import { resolveVisualStyle, type VisualStyle } from "./runtime/visual-style";

type ManifestSection = Omit<ReportSection, "render">;
const manifest = manifestDocument as unknown as { branding?: Branding; title: string; sections: ManifestSection[]; visualStyle?: VisualStyle; dataHealth?: {enabled:boolean;report?:string}; analysisCompanion?: { enabled: boolean; projectId?: string; llm?: { enabled: boolean; apiPath: string } }; analysisFlow?: { enabled: boolean; projectId?: string } };
const evidence = evidenceDocument as unknown as { analysisCompanion?: CompanionEvidence };

function renderSection(section: ManifestSection, index: number) {
  if (section.role === "hero") return (
    <div className="report-hero" data-scaffold-placeholder="true">
      {manifest.branding?.profile === "zuel" && <header className="report-hero-brand" data-editor-lock="true"><BrandMark branding={manifest.branding} role="report-hero" /></header>}
      <div className="report-hero-title"><p>DATASET REPORT · STRUCTURE PLACEHOLDER</p><h1 id={`${section.id}-title`} tabIndex={-1} data-report-section-heading data-safe data-check-text data-title-audit="true" data-title-mode={section.titleMode ?? "single-line"}>{section.title}</h1></div>
      <article className="report-primary-answer"><span>PRIMARY ANALYTICAL QUESTION</span><h2>由任务合同与真实数据确定</h2><p>此处没有研究结论；完成同一 Shared Evidence Core 后再写入直接答案。</p></article>
    </div>
  );
  return (
    <div data-scaffold-placeholder="true">
      <header className="report-section-header"><div><p>{String(index + 1).padStart(2, "0")} · {section.chapter}</p><h2 id={`${section.id}-title`} tabIndex={-1} data-report-section-heading data-safe data-check-text data-title-audit="true" data-title-mode={section.titleMode ?? "single-line"}>{section.title}</h2><p className="report-section-lead">此 section 已连接 ReportRuntime，保持内容驱动高度和正常纵向阅读。</p></div></header>
      {section.role === "analysis-design" && manifest.dataHealth?.enabled && <DataHealth report={healthDocument as DataHealthReport} sources={(citationsDocument as {citations:Array<{citationId:string;title:string;url?:string}>}).citations.filter(c => (healthDocument as DataHealthReport).provenance?.sourceIds.includes(c.citationId)).map(c=>({id:c.citationId,label:c.title,href:c.url}))} />}
      <article className="scaffold-report-block" data-audit-box><h3>映射真实证据（待填充）</h3><p>不得把本区域改造成固定 1600×900 slide canvas，也不得在此复制另一套分析结果。</p></article>
    </div>
  );
}

const sections: ReportSection[] = manifest.sections.map((section, index) => ({ ...section, render: () => renderSection(section, index) }));

export function App() {
  return <ReportRuntime sections={sections} ariaLabel={manifest.title} visualStyle={resolveVisualStyle(manifest.visualStyle)} analysisFlow={manifest.analysisFlow?.enabled ? { enabled: true, projectId: manifest.analysisFlow.projectId ?? manifest.title, initial: flowDocument as AnalysisFlowData } : undefined} analysisCompanion={manifest.analysisCompanion?.enabled && evidence.analysisCompanion ? { enabled: true, projectId: manifest.analysisCompanion.projectId ?? manifest.title, evidence: evidence.analysisCompanion, llm: manifest.analysisCompanion.llm } : undefined} />;
}
