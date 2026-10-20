import manifestDocument from "../deck-manifest.json";
import { ReportRuntime, type ReportSection } from "./runtime/report-runtime/ReportRuntime";
import { resolveVisualStyle, type VisualStyle } from "./runtime/visual-style";

type ManifestSection = Omit<ReportSection, "render">;
const manifest = manifestDocument as unknown as { title: string; sections: ManifestSection[]; visualStyle?: VisualStyle };

function renderSection(section: ManifestSection, index: number) {
  if (section.role === "hero") return (
    <div className="report-hero" data-scaffold-placeholder="true">
      <header className="report-hero-brand" data-logo-contains-institution-name="true"><img src="./zuel-logo.png" alt="中南财经政法大学" data-brand-role="report-hero" data-brand-audit="true" data-logo-contains-institution-name="true" data-editor-lock="true" /></header>
      <div className="report-hero-title"><p>DATASET REPORT · STRUCTURE PLACEHOLDER</p><h1 id={`${section.id}-title`} tabIndex={-1} data-report-section-heading>{section.title}</h1></div>
      <article className="report-primary-answer"><span>PRIMARY ANALYTICAL QUESTION</span><h2>TODO：由任务合同与真实数据确定</h2><p>此处没有研究结论；完成同一 Shared Evidence Core 后再写入直接答案。</p></article>
    </div>
  );
  return (
    <div data-scaffold-placeholder="true">
      <header className="report-section-header"><div><p>{String(index + 1).padStart(2, "0")} · {section.chapter}</p><h2 id={`${section.id}-title`} tabIndex={-1} data-report-section-heading>{section.title}</h2><p className="report-section-lead">此 section 已连接 ReportRuntime，保持内容驱动高度和正常纵向阅读。</p></div></header>
      <article className="scaffold-report-block" data-audit-box><h3>TODO：映射真实证据</h3><p>不得把本区域改造成固定 1600×900 slide canvas，也不得在此复制另一套分析结果。</p></article>
    </div>
  );
}

const sections: ReportSection[] = manifest.sections.map((section, index) => ({ ...section, render: () => renderSection(section, index) }));

export function App() {
  return <ReportRuntime sections={sections} ariaLabel={manifest.title} visualStyle={resolveVisualStyle(manifest.visualStyle)} />;
}
