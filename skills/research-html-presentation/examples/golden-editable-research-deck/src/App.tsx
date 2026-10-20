import manifestDocument from "../deck-manifest.json";
import { DeckRuntime, type DeckSlide } from "./runtime/DeckRuntime";
import { resolveVisualStyle, type VisualStyle } from "./runtime/visual-style";

type ManifestSlide = Omit<DeckSlide, "render">;
const manifest = manifestDocument as unknown as { title: string; slides: ManifestSlide[]; visualStyle?: VisualStyle };

function renderSlide(slide: ManifestSlide, index: number) {
  if (slide.type === "cover") return (
    <div className="scaffold-cover" data-scaffold-placeholder="true">
      <img src="./zuel-logo.png" alt="中南财经政法大学" data-brand-role="cover" data-brand-audit="true" data-editor-lock="true" />
      <p>RESEARCH PRESENTATION · STRUCTURE PLACEHOLDER</p>
      <h1 className="slide-title">{slide.title}</h1>
      <div className="scaffold-cover-rule" aria-hidden="true" />
      <p className="scaffold-warning">请仅用经过核验的用户材料替换 TODO 内容</p>
    </div>
  );
  return (
    <div data-scaffold-placeholder="true">
      <header className="slide-header">
        <div className="title-mark" aria-hidden="true" />
        <div className="slide-heading-copy"><p className="section-kicker">{String(index + 1).padStart(2, "0")} · {slide.section}</p><h2 className="slide-title">{slide.title}</h2></div>
        <div className="header-rule" aria-hidden="true" />
      </header>
      <main className="scaffold-deck-body" data-audit-box>
        <h3>可运行的三页原型结构</h3>
        <p className="scaffold-note">此区域已连接 DeckRuntime，但没有研究事实、指标或结论。完成材料分析和证据映射后再替换。</p>
      </main>
      <footer className="takeaway">TODO：写入由真实证据支持的含义或限制。</footer>
    </div>
  );
}

const slides: DeckSlide[] = manifest.slides.map((slide, index) => ({ ...slide, render: () => renderSlide(slide, index) }));

export function App() {
  return <DeckRuntime slides={slides} ariaLabel={manifest.title} visualStyle={resolveVisualStyle(manifest.visualStyle)} />;
}
