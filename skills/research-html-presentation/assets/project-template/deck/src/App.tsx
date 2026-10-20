import { BrandMark } from "./runtime/BrandMark";
import type { Branding } from "./runtime/branding";
import manifestDocument from "../deck-manifest.json";
import { DeckRuntime, type DeckSlide } from "./runtime/DeckRuntime";
import { FlowDiagram } from "./runtime/FlowDiagram";
import type { FlowSpec } from "./runtime/EvidenceVisualizationTypes";
import { DashedQuestionBox, GradientConclusionBand, InsetEvidencePanel, NotchedLabel, OpenFrame, RibbonHeader, SectionRibbon } from "./runtime/SlidePrimitives";
import { resolveVisualStyle, type VisualStyle } from "./runtime/visual-style";

type ManifestSlide = Omit<DeckSlide, "render">;
const manifest = manifestDocument as unknown as { branding?: Branding; title: string; slides: ManifestSlide[]; visualStyle?: VisualStyle; compositionProfile?: "standard" | "compact-academic-board" };
const placeholderFlow: FlowSpec = {
  id: "scaffold-branch-merge",
  layout: "branch-merge",
  readingOrder: ["input", "path-a", "path-b", "validation"],
  printState: "complete",
  nodes: [
    { id: "input", role: "input", label: "输入材料", group: "main", size: "medium" },
    { id: "path-a", role: "process", label: "主分析路径", group: "support-a", size: "large" },
    { id: "path-b", role: "validation", label: "稳健性验证", group: "support-b", size: "medium" },
    { id: "validation", role: "output", label: "汇合结论", group: "main", emphasis: "critical", size: "medium" },
  ],
  edges: [
    { from: "input", to: "path-a", kind: "primary", directed: true },
    { from: "input", to: "path-b", kind: "secondary", directed: true },
    { from: "path-a", to: "validation", kind: "primary", directed: true },
    { from: "path-b", to: "validation", kind: "secondary", directed: true },
    { from: "validation", to: "path-b", label: "反馈", kind: "feedback", directed: true },
  ],
};

function renderSlide(slide: ManifestSlide, index: number) {
  if (slide.type === "cover") return (
    <div className="scaffold-cover" data-scaffold-placeholder="true">
      <BrandMark branding={manifest.branding} role="cover" />
      <p>RESEARCH PRESENTATION · STRUCTURE PLACEHOLDER</p>
      <h1 className="slide-title" data-safe data-check-text data-title-audit="true" data-title-mode={slide.titleMode ?? "single-line"}>{slide.title}</h1>
      <div className="scaffold-cover-rule" aria-hidden="true" />
      <p className="scaffold-warning">请仅用经过核验的用户材料替换待填充内容</p>
    </div>
  );
  return (
    <div data-scaffold-placeholder="true">
      <header className="slide-header">
        <div className="title-mark" aria-hidden="true" />
        <div className="slide-heading-copy"><p className="section-kicker">{String(index + 1).padStart(2, "0")} · {slide.section}</p><h2 className="slide-title" data-safe data-check-text data-title-audit="true" data-title-mode={slide.titleMode ?? "single-line"}>{slide.title}</h2></div>
        <BrandMark branding={manifest.branding} className="content-logo" role="content" />
        <div className="header-rule" aria-hidden="true" />
      </header>
      <main className={`scaffold-deck-body silhouette-${slide.bodySilhouette ?? "figure-support-matrix"}`} data-audit-box data-body-silhouette={slide.bodySilhouette ?? "figure-support-matrix"}>
        {slide.bodySilhouette === "process-board" ? <>
          <SectionRibbon>输入—处理—输出—验证</SectionRibbon>
          <div data-silhouette-role="process-flow"><FlowDiagram spec={placeholderFlow} ariaLabel="合成双路径流程占位图" /></div>
          <DashedQuestionBox>用真实 FlowSpec 替换占位节点；保留分支、汇合、反馈与箭头方向。</DashedQuestionBox>
        </> : <>
          <OpenFrame className="scaffold-dominant" silhouetteRole="dominant"><RibbonHeader>主证据区域</RibbonHeader><p className="scaffold-note">使用真实图表、科学图像或结构图形成清晰视觉中心。</p></OpenFrame>
          <InsetEvidencePanel className="scaffold-support" silhouetteRole="support"><NotchedLabel>解释与边界</NotchedLabel><p className="scaffold-note">连接关键数值、方法说明和适用范围。</p></InsetEvidencePanel>
          <DashedQuestionBox className="scaffold-support scaffold-accent" silhouetteRole="support"><NotchedLabel>结论支撑</NotchedLabel><p className="scaffold-note">标题、图形与结论需相互证明。</p></DashedQuestionBox>
        </>}
      </main>
      <GradientConclusionBand className="takeaway">由真实证据支持的含义或限制将在材料接入后写入。</GradientConclusionBand>
    </div>
  );
}

const slides: DeckSlide[] = manifest.slides.map((slide, index) => ({ ...slide, render: () => renderSlide(slide, index) }));

export function App() {
  return <DeckRuntime slides={slides} ariaLabel={manifest.title} visualStyle={resolveVisualStyle(manifest.visualStyle)} compositionProfile={manifest.compositionProfile ?? "standard"} />;
}
