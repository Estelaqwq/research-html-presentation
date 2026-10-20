"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DeckSlide, SlideRenderContext } from "./DeckRuntime";
import type { VisualStyle } from "./visual-style";

const PREVIEW_WIDTH = 1600;
const PREVIEW_HEIGHT = 900;

export type PresenterConnectionStatus = "connecting" | "connected" | "disconnected";

function SlidePreview({ slide, fragment, label }: { slide?: DeckSlide; fragment: number; label: string }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const fit = () => setScale(Math.min(frame.clientWidth / PREVIEW_WIDTH, frame.clientHeight / PREVIEW_HEIGHT));
    fit();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(fit);
    observer?.observe(frame);
    window.addEventListener("resize", fit);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, []);

  if (!slide) return <div ref={frameRef} className="presenter-preview-frame presenter-preview-empty"><span>{label}</span><b>演示结束</b></div>;

  const context: SlideRenderContext = {
    fragment,
    fragmentClass: (step) => `fragment ${fragment >= step ? "is-visible" : ""}`,
    focusedId: null,
    toggleFocus: () => undefined,
    openZoom: () => undefined,
  };

  return (
    <div ref={frameRef} className="presenter-preview-frame" aria-label={label}>
      <div className="presenter-preview-canvas" style={{ transform: `scale(${scale})` }}>
        <section
          className={`slide is-active presenter-preview-slide ${slide.className ?? ""}`}
          data-slide-id={slide.id}
          data-slide-type={slide.type ?? "content"}
          data-layout={slide.layout}
          data-finding-ids={slide.findingIds?.join(" ")}
          aria-roledescription="slide"
          aria-label={slide.title}
          inert
        >
          {slide.render(context)}
        </section>
      </div>
    </div>
  );
}

function formatTime(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function PresenterView({
  slides,
  activeSlide,
  fragment,
  activeChapter,
  connectionStatus,
  visualStyle = "academic-light",
  onPrevious,
  onNext,
}: {
  slides: DeckSlide[];
  activeSlide: number;
  fragment: number;
  activeChapter: string;
  connectionStatus: PresenterConnectionStatus;
  visualStyle?: VisualStyle;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const startedAtRef = useRef(0);
  const elapsedAtStartRef = useRef(0);
  const current = slides[activeSlide];
  const next = slides[activeSlide + 1];

  useEffect(() => {
    if (!running) return;
    const update = () => setElapsed(elapsedAtStartRef.current + performance.now() - startedAtRef.current);
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [running]);

  const startTimer = useCallback(() => {
    if (running) return;
    elapsedAtStartRef.current = elapsed;
    startedAtRef.current = performance.now();
    setRunning(true);
  }, [elapsed, running]);

  const pauseTimer = useCallback(() => {
    if (!running) return;
    const value = elapsedAtStartRef.current + performance.now() - startedAtRef.current;
    setElapsed(value);
    setRunning(false);
  }, [running]);

  const resetTimer = useCallback(() => {
    setRunning(false);
    setElapsed(0);
    elapsedAtStartRef.current = 0;
    startedAtRef.current = 0;
  }, []);

  const notes = Array.isArray(current?.notes) ? current.notes : current?.notes ? [current.notes] : [];
  const statusText = connectionStatus === "connected" ? "已连接观众窗口" : connectionStatus === "connecting" ? "正在连接观众窗口" : "连接已中断";

  return (
    <main className="presenter-view" aria-label="演讲者视图" data-visual-style={visualStyle}>
      <header className="presenter-header" data-editor-lock="true">
        <div>
          <span>{activeChapter}</span>
          <h1>{current?.title ?? "演讲者视图"}</h1>
        </div>
        <div className={`presenter-connection is-${connectionStatus}`} aria-live="polite"><i aria-hidden="true" />{statusText}</div>
        <strong data-runtime-page-display data-runtime-current-page={activeSlide + 1}>{String(activeSlide + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}</strong>
      </header>

      <section className="presenter-previews">
        <article>
          <h2 data-editor-lock="true">当前页</h2>
          <SlidePreview slide={current} fragment={fragment} label="当前幻灯片预览" />
        </article>
        <article>
          <h2 data-editor-lock="true">下一页</h2>
          <SlidePreview slide={next} fragment={0} label="下一张幻灯片预览" />
        </article>
      </section>

      <section className="presenter-lower" data-editor-lock="true">
        <article className="presenter-notes">
          <h2>演讲者备注</h2>
          {notes.length ? <ul>{notes.map((note, index) => <li key={`${current.id}-note-${index}`}>{note}</li>)}</ul> : <p>本页没有演讲者备注。</p>}
        </article>
        <aside className="presenter-controls" aria-label="演讲控制">
          <div className="presenter-timer" aria-live="off">{formatTime(elapsed)}</div>
          <div className="presenter-control-row">
            <button type="button" onClick={startTimer} disabled={running}>开始</button>
            <button type="button" onClick={pauseTimer} disabled={!running}>暂停</button>
            <button type="button" onClick={resetTimer}>重置</button>
          </div>
          <div className="presenter-control-row presenter-navigation">
            <button type="button" onClick={onPrevious} disabled={activeSlide === 0 && fragment === 0}>上一项</button>
            <button type="button" onClick={onNext} disabled={activeSlide === slides.length - 1 && fragment === (current?.fragments ?? 0)}>下一项</button>
          </div>
          <p>← / → 或 Space 控制页面与分步出现</p>
        </aside>
      </section>
    </main>
  );
}
