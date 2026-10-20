import { useState, type CSSProperties } from "react";
import manifestDocument from "../deck-manifest.json";
import { DeckRuntime, type DeckSlide } from "./runtime/DeckRuntime";
import { SectionRail, SlideHeader, SlideLead, Takeaway } from "./runtime/SlidePrimitives";
import { resolveVisualStyle, type VisualStyle } from "./runtime/visual-style";

type ManifestSlide = Omit<DeckSlide, "render">;
const manifest = manifestDocument as unknown as { title: string; slides: ManifestSlide[]; visualStyle?: VisualStyle };
const logo = { src: "./zuel-logo.png", alt: "中南财经政法大学" };
const chapters = [
  { id: "overview", label: "项目概览" },
  { id: "method", label: "技术方案" },
  { id: "result", label: "验证结果" },
  { id: "boundary", label: "边界说明" },
];

function CoverPrototype() {
  return (
    <div className="tech-cover-prototype" data-scaffold-placeholder="true">
      <div className="tech-cover-grid" aria-hidden="true" />
      <div className="tech-cover-brand" data-editor-lock="true">
        <img src={logo.src} alt={logo.alt} data-brand-role="cover" data-brand-audit="true" data-logo-contains-institution-name="true" data-editor-lock="true" />
      </div>
      <div className="tech-cover-copy">
        <p className="tech-cover-eyebrow">ZUEL · ENGINEERING RESEARCH PROTOTYPE</p>
        <h1 className="tech-cover-title">工程科研汇报<br />视觉系统原型</h1>
        <p className="tech-cover-subtitle">深蓝工程画布 · 金色结论层级 · 青蓝结构关系</p>
        <div className="tech-cover-ribbons" aria-label="原型状态">
          <span><b>视觉风格</b> tech-engineering-dark</span>
          <span><b>证据状态</b> FIXTURE / TODO</span>
          <span><b>用途</b> 仅供视觉确认</span>
        </div>
      </div>
      <div className="tech-cover-hero tech-evidence-stage" data-visual-role="evidence-stage" aria-label="工程系统结构视觉占位">
        <div className="tech-hero-orbit orbit-one" aria-hidden="true" />
        <div className="tech-hero-orbit orbit-two" aria-hidden="true" />
        <div className="tech-hero-core">
          <span>SHARED</span>
          <strong>EVIDENCE<br />CORE</strong>
          <small>FIXTURE</small>
        </div>
        <div className="tech-hero-node node-a"><b>DATA</b><span>输入证据</span></div>
        <div className="tech-hero-node node-b"><b>MODEL</b><span>分析方法</span></div>
        <div className="tech-hero-node node-c"><b>RESULT</b><span>结果解释</span></div>
      </div>
      <div className="tech-cover-metrics" data-visual-role="metric-strip">
        <div className="tech-metric"><small>共享科研核心</small><strong>1 套</strong></div>
        <div className="tech-metric"><small>视觉风格</small><strong>2 套</strong></div>
        <div className="tech-metric"><small>原型页面</small><strong>3 页</strong></div>
        <div className="tech-metric"><small>正式研究结论</small><strong>0 项</strong></div>
      </div>
      <p className="tech-cover-fixture" data-small-text>FIXTURE · 本页仅验证版式、边框、字体、模块与工程科技视觉，不构成科研证据。</p>
    </div>
  );
}

function MethodPrototype() {
  const route = [
    ["证据登记", "来源与字段"],
    ["结构建模", "关系与参数"],
    ["交叉验证", "比较与复核"],
    ["边界回写", "结论与限制"],
  ];
  return (
    <>
      <SlideHeader number="02" section="技术方案" title="多源信息融合与闭环验证框架" logo={logo} />
      <SectionRail items={chapters} activeId="method" />
      <SlideLead><span className="fixture-badge">视觉测试</span>共享证据核心贯通输入、分析、输出与边界复核。</SlideLead>
      <main className="prototype-method-body" data-safe>
        <section className="engineering-board" aria-label="共享核心驱动的工程分析结构">
          <aside className="engineering-callouts is-left" aria-label="输入与校验模块">
            <article className="engineering-callout callout-a" data-audit-box>
              <header><span>01</span><b>数据接入</b></header>
              <p>来源记录与字段契约进入同一证据域。</p>
              <small>FIXTURE · 结构标签</small>
            </article>
            <article className="engineering-callout callout-b" data-audit-box>
              <header><span>02</span><b>质量校验</b></header>
              <p>缺失处理与一致性边界先于分析。</p>
              <small>FIXTURE · 结构标签</small>
            </article>
          </aside>

          <figure className="engineering-stage" data-audit-box data-visual-role="evidence-stage">
            <figcaption className="engineering-stage-title">
              <small>视觉测试结构 / FIXTURE</small>
              <b>共享核心驱动的工程分析链</b>
            </figcaption>
            <div className="engineering-stage-map">
              <svg className="architecture-links" viewBox="0 0 700 300" aria-hidden="true">
                <path d="M112 58 H232 L282 112" />
                <path d="M112 150 H250" />
                <path d="M112 242 H232 L282 188" />
                <path d="M588 58 H468 L418 112" />
                <path d="M588 150 H450" />
                <path d="M588 242 H468 L418 188" />
                <path className="architecture-link-accent" d="M350 30 V270" />
              </svg>
              <div className="architecture-ports is-input" aria-label="输入层">
                <b>输入层</b><span>来源记录</span><span>字段契约</span><span>质量边界</span>
              </div>
              <div className="architecture-stack" aria-label="共享证据核心">
                <div className="architecture-plate plate-top"><small>01</small><span>证据登记</span></div>
                <div className="architecture-plate plate-middle"><small>02</small><span>叙事映射</span></div>
                <div className="architecture-plate plate-bottom"><small>03</small><span>闭环复核</span></div>
                <div className="architecture-emblem">
                  <small>SHARED</small><strong>证据核心</strong><span>Evidence Core</span>
                </div>
              </div>
              <div className="architecture-ports is-output" aria-label="输出层">
                <b>输出层</b><span>图表证据</span><span>解释结论</span><span>复核状态</span>
              </div>
            </div>
            <div className="engineering-proof-strip">
              <span><small>内容共享</small><b>Evidence Core</b></span>
              <span><small>叙事共享</small><b>NarrativeUnit</b></span>
              <span><small>运行共享</small><b>Runtime / Print</b></span>
            </div>
          </figure>

          <aside className="engineering-callouts is-right" aria-label="分析与复核模块">
            <article className="engineering-callout callout-c" data-audit-box>
              <header><span>03</span><b>融合分析</b></header>
              <p>方法与共享参数域保持单一来源。</p>
              <small>FIXTURE · 结构标签</small>
            </article>
            <article className="engineering-callout callout-d" data-audit-box>
              <header><span>04</span><b>闭环验证</b></header>
              <p>结果、解释与边界回写同一链路。</p>
              <small>FIXTURE · 结构标签</small>
            </article>
          </aside>
        </section>

        <div className="engineering-route" data-visual-role="process-rail" style={{ "--tech-step-count": route.length } as CSSProperties}>
          {route.map(([title, note], index) => (
            <div className="route-station" key={title}>
              <span className="route-index">{String(index + 1).padStart(2, "0")}</span>
              <b>{title}</b><small>{note}</small>
            </div>
          ))}
        </div>
      </main>
      <Takeaway>视觉层形成独立工程语言，科研逻辑、证据关系与 Runtime 始终共享。</Takeaway>
    </>
  );
}

const chartData = {
  baseline: [42, 57, 65, 72, 79],
  candidate: [48, 63, 74, 83, 91],
};

function FixtureChart() {
  const [series, setSeries] = useState<keyof typeof chartData>("candidate");
  const values = chartData[series];
  const labels = ["阶段 A", "阶段 B", "阶段 C", "阶段 D", "阶段 E"];
  const plotTop = 38;
  const plotHeight = 278;
  const baselineY = plotTop + plotHeight;
  return (
    <div className="fixture-chart" data-runtime-hook="fixture-chart-series">
      <div className="fixture-chart-head">
        <div><small>FIXTURE DATA · VISUAL QA ONLY</small><b>示例指标随验证阶段递增</b></div>
        <div className="fixture-chart-switch" role="group" aria-label="切换示例序列">
          <button aria-pressed={series === "baseline"} onClick={() => setSeries("baseline")}>基线</button>
          <button aria-pressed={series === "candidate"} onClick={() => setSeries("candidate")}>候选</button>
        </div>
      </div>
      <svg className="tech-chart-plot" viewBox="0 0 820 370" role="img" aria-label={`示例${series === "candidate" ? "候选" : "基线"}序列柱状图，数值仅为视觉测试 fixture`}>
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = baselineY - tick / 100 * plotHeight;
          return <g key={tick}><line x1="68" x2="786" y1={y} y2={y} className="chart-grid-line" /><text x="52" y={y + 5} className="chart-axis-label">{tick}</text></g>;
        })}
        <line x1="68" x2="786" y1={baselineY} y2={baselineY} className="chart-axis-line" />
        {values.map((value, index) => {
          const x = 105 + index * 142;
          const height = value / 100 * plotHeight;
          const y = baselineY - height;
          const decisive = index === values.length - 1;
          return (
            <g key={labels[index]}>
              <rect x={x} y={y} width="76" height={height} className={decisive ? "chart-bar decisive" : "chart-bar"} />
              <rect x={x + 8} y={y + 8} width="60" height="2" className="chart-bar-highlight" />
              <text x={x + 38} y={y - 12} className={decisive ? "chart-value decisive" : "chart-value"}>{value}</text>
              <text x={x + 38} y="347" className="chart-x-label">{labels[index]}</text>
            </g>
          );
        })}
      </svg>
      <p className="fixture-chart-note" data-small-text>交互只切换视觉测试序列；坐标域固定为 0–100，Print 默认使用“候选”序列。</p>
    </div>
  );
}

function ResultPrototype() {
  return (
    <>
      <SlideHeader number="03" section="验证结果" title="决定性结果与证据链表达" logo={logo} />
      <SectionRail items={chapters} activeId="result" />
      <SlideLead>FIXTURE · 验证深色科研图表、金色关键值、解释模块与底部结果带的一体化表现。</SlideLead>
      <main className="prototype-result-body" data-safe>
        <section className="prototype-chart-panel tech-panel" data-audit-box data-visual-role="evidence-stage">
          <FixtureChart />
        </section>
        <aside className="prototype-result-aside tech-panel" data-audit-box data-visual-role="tech-panel">
          <h3 className="tech-panel-title">结果解释</h3>
          <div className="result-summary">
            <span>示例终点值</span><strong className="tech-gold">91</strong><small>FIXTURE / 非科研结果</small>
          </div>
          <ul>
            <li><b>方向：</b>候选序列高于基线序列。</li>
            <li><b>结构：</b>关键值使用暖金，主系列使用青蓝。</li>
            <li><b>边界：</b>数据只服务于视觉与交互测试。</li>
          </ul>
          <div className="result-boundary"><b>证据边界</b><span>不得将本原型数值复制到正式科研汇报。</span></div>
        </aside>
        <div className="prototype-result-strip" data-visual-role="metric-strip">
          <div className="tech-metric"><small>坐标域</small><strong>0–100</strong></div>
          <div className="tech-metric"><small>示例阶段</small><strong>5</strong></div>
          <div className="tech-metric"><small>关键标注</small><strong>1</strong></div>
          <div className="tech-metric"><small>数据状态</small><strong>FIXTURE</strong></div>
        </div>
      </main>
      <Takeaway>结论层级必须来自“图表证据 + 解释 + 边界”，而不是只靠一个醒目的数字。</Takeaway>
    </>
  );
}

const renderers = [<CoverPrototype />, <MethodPrototype />, <ResultPrototype />];
const slides: DeckSlide[] = manifest.slides.map((slide, index) => ({ ...slide, render: () => renderers[index] }));

export function App() {
  return <DeckRuntime slides={slides} chapters={chapters.slice(0, 3).map((item, index) => ({ label: item.label, slide: index }))} ariaLabel={manifest.title} visualStyle={resolveVisualStyle(manifest.visualStyle)} />;
}
