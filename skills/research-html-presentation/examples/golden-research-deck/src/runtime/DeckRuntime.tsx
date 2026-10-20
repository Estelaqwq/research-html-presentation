"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { PresenterView, type PresenterConnectionStatus } from "./PresenterView";
import { auditActiveSlide } from "./overflowAudit";
import { resolveVisualStyle, type VisualStyle } from "./visual-style";

export const DECK_WIDTH = 1600;
export const DECK_HEIGHT = 900;

export type ZoomPayload = { src: string; alt: string; caption: string };

export type SlideRenderContext = {
  fragment: number;
  fragmentClass: (step: number) => string;
  focusedId: string | null;
  toggleFocus: (id: string) => void;
  openZoom: (payload: ZoomPayload, trigger?: HTMLElement | null) => void;
};

export type DeckSlide = {
  id: string;
  section: string;
  title: string;
  type?: "cover" | "content" | "synthesis" | "closing";
  layout?: string;
  fragments?: number;
  notes?: string | string[];
  className?: string;
  claimIds?: string[];
  visualIds?: string[];
  findingIds?: string[];
  substantiveContribution?: string;
  substantiveKinds?: string[];
  dataFactIds?: string[];
  methodIds?: string[];
  resultIds?: string[];
  contentUtilityStatus?: "keep" | "merge" | "remove";
  render: (context: SlideRenderContext) => ReactNode;
};

export type Chapter = { label: string; slide: number };

type RuntimeMode = "viewer" | "presenter" | "print";
type SyncMessage = {
  source: string;
  kind: "request-state" | "state" | "heartbeat" | "disconnect";
  activeSlide?: number;
  fragments?: Record<number, number>;
  sentAt: number;
};

function clampSlide(index: number, totalSlides: number) {
  return Math.max(0, Math.min(totalSlides - 1, index));
}

function normalizeFragments(value: unknown, slides: DeckSlide[]) {
  if (!value || typeof value !== "object") return {};
  const result: Record<number, number> = {};
  Object.entries(value).forEach(([rawIndex, rawFragment]) => {
    const index = Number(rawIndex);
    const fragment = Number(rawFragment);
    if (!Number.isInteger(index) || index < 0 || index >= slides.length || !Number.isInteger(fragment)) return;
    result[index] = Math.max(0, Math.min(slides[index]?.fragments ?? 0, fragment));
  });
  return result;
}

function PrintDeck({ slides, ariaLabel, visualStyle }: { slides: DeckSlide[]; ariaLabel: string; visualStyle: VisualStyle }) {
  useEffect(() => {
    let cancelled = false;
    document.documentElement.dataset.deckReady = "loading";
    const waitForAssets = async () => {
      if (document.fonts?.ready) await document.fonts.ready;
      const images = [...document.images];
      await Promise.all(images.map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      })));
      const evidenceVisuals = [...document.querySelectorAll<HTMLElement>("[data-evidence-visual]")];
      if (evidenceVisuals.some((visual) => visual.dataset.visualReady !== "true")) {
        await new Promise<void>((resolve, reject) => {
          const finishIfReady = () => {
            if (evidenceVisuals.every((visual) => visual.dataset.visualReady === "true")) {
              observer.disconnect();
              window.clearTimeout(timeout);
              resolve();
            }
          };
          const observer = new MutationObserver(finishIfReady);
          evidenceVisuals.forEach((visual) => observer.observe(visual, { attributes: true, attributeFilter: ["data-visual-ready"] }));
          const timeout = window.setTimeout(() => {
            observer.disconnect();
            reject(new Error("Evidence visuals did not reach data-visual-ready=true before print export"));
          }, 25000);
          finishIfReady();
        });
      }
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (!cancelled) document.documentElement.dataset.deckReady = "true";
    };
    void waitForAssets().catch((error) => {
      document.documentElement.dataset.deckReady = "error";
      console.error("[deck-ready]", error);
    });
    return () => {
      cancelled = true;
      delete document.documentElement.dataset.deckReady;
    };
  }, [slides]);

  return (
    <main className="print-deck" aria-label={`${ariaLabel} PDF export`} data-visual-style={visualStyle}>
      {slides.map((slide, index) => {
        const fragment = slide.fragments ?? 0;
        const context: SlideRenderContext = {
          fragment,
          fragmentClass: (step) => `fragment ${fragment >= step ? "is-visible" : ""}`,
          focusedId: null,
          toggleFocus: () => undefined,
          openZoom: () => undefined,
        };
        return (
          <section
            className={`slide print-slide is-active ${slide.className ?? ""}`}
            key={slide.id}
            data-slide-id={slide.id}
            data-slide-type={slide.type ?? "content"}
            data-layout={slide.layout}
            data-claim-ids={slide.claimIds?.join(" ")}
            data-visual-ids={slide.visualIds?.join(" ")}
            data-finding-ids={slide.findingIds?.join(" ")}
            data-substantive-contribution={slide.substantiveContribution}
            data-substantive-kinds={slide.substantiveKinds?.join(" ")}
            data-data-fact-ids={slide.dataFactIds?.join(" ")}
            data-method-ids={slide.methodIds?.join(" ")}
            data-result-ids={slide.resultIds?.join(" ")}
            data-content-utility-status={slide.contentUtilityStatus}
            aria-roledescription="slide"
            aria-label={`第 ${index + 1} 页：${slide.title}`}
            inert
          >
            {slide.render(context)}
            <div className="print-page-footer" aria-hidden="true"><span>{slide.section}</span><strong>{String(index + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}</strong></div>
          </section>
        );
      })}
    </main>
  );
}

export function DeckRuntime({ slides, chapters = [], ariaLabel, visualStyle }: { slides: DeckSlide[]; chapters?: Chapter[]; ariaLabel: string; visualStyle?: VisualStyle }) {
  const totalSlides = slides.length;
  const resolvedVisualStyle = resolveVisualStyle(visualStyle);
  const [activeSlide, setActiveSlide] = useState(0);
  const [fragments, setFragments] = useState<Record<number, number>>({});
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [chapterOpen, setChapterOpen] = useState(false);
  const [zoom, setZoom] = useState<ZoomPayload | null>(null);
  const [scale, setScale] = useState(1);
  const [runtimeMode, setRuntimeMode] = useState<RuntimeMode>("viewer");
  const [channelId, setChannelId] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<PresenterConnectionStatus>("connecting");
  const [controlsActive, setControlsActive] = useState(true);
  const [showControlHint, setShowControlHint] = useState(true);
  const [runtimeNotice, setRuntimeNotice] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const zoomReturnRef = useRef<HTMLElement | null>(null);
  const presenterWindowRef = useRef<Window | null>(null);
  const publishRef = useRef<((message: Omit<SyncMessage, "source" | "sentAt">) => void) | null>(null);
  const sourceIdRef = useRef(`deck-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`);
  const stateRef = useRef({ activeSlide: 0, fragments: {} as Record<number, number> });

  const goTo = useCallback((index: number) => {
    const nextIndex = clampSlide(index, totalSlides);
    setActiveSlide(nextIndex);
    setFragments((state) => ({ ...state, [nextIndex]: 0 }));
    setFocusedId(null);
    setChapterOpen(false);
    setZoom(null);
    window.history.replaceState(null, "", `#/${nextIndex + 1}`);
  }, [totalSlides]);

  const next = useCallback(() => {
    const currentFragment = fragments[activeSlide] ?? 0;
    const maxFragment = slides[activeSlide]?.fragments ?? 0;
    if (currentFragment < maxFragment) {
      setFragments((state) => ({ ...state, [activeSlide]: currentFragment + 1 }));
      return;
    }
    goTo(activeSlide + 1);
  }, [activeSlide, fragments, goTo, slides]);

  const previous = useCallback(() => {
    const currentFragment = fragments[activeSlide] ?? 0;
    if (currentFragment > 0) {
      setFragments((state) => ({ ...state, [activeSlide]: currentFragment - 1 }));
      return;
    }
    goTo(activeSlide - 1);
  }, [activeSlide, fragments, goTo]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
      setRuntimeNotice("");
    } catch {
      setRuntimeNotice("浏览器未允许进入全屏；页面导航仍可正常使用。");
    }
  }, []);

  const closeZoom = useCallback(() => {
    setZoom(null);
    requestAnimationFrame(() => zoomReturnRef.current?.focus());
  }, []);

  const openPresenter = useCallback(() => {
    if (runtimeMode !== "viewer") return;
    const token = channelId || (typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    if (!channelId) setChannelId(token);
    const url = new URL(window.location.href);
    url.searchParams.delete("print");
    url.searchParams.set("presenter", "1");
    url.searchParams.set("channel", token);
    url.hash = `#/${activeSlide + 1}`;
    presenterWindowRef.current = window.open(url.toString(), `research-deck-presenter-${token}`, "popup=yes,width=1440,height=900");
    if (!presenterWindowRef.current) {
      const message = "浏览器阻止了演讲者视图窗口，请允许此页面打开弹出窗口后重试。";
      setRuntimeNotice(message);
      window.alert(message);
    } else setRuntimeNotice("");
  }, [activeSlide, channelId, runtimeMode]);

  useEffect(() => {
    if (runtimeMode !== "viewer") return;
    let soften = window.setTimeout(() => setControlsActive(false), 4200);
    const hideHint = window.setTimeout(() => setShowControlHint(false), 5200);
    const reveal = () => {
      setControlsActive(true);
      window.clearTimeout(soften);
      soften = window.setTimeout(() => setControlsActive(false), 2200);
    };
    window.addEventListener("pointermove", reveal, { passive: true });
    window.addEventListener("focus", reveal);
    return () => {
      window.clearTimeout(soften);
      window.clearTimeout(hideHint);
      window.removeEventListener("pointermove", reveal);
      window.removeEventListener("focus", reveal);
    };
  }, [runtimeMode]);

  useEffect(() => {
    document.documentElement.dataset.visualStyle = resolvedVisualStyle;
    return () => {
      if (document.documentElement.dataset.visualStyle === resolvedVisualStyle) delete document.documentElement.dataset.visualStyle;
    };
  }, [resolvedVisualStyle]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextMode: RuntimeMode = params.get("print") === "1" ? "print" : params.get("presenter") === "1" ? "presenter" : "viewer";
    setRuntimeMode(nextMode);
    setChannelId(params.get("channel") ?? "");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("presenter-mode", runtimeMode === "presenter");
    document.documentElement.classList.toggle("print-mode", runtimeMode === "print");
    return () => {
      document.documentElement.classList.remove("presenter-mode", "print-mode");
    };
  }, [runtimeMode]);

  useEffect(() => {
    if (runtimeMode !== "viewer") return;
    const fit = () => setScale(Math.min(window.innerWidth / DECK_WIDTH, window.innerHeight / DECK_HEIGHT));
    fit();
    window.addEventListener("resize", fit);
    document.addEventListener("fullscreenchange", fit);
    return () => {
      window.removeEventListener("resize", fit);
      document.removeEventListener("fullscreenchange", fit);
    };
  }, [runtimeMode]);

  useEffect(() => {
    const applyHash = () => {
      const match = window.location.hash.match(/#\/(\d+)/);
      if (match) {
        const nextSlide = clampSlide(Number(match[1]) - 1, totalSlides);
        setActiveSlide(nextSlide);
        setFragments((state) => ({ ...state, [nextSlide]: state[nextSlide] ?? 0 }));
        setFocusedId(null);
        setChapterOpen(false);
        setZoom(null);
      } else window.history.replaceState(null, "", "#/1");
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [totalSlides]);

  useEffect(() => {
    stateRef.current = { activeSlide, fragments };
    publishRef.current?.({ kind: "state", activeSlide, fragments });
  }, [activeSlide, fragments]);

  useEffect(() => {
    if (!channelId || runtimeMode === "print") return;
    const storageKey = `research-deck-presenter:${channelId}`;
    const source = sourceIdRef.current;
    const isPresenter = runtimeMode === "presenter";
    let lastSeen = Date.now();
    let broadcast: BroadcastChannel | null = null;

    const publish = (message: Omit<SyncMessage, "source" | "sentAt">) => {
      const envelope: SyncMessage = { ...message, source, sentAt: Date.now() };
      if (broadcast) broadcast.postMessage(envelope);
      else localStorage.setItem(storageKey, JSON.stringify(envelope));
    };

    const receive = (message: unknown) => {
      if (!message || typeof message !== "object") return;
      const envelope = message as SyncMessage;
      if (envelope.source === source || !["request-state", "state", "heartbeat", "disconnect"].includes(envelope.kind)) return;
      lastSeen = Date.now();
      if (envelope.kind === "disconnect") {
        if (isPresenter) setConnectionStatus("disconnected");
        return;
      }
      setConnectionStatus("connected");
      if (envelope.kind === "request-state" && !isPresenter) {
        publish({ kind: "state", ...stateRef.current });
        return;
      }
      if (envelope.kind !== "state" || !Number.isInteger(envelope.activeSlide)) return;
      const nextSlide = clampSlide(envelope.activeSlide ?? 0, totalSlides);
      const nextFragments = normalizeFragments(envelope.fragments, slides);
      const current = stateRef.current;
      if (current.activeSlide === nextSlide && JSON.stringify(current.fragments) === JSON.stringify(nextFragments)) return;
      stateRef.current = { activeSlide: nextSlide, fragments: nextFragments };
      setActiveSlide(nextSlide);
      setFragments(nextFragments);
      setFocusedId(null);
      setChapterOpen(false);
      setZoom(null);
      window.history.replaceState(null, "", `#/${nextSlide + 1}`);
    };

    if (typeof BroadcastChannel !== "undefined") {
      broadcast = new BroadcastChannel(storageKey);
      broadcast.addEventListener("message", (event) => receive(event.data));
    } else {
      const onStorage = (event: StorageEvent) => {
        if (event.key !== storageKey || !event.newValue) return;
        try { receive(JSON.parse(event.newValue)); } catch { /* Ignore malformed fallback messages. */ }
      };
      window.addEventListener("storage", onStorage);
      publishRef.current = publish;
      if (isPresenter) publish({ kind: "request-state" });
      else publish({ kind: "state", ...stateRef.current });
      const heartbeat = window.setInterval(() => publish({ kind: isPresenter ? "request-state" : "heartbeat" }), 2200);
      const health = window.setInterval(() => { if (isPresenter && Date.now() - lastSeen > 5500) setConnectionStatus("disconnected"); }, 1000);
      return () => {
        publish({ kind: "disconnect" });
        publishRef.current = null;
        window.clearInterval(heartbeat);
        window.clearInterval(health);
        window.removeEventListener("storage", onStorage);
      };
    }

    publishRef.current = publish;
    if (isPresenter) publish({ kind: "request-state" });
    else publish({ kind: "state", ...stateRef.current });
    const heartbeat = window.setInterval(() => publish({ kind: isPresenter ? "request-state" : "heartbeat" }), 2200);
    const health = window.setInterval(() => { if (isPresenter && Date.now() - lastSeen > 5500) setConnectionStatus("disconnected"); }, 1000);
    return () => {
      publish({ kind: "disconnect" });
      publishRef.current = null;
      window.clearInterval(heartbeat);
      window.clearInterval(health);
      broadcast?.close();
    };
  }, [channelId, runtimeMode, slides, totalSlides]);

  useEffect(() => {
    if (runtimeMode === "print") return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;

      if (event.key === "Escape") {
        if (zoom) closeZoom();
        else if (chapterOpen) setChapterOpen(false);
        else if (focusedId) setFocusedId(null);
        else if (document.fullscreenElement) void document.exitFullscreen();
        return;
      }
      if (zoom || chapterOpen) return;

      if (["ArrowRight", "PageDown"].includes(event.key) || (event.key === " " && !event.shiftKey)) {
        event.preventDefault();
        next();
      } else if (["ArrowLeft", "PageUp"].includes(event.key) || (event.key === " " && event.shiftKey)) {
        event.preventDefault();
        previous();
      } else if (event.key === "Home") {
        event.preventDefault();
        goTo(0);
      } else if (event.key === "End") {
        event.preventDefault();
        goTo(totalSlides - 1);
      } else if (event.key.toLowerCase() === "f" && runtimeMode === "viewer") {
        event.preventDefault();
        void toggleFullscreen();
      } else if (event.key.toLowerCase() === "m" && runtimeMode === "viewer") {
        event.preventDefault();
        setChapterOpen(true);
      } else if (event.key.toLowerCase() === "p" && runtimeMode === "viewer") {
        event.preventDefault();
        openPresenter();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [chapterOpen, closeZoom, focusedId, goTo, next, openPresenter, previous, runtimeMode, toggleFullscreen, totalSlides, zoom]);

  useEffect(() => {
    if (zoom) requestAnimationFrame(() => closeButtonRef.current?.focus());
  }, [zoom]);

  useEffect(() => {
    if (runtimeMode !== "viewer") return;
    const timer = window.setTimeout(() => {
      auditActiveSlide(document, { left: 72, right: 72, top: 42, bottom: 36 });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [activeSlide, fragments, runtimeMode]);

  const fragment = fragments[activeSlide] ?? 0;
  const derivedChapters = useMemo(() => {
    if (chapters.length) return chapters;
    const seen = new Set<string>();
    return slides.flatMap((slide, index) => {
      if (!slide.section || seen.has(slide.section)) return [];
      seen.add(slide.section);
      return [{ label: slide.section, slide: index }];
    });
  }, [chapters, slides]);

  const activeChapter = useMemo(() => {
    const chapter = [...derivedChapters].reverse().find((item) => activeSlide >= item.slide);
    return chapter?.label ?? slides[activeSlide]?.section ?? "";
  }, [activeSlide, derivedChapters, slides]);

  const renderContext: SlideRenderContext = {
    fragment,
    fragmentClass: (step) => `fragment ${fragment >= step ? "is-visible" : ""}`,
    focusedId,
    toggleFocus: (id) => setFocusedId((current) => current === id ? null : id),
    openZoom: (payload, trigger) => {
      zoomReturnRef.current = trigger ?? null;
      setZoom(payload);
    },
  };

  if (runtimeMode === "print") return <PrintDeck slides={slides} ariaLabel={ariaLabel} visualStyle={resolvedVisualStyle} />;

  if (runtimeMode === "presenter") {
    return <PresenterView slides={slides} activeSlide={activeSlide} fragment={fragment} activeChapter={activeChapter} connectionStatus={connectionStatus} visualStyle={resolvedVisualStyle} onPrevious={previous} onNext={next} />;
  }

  return (
    <main className="stage-shell" aria-label={ariaLabel} data-deck-runtime="DeckRuntime" data-slide-source="shared" data-slide-count={totalSlides} data-visual-style={resolvedVisualStyle}>
      <div className="deck-frame" style={{ transform: `translate(-50%, -50%) scale(${scale})` }} inert={Boolean(zoom)}>
        {slides.map((slide, index) => (
          <section
            className={`slide ${slide.className ?? ""} ${index === activeSlide ? "is-active" : ""}`}
            key={slide.id}
            data-slide-id={slide.id}
            data-slide-type={slide.type ?? "content"}
            data-layout={slide.layout}
            data-claim-ids={slide.claimIds?.join(" ")}
            data-visual-ids={slide.visualIds?.join(" ")}
            data-finding-ids={slide.findingIds?.join(" ")}
            data-substantive-contribution={slide.substantiveContribution}
            data-substantive-kinds={slide.substantiveKinds?.join(" ")}
            data-data-fact-ids={slide.dataFactIds?.join(" ")}
            data-method-ids={slide.methodIds?.join(" ")}
            data-result-ids={slide.resultIds?.join(" ")}
            data-content-utility-status={slide.contentUtilityStatus}
            aria-hidden={index !== activeSlide}
            inert={index !== activeSlide}
            aria-roledescription="slide"
            aria-label={`第 ${index + 1} 页：${slide.title}`}
          >
            {slide.render(index === activeSlide ? renderContext : { ...renderContext, fragment: 0 })}
          </section>
        ))}

        <div className={`deck-toolbar ${controlsActive ? "is-active" : "is-resting"}`} data-runtime-controls="true" data-editor-lock="true">
          <button data-runtime-control="chapters" onClick={() => setChapterOpen((open) => !open)} aria-expanded={chapterOpen} aria-controls="chapter-panel">目录 <kbd>M</kbd></button>
          <button data-runtime-control="fullscreen" onClick={() => void toggleFullscreen()}>全屏 <kbd>F</kbd></button>
          <button data-runtime-control="presenter" onClick={openPresenter}>演讲者视图 <kbd>P</kbd></button>
        </div>
        {showControlHint ? <div className="control-discovery-hint" role="status">M 目录 · P 演讲者视图 · F 全屏</div> : null}
        {runtimeNotice ? <div className="runtime-notice" role="alert"><span>{runtimeNotice}</span><button type="button" onClick={() => setRuntimeNotice("")} aria-label="关闭提示">×</button></div> : null}
        <button className="nav-arrow nav-prev" data-editor-lock="true" onClick={previous} disabled={activeSlide === 0 && fragment === 0} aria-label="上一页">‹</button>
        <button className="nav-arrow nav-next" data-editor-lock="true" onClick={next} disabled={activeSlide === totalSlides - 1 && fragment === (slides[activeSlide]?.fragments ?? 0)} aria-label="下一页">›</button>

        <div className="deck-footer">
          <span>{activeChapter}</span>
          <span className="key-hint">← / → 翻页 · Space 继续</span>
          <strong aria-live="polite">{String(activeSlide + 1).padStart(2, "0")} / {String(totalSlides).padStart(2, "0")}</strong>
        </div>
        <div className="progress-track" data-editor-lock="true" aria-hidden="true"><i style={{ width: `${((activeSlide + 1) / totalSlides) * 100}%` }} /></div>

        <aside id="chapter-panel" className={`chapter-panel ${chapterOpen ? "is-open" : ""}`} aria-hidden={!chapterOpen} inert={!chapterOpen} aria-label="章节导航">
          <div className="chapter-panel-head"><b>章节导航</b><button onClick={() => setChapterOpen(false)} aria-label="关闭章节导航">×</button></div>
          {derivedChapters.map((chapter, index) => (
            <button key={chapter.label} className={activeSlide >= chapter.slide && (index === derivedChapters.length - 1 || activeSlide < derivedChapters[index + 1].slide) ? "is-current" : ""} onClick={() => goTo(chapter.slide)}>
              <span>{String(index + 1).padStart(2, "0")}</span>{chapter.label}
            </button>
          ))}
        </aside>
      </div>

      {zoom && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={zoom.caption} onMouseDown={(event) => { if (event.target === event.currentTarget) closeZoom(); }}>
          <figure className="lightbox-content">
            <button ref={closeButtonRef} className="lightbox-close" onClick={closeZoom} aria-label="关闭放大视图">×</button>
            <img src={zoom.src} alt={zoom.alt} />
            <figcaption>{zoom.caption}</figcaption>
          </figure>
        </div>
      )}
    </main>
  );
}
