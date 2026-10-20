"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ReportNavigation } from "./ReportNavigation";
import { resolveVisualStyle, type VisualStyle } from "../visual-style";

export type ReportSectionRole = "hero" | "introduction" | "analysis-design" | "decisive-result" | "finding" | "deep-insight" | "application" | "boundary" | "synthesis" | "closing";

export type ReportRenderContext = {
  active: boolean;
  printMode: boolean;
  reducedMotion: boolean;
};

export type ReportSection = {
  id: string;
  chapter: string;
  title: string;
  role: ReportSectionRole;
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
  render: (context: ReportRenderContext) => ReactNode;
};

function hashSectionId(sections: ReportSection[]) {
  const id = decodeURIComponent(window.location.hash.replace(/^#/, ""));
  return sections.some((section) => section.id === id) ? id : sections[0]?.id ?? "";
}

async function waitForReportAssets(cancelled: () => boolean) {
  if (document.fonts?.ready) await document.fonts.ready;
  await Promise.all([...document.images].map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => {
    image.addEventListener("load", () => resolve(), { once: true });
    image.addEventListener("error", () => resolve(), { once: true });
  })));
  const waitUntil = Date.now() + 25000;
  while ([...document.querySelectorAll<HTMLElement>("[data-evidence-visual]")].some((visual) => visual.dataset.visualReady !== "true")) {
    if (Date.now() > waitUntil) throw new Error("Evidence visuals did not reach data-visual-ready=true before report readiness");
    await new Promise((resolve) => window.setTimeout(resolve, 80));
  }
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  if (!cancelled()) document.documentElement.dataset.reportReady = "true";
}

export function ReportRuntime({ sections, ariaLabel, navigationLabel = "报告章节", visualStyle }: {
  sections: ReportSection[];
  ariaLabel: string;
  navigationLabel?: string;
  visualStyle?: VisualStyle;
}) {
  const resolvedVisualStyle = resolveVisualStyle(visualStyle);
  const [activeId, setActiveId] = useState(() => typeof window === "undefined" ? sections[0]?.id ?? "" : hashSectionId(sections));
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const printMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("print") === "1";
  const sectionIds = useMemo(() => new Set(sections.map((section) => section.id)), [sections]);

  const goTo = useCallback((id: string, historyMode: "push" | "replace" = "push") => {
    if (!sectionIds.has(id)) return;
    const target = document.getElementById(id);
    if (!target) return;
    const url = new URL(window.location.href);
    url.hash = id;
    window.history[historyMode === "push" ? "pushState" : "replaceState"](null, "", url);
    setActiveId(id);
    setNavigationOpen(false);
    target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    const heading = target.querySelector<HTMLElement>("[data-report-section-heading]");
    window.setTimeout(() => heading?.focus({ preventScroll: true }), reducedMotion ? 0 : 360);
  }, [reducedMotion, sectionIds]);

  useEffect(() => {
    document.documentElement.classList.toggle("report-mode", !printMode);
    document.documentElement.classList.toggle("report-print-mode", printMode);
    return () => document.documentElement.classList.remove("report-mode", "report-print-mode");
  }, [printMode]);

  useEffect(() => {
    document.documentElement.dataset.visualStyle = resolvedVisualStyle;
    return () => {
      if (document.documentElement.dataset.visualStyle === resolvedVisualStyle) delete document.documentElement.dataset.visualStyle;
    };
  }, [resolvedVisualStyle]);

  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query?.matches === true);
    update();
    query?.addEventListener?.("change", update);
    return () => query?.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    let cancelled = false;
    document.documentElement.dataset.reportReady = "loading";
    void waitForReportAssets(() => cancelled).catch((error) => {
      document.documentElement.dataset.reportReady = "error";
      console.error("[report-ready]", error);
    });
    return () => {
      cancelled = true;
      delete document.documentElement.dataset.reportReady;
    };
  }, [sections]);

  useEffect(() => {
    if (printMode) return;
    const updateProgress = () => {
      const available = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      setProgress(Math.max(0, Math.min(1, window.scrollY / available)));
    };
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, [printMode]);

  useEffect(() => {
    if (printMode) return;
    const observer = new IntersectionObserver((entries) => {
      const candidate = entries.filter((entry) => entry.isIntersecting).sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top))[0];
      const id = candidate?.target.id;
      if (!id || !sectionIds.has(id)) return;
      setActiveId(id);
      const url = new URL(window.location.href);
      url.hash = id;
      window.history.replaceState(null, "", url);
    }, { rootMargin: "-18% 0px -67% 0px", threshold: [0, .08, .35, .7] });
    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [printMode, sectionIds, sections]);

  useEffect(() => {
    if (printMode) return;
    const restore = () => {
      const id = hashSectionId(sections);
      if (!id) return;
      setActiveId(id);
      document.getElementById(id)?.scrollIntoView({ behavior: "auto", block: "start" });
    };
    restore();
    window.addEventListener("hashchange", restore);
    window.addEventListener("popstate", restore);
    return () => {
      window.removeEventListener("hashchange", restore);
      window.removeEventListener("popstate", restore);
    };
  }, [printMode, sections]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === "Escape" && navigationOpen) {
        event.preventDefault();
        setNavigationOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigationOpen]);

  return (
    <main className={`report-runtime ${printMode ? "is-print" : ""}`} aria-label={ariaLabel} data-report-runtime="ReportRuntime" data-section-source="shared" data-section-count={sections.length} data-visual-style={resolvedVisualStyle}>
      <div className="report-reading-progress" aria-hidden="true"><i style={{ width: `${progress * 100}%` }} /></div>
      <button className="report-navigation-toggle" data-editor-lock="true" type="button" aria-expanded={navigationOpen} aria-controls="report-navigation" onClick={() => setNavigationOpen((open) => !open)}>目录</button>
      <ReportNavigation id="report-navigation" label={navigationLabel} sections={sections} activeId={activeId} open={navigationOpen} onNavigate={goTo} onClose={() => setNavigationOpen(false)} />
      <div className="report-document">
        {sections.map((section) => (
          <section
            id={section.id}
            key={section.id}
            className={`report-section report-role-${section.role} ${section.className ?? ""}`}
            data-report-section="true"
            data-section-role={section.role}
            data-claim-ids={section.claimIds?.join(" ")}
            data-visual-ids={section.visualIds?.join(" ")}
            data-finding-ids={section.findingIds?.join(" ")}
            data-substantive-contribution={section.substantiveContribution}
            data-substantive-kinds={section.substantiveKinds?.join(" ")}
            data-data-fact-ids={section.dataFactIds?.join(" ")}
            data-method-ids={section.methodIds?.join(" ")}
            data-result-ids={section.resultIds?.join(" ")}
            data-content-utility-status={section.contentUtilityStatus}
            aria-labelledby={`${section.id}-title`}
          >
            {section.render({ active: activeId === section.id, printMode, reducedMotion })}
          </section>
        ))}
      </div>
      <button className="report-back-to-top" data-editor-lock="true" type="button" onClick={() => goTo(sections[0]?.id ?? "", "push")} aria-label="返回报告顶部">↑</button>
    </main>
  );
}
