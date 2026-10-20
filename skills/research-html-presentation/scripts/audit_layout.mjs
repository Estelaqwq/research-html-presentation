#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { withDeckPage } from "./browser_helpers.mjs";
import { computeRenderFingerprint } from "./review_fingerprint.mjs";

const target = process.argv[2] ?? process.cwd();
const outputPath = path.resolve(process.argv[3] ?? (target.startsWith("http") ? path.join(process.cwd(), ".deck-render", "layout-audit.json") : path.join(path.resolve(target), ".deck-render", "layout-audit.json")));
await mkdir(path.dirname(outputPath), { recursive: true });
let manifestStage = "complete";
let enforceQuality = false;
let manifestDocument = {};
if (!target.startsWith("http")) {
  try {
    const manifest = JSON.parse(await readFile(path.join(path.resolve(target), "deck-manifest.json"), "utf8"));
    manifestDocument = manifest;
    manifestStage = manifest.stage ?? "complete";
    enforceQuality = manifest.newProject === true && Number(manifest.qualityContractVersion ?? 0) >= 1;
  } catch {
    // Direct URLs and legacy projects retain the advisory audit behavior.
  }
}

try {
  const report = await withDeckPage(target, async ({ page, baseUrl }) => {
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    if (await page.locator("[data-report-runtime='ReportRuntime']").count()) {
      const viewports = [{ width: 1600, height: 1000 }, { width: 1180, height: 900 }, { width: 720, height: 900 }];
      const reportViews = [];
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.reload({ waitUntil: "networkidle" });
        await page.waitForFunction(() => document.documentElement.dataset.reportReady === "true", undefined, { timeout: 30000 });
        await page.waitForFunction(() => [...document.querySelectorAll("[data-evidence-visual]")].every((visual) => visual.getAttribute("data-visual-ready") === "true"), undefined, { timeout: 30000 });
        const findings = await page.evaluate(async ({ distortionTolerance, stage, enforceQuality, brandingProfile }) => {
          const result = [];
          const add = (severity, type, element, message) => result.push({ severity, type, element, message });
          const gateSeverity = (fallback = "warning") => stage === "complete" && enforceQuality ? "error" : fallback === "error" ? "warning" : fallback;
          const label = (element) => element.getAttribute("data-audit-label") || element.getAttribute("aria-label") || element.id || element.className || element.tagName;
          const visible = (element) => element instanceof Element && element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0 && getComputedStyle(element).visibility !== "hidden";
          const union = (rects) => rects.reduce((box, rect) => box ? ({ left: Math.min(box.left, rect.left), top: Math.min(box.top, rect.top), right: Math.max(box.right, rect.right), bottom: Math.max(box.bottom, rect.bottom) }) : ({ left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }), null);
          const unionArea = (rects) => {
            const valid = rects.filter((rect) => rect && rect.right > rect.left && rect.bottom > rect.top);
            if (!valid.length) return 0;
            const xs = [...new Set(valid.flatMap((rect) => [rect.left, rect.right]))].sort((a, b) => a - b);
            let area = 0;
            for (let index = 0; index < xs.length - 1; index += 1) {
              const left = xs[index]; const right = xs[index + 1]; if (right <= left) continue;
              const spans = valid.filter((rect) => rect.left < right && rect.right > left).map((rect) => [rect.top, rect.bottom]).sort((a, b) => a[0] - b[0]);
              let covered = 0; let top = null; let bottom = null;
              for (const span of spans) { if (top === null || span[0] > bottom) { if (top !== null) covered += Math.max(0, bottom - top); top = span[0]; bottom = span[1]; } else bottom = Math.max(bottom, span[1]); }
              if (top !== null) covered += Math.max(0, bottom - top); area += (right - left) * covered;
            }
            return area;
          };
          const paintedHtmlBounds = (host) => {
            const rootIsChart = host.matches("table,[role='img'],[role='table'],[role='progressbar'],[data-html-chart],[data-css-chart],[data-chart-bar],[data-metric-card],[data-progress-bar]");
            const painted = [...(rootIsChart ? [host] : []), ...host.querySelectorAll("*:not([data-runtime-controls]):not([data-editor-panel])")].filter((node) => {
              const style = getComputedStyle(node); const rect = node.getBoundingClientRect();
              if (node.closest("[data-runtime-controls],[data-runtime-control],[data-report-navigation],[data-editor-panel],[data-editor-control],[data-audit-surface],[data-background-layer],[data-placeholder-layer],[data-scaffold-placeholder]")) return false;
              // A protected numerical plot is real evidence. Editing locks
              // must not erase its bars from visual measurement; controls and
              // explicitly declared decorative/audit layers stay excluded.
              if (node.closest("[data-editor-lock='true']") && !node.closest("[data-chart-host='true'],.evidence-chart-canvas,[data-html-chart],[data-css-chart]")) return false;
              if (rect.width <= 1 || rect.height <= 1 || style.display === "none" || style.visibility === "hidden" || Number(style.opacity || 1) <= 0) return false;
              const background = style.backgroundColor && !/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0\s*\)/i.test(style.backgroundColor) && style.backgroundColor !== "transparent";
              const border = ["Top", "Right", "Bottom", "Left"].some((side) => parseFloat(style[`border${side}Width`]) > 0 && style[`border${side}Style`] !== "none");
              const shadow = style.boxShadow && style.boxShadow !== "none";
              const semantic = node.matches("table,thead,tbody,tr,td,th,[role='img'],[role='table'],[role='progressbar'],[data-chart-bar],[data-metric-card],[data-progress-bar]");
              const copy = Boolean(node.textContent?.trim()) && parseFloat(style.fontSize) >= 10;
              return background || border || shadow || semantic || copy;
            }).map((node) => node.getBoundingClientRect());
            return union(painted.filter((rect) => rect.width > 1 || rect.height > 1));
          };
          const paintedChartBounds = (host) => {
            const svg = host.querySelector("svg");
            const hostRect = host.getBoundingClientRect();
            const svgRects = svg ? [...svg.querySelectorAll("path, rect, line, polyline, polygon, circle, text")]
              .filter((node) => { const style = getComputedStyle(node); return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) > 0; })
              .map((node) => ({ node, rect: node.getBoundingClientRect() }))
              .filter(({ node, rect }) => {
                if (rect.width <= 1 && rect.height <= 1) return false;
                const fullAreaBackground = node.matches("rect") && rect.width * rect.height >= hostRect.width * hostRect.height * .90 && !node.matches("[data-chart-mark],[data-chart-bar],[data-data-mark]");
                return !fullAreaBackground;
              })
              .map(({ rect }) => rect) : [];
            if (svgRects.length) return union(svgRects);
            const canvas = host.querySelector("canvas");
            if (canvas instanceof HTMLCanvasElement) { try { const context = canvas.getContext("2d", { willReadFrequently: true }); const pixels = context?.getImageData(0, 0, canvas.width, canvas.height).data; if (pixels) { let left = canvas.width, top = canvas.height, right = -1, bottom = -1; for (let y = 0; y < canvas.height; y += 2) for (let x = 0; x < canvas.width; x += 2) if (pixels[(y * canvas.width + x) * 4 + 3] > 8) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); } if (right >= left) { const rect = canvas.getBoundingClientRect(); return { left: rect.left + left / canvas.width * rect.width, top: rect.top + top / canvas.height * rect.height, right: rect.left + (right + 1) / canvas.width * rect.width, bottom: rect.top + (bottom + 1) / canvas.height * rect.height }; } } } catch {} }
            return paintedHtmlBounds(host);
          };
          if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) add("error", "report-horizontal-overflow", "document", `${document.documentElement.scrollWidth}px exceeds ${document.documentElement.clientWidth}px`);

          const sections = [...document.querySelectorAll("[data-report-section]")];
          const navItems = [...document.querySelectorAll("[data-report-nav-item]")];
          if (sections.length !== navItems.length) add("error", "report-navigation-count", "navigation", `${navItems.length} items / ${sections.length} sections`);
          const ids = new Set(sections.map((section) => section.id));
          navItems.forEach((item) => { if (!ids.has(item.getAttribute("data-report-nav-item"))) add("error", "report-navigation-target", label(item), "Navigation item does not resolve to a section"); });

          const documentRects = sections.map((section) => section.getBoundingClientRect());
          for (let index = 1; index < documentRects.length; index += 1) {
            const gap = documentRects[index].top - documentRects[index - 1].bottom;
            if (gap > 120) add("error", "report-section-gap", sections[index].id, `${Math.round(gap)}px empty gap between adjacent sections`);
            else if (gap > 48) add("warning", "report-section-gap", sections[index].id, `${Math.round(gap)}px gap weakens continuous reading`);
          }

          for (const section of sections) {
            section.scrollIntoView({ behavior: "auto", block: "start" });
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            let sectionRect = section.getBoundingClientRect();
            if (section.scrollWidth > section.clientWidth + 1) add("error", "report-section-overflow", section.id, `${section.scrollWidth}px exceeds ${section.clientWidth}px`);
            const role = section.getAttribute("data-section-role");
            if (!["hero", "closing"].includes(role ?? "")) {
              if (enforceQuality && !section.getAttribute("data-visual-center")) add(gateSeverity(), "visual-plan-missing", section.id, "Substantive report section must declare a material-adaptive visual center");
              const densityException = section.getAttribute("data-density-exception") === "true";
              const contribution = section.getAttribute("data-substantive-contribution");
              if (!contribution) add("warning", "report-content-utility-metadata", section.id, "Substantive report section has no contribution metadata");
              const rawCandidates = [...section.querySelectorAll("[data-report-section-heading], .report-finding-band, .evidence-strip, h3, h4, p, li, dt, dd, td, th, figure, img, canvas, svg")]
                .filter((node) => visible(node) && !node.matches("[data-evidence-content], [data-substantive-region], .section-kicker, .deck-footer, [data-runtime-controls], [data-editor-lock]"));
              const candidates = rawCandidates.filter((node, index, list) => !list.some((parent, parentIndex) => parentIndex !== index && parent.contains(node) && !node.matches("img,canvas,svg")));
              const sectionBody = section.getBoundingClientRect();
              const contentRects = candidates.map((node) => {
                const svgPaint = node.matches("svg") ? union([...node.querySelectorAll("path, rect, line, polyline, polygon, circle, text")].map((child) => child.getBoundingClientRect()).filter((rect) => rect.width > 1 || rect.height > 1)) : null;
                const rect = svgPaint ?? node.getBoundingClientRect();
                return { left: Math.max(rect.left, sectionBody.left), top: Math.max(rect.top, sectionBody.top), right: Math.min(rect.right, sectionBody.right), bottom: Math.min(rect.bottom, sectionBody.bottom) };
              }).filter((rect) => rect.right > rect.left && rect.bottom > rect.top);
              const content = union(contentRects);
              if (content) {
                const sectionArea = Math.max(1, sectionBody.width * sectionBody.height);
                const contentOccupancy = unionArea(contentRects) / sectionArea;
                const lowerBody = { left: sectionBody.left, top: sectionBody.top + sectionBody.height * .5, right: sectionBody.right, bottom: sectionBody.bottom };
                const lowerHalfCoverage = unionArea(contentRects.map((rect) => ({ left: Math.max(rect.left, lowerBody.left), top: Math.max(rect.top, lowerBody.top), right: Math.min(rect.right, lowerBody.right), bottom: Math.min(rect.bottom, lowerBody.bottom) })).filter((rect) => rect.right > rect.left && rect.bottom > rect.top)) / Math.max(1, (lowerBody.right - lowerBody.left) * (lowerBody.bottom - lowerBody.top));
                const visualRects = candidates.filter((node) => node.matches("img,canvas,svg,figure,.evidence-strip,.report-finding-band")).map((node) => node.getBoundingClientRect()).filter((rect) => rect.width > 0 && rect.height > 0);
                const dominantVisualRatio = visualRects.length ? Math.max(...visualRects.map((rect) => Math.max(0, rect.right - rect.left) * Math.max(0, rect.bottom - rect.top))) / sectionArea : "not-applicable";
                const contentBounds = union(contentRects);
                const largestEmptyRegionRatio = contentBounds ? Math.max(0, (sectionBody.bottom - contentBounds.bottom) / Math.max(1, sectionBody.height), (contentBounds.top - sectionBody.top) / Math.max(1, sectionBody.height)) : 1;
                const contentAreas = contentRects.map((rect) => rect.width * rect.height).filter((area) => Number.isFinite(area) && area > 0);
                const evidenceWeightBalance = contentAreas.length > 1 ? Math.max(...contentAreas) / Math.max(1, Math.min(...contentAreas)) : 1;
                const equalKeys = [...section.querySelectorAll("[data-audit-box]")].filter(visible).map((node) => { const rect = node.getBoundingClientRect(); return `${Math.round(rect.width / 8)}x${Math.round(rect.height / 8)}`; });
                const counts = new Map(); equalKeys.forEach((key) => counts.set(key, (counts.get(key) ?? 0) + 1));
                const repeatedEqualRegionCount = Math.max(0, ...counts.values()) >= 3 ? Math.max(...counts.values()) : 0;
                const chartHost = section.querySelector("[data-chart-host='true'], .evidence-chart-canvas, [data-html-chart], [data-css-chart]");
                const chartPaint = chartHost ? paintedChartBounds(chartHost) : null;
                const plotOccupancy = chartHost && chartPaint ? Number((unionArea([chartPaint]) / Math.max(1, chartHost.getBoundingClientRect().width * chartHost.getBoundingClientRect().height)).toFixed(3)) : "not-applicable";
                const metrics = { contentOccupancy: Number(contentOccupancy.toFixed(3)), internalOccupancy: "not-applicable", moduleInternalOccupancy: "not-applicable", lowerHalfCoverage: Number(lowerHalfCoverage.toFixed(3)), dominantVisualRatio: dominantVisualRatio === "not-applicable" ? dominantVisualRatio : Number(dominantVisualRatio.toFixed(3)), plotOccupancy, largestEmptyRegionRatio: Number(largestEmptyRegionRatio.toFixed(3)), evidenceWeightBalance: Number(evidenceWeightBalance.toFixed(3)), repeatedEqualRegionCount };
                add("info", "density-metrics", section.id, JSON.stringify(metrics));
                if (contentOccupancy < .25 && sectionRect.height >= window.innerHeight * .75) add(gateSeverity(), "report-sparse-composition", section.id, `large report section has only ${Math.round(contentOccupancy * 100)}% substantive content`);
                if (lowerHalfCoverage < .12 && sectionRect.height >= window.innerHeight * .75 && !densityException) add(gateSeverity(), "report-empty-lower-body", section.id, `large report section has an empty lower body`);
                else if (lowerHalfCoverage < .45 && densityException) add("info", "density-exception", section.id, "lower-half coverage is below 45% but the section declares an auditable layout rationale");
                const emptyTail = sectionRect.bottom - content.bottom;
                const occupiedHeight = Math.max(0, content.bottom - content.top) / Math.max(1, sectionRect.height);
                if (emptyTail > Math.max(240, sectionRect.height * .32)) add(gateSeverity("error"), "report-empty-section-tail", section.id, `${Math.round(emptyTail)}px empty tail after substantive content`);
                else if (emptyTail > Math.max(150, sectionRect.height * .22)) add("warning", "report-empty-section-tail", section.id, `${Math.round(emptyTail)}px empty tail`);
                if (sectionRect.height >= window.innerHeight * .88 && occupiedHeight < .62) add(stage === "complete" && enforceQuality ? "error" : "warning", "report-stacked-slide-density", section.id, `section uses ${Math.round(sectionRect.height)}px but content occupies only ${Math.round(occupiedHeight * 100)}% of its height`);
              }
            }
            section.querySelectorAll("[data-check-text]").forEach((element) => {
              // Section headings have their own title-mode/geometry gate below;
              // do not report the same wrap twice as an unconditional text error.
              if (element.matches("[data-report-section-heading]")) return;
              if (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1) add("error", "text-overflow", label(element), `Text overflows in ${section.id}`);
            });
            for (const visual of section.querySelectorAll("[data-evidence-visual]")) {
              if (!visible(visual)) continue;
              const readyDeadline = performance.now() + 3000;
              while (visual.getAttribute("data-visual-ready") !== "true" && performance.now() < readyDeadline) await new Promise((resolve) => requestAnimationFrame(resolve));
              const rect = visual.getBoundingClientRect();
              const visualId = visual.getAttribute("data-visual-id") || label(visual);
              if (visual.getAttribute("data-visual-ready") !== "true") add("error", "evidence-visual-not-ready", visualId, "Evidence visual is not ready");
              if (!visual.getAttribute("data-claim-ids")) add("error", "missing-visual-claim-links", visualId, "Evidence visual has no claim IDs");
              if (rect.width < 300 || rect.height < 180) add("error", "evidence-visual-too-small", visualId, `${Math.round(rect.width)}×${Math.round(rect.height)} px`);
              if (visual.getAttribute("data-evidence-type") === "A" && (!visual.getAttribute("data-default-state") || !visual.getAttribute("data-print-state"))) add("error", "chart-state-contract-missing", visualId, "Type A chart lacks default/print state");
              if (visual.getAttribute("data-evidence-type") === "A" && !visual.querySelector("[data-chart-host='true'], .evidence-chart-canvas, [data-html-chart], [data-css-chart]")) add(gateSeverity("error"), "type-a-chart-host-missing", visualId, "Type A evidence requires a recognizable chart host with data-chart-host=true and data-chart-form");
            }
            const evidenceWrappers = [...section.querySelectorAll("[data-evidence-visual], [data-evidence-wrapper], [data-chart-host='true'], .evidence-chart-canvas")].filter(visible);
            for (const wrapper of evidenceWrappers) {
              const wrapperRect = wrapper.getBoundingClientRect();
              const chartHosts = wrapper.matches("[data-chart-host='true'], .evidence-chart-canvas, [data-html-chart], [data-css-chart]") ? [wrapper] : [...wrapper.querySelectorAll("[data-chart-host='true'], .evidence-chart-canvas, [data-html-chart], [data-css-chart]")];
              const paintedCharts = chartHosts.map((host) => paintedChartBounds(host)).filter(Boolean);
              const innerNodes = [...wrapper.querySelectorAll("svg, canvas, table, figure, img, p, li, dt, dd, .evidence-strip, [data-evidence-content]")]
                .filter((node) => visible(node) && !(paintedCharts.length && node.matches("svg, canvas")));
              const innerRects = [...paintedCharts, ...innerNodes.map((node) => node.getBoundingClientRect())]
                .map((rect) => ({ left: Math.max(rect.left, wrapperRect.left), top: Math.max(rect.top, wrapperRect.top), right: Math.min(rect.right, wrapperRect.right), bottom: Math.min(rect.bottom, wrapperRect.bottom) }))
                .filter((rect) => rect.right > rect.left && rect.bottom > rect.top);
              const internalOccupancy = unionArea(innerRects) / Math.max(1, wrapperRect.width * wrapperRect.height);
              add("info", "evidence-wrapper-occupancy", label(wrapper), JSON.stringify({ internalOccupancy: Math.round(internalOccupancy * 1000) / 1000 }));
              if (internalOccupancy < .6) add(gateSeverity(), "evidence-wrapper-occupancy", label(wrapper), `evidence descendants occupy ${Math.round(internalOccupancy * 100)}% of wrapper; complete threshold is 60%`);
            }
            sectionRect = section.getBoundingClientRect();
            section.querySelectorAll("[data-chart-host='true'], .evidence-chart-canvas, [data-html-chart], [data-css-chart]").forEach((host) => {
              if (!visible(host)) return;
              const rect = host.getBoundingClientRect();
              const renderedSurface = host.querySelector("canvas, svg") ?? host;
              const renderedSurfaceRect = renderedSurface.getBoundingClientRect();
              if (renderedSurfaceRect.width < rect.width * .88 || renderedSurfaceRect.height < rect.height * .78) add("warning", "chart-surface-geometry", label(host), "Canvas/SVG underuses chart host");
              const painted = paintedChartBounds(host);
              if (!painted) add(gateSeverity("error"), "blank-chart", label(host), "chart host has no painted SVG, Canvas, or HTML/CSS evidence");
              else { const widthRatio = (painted.right - painted.left) / Math.max(1, rect.width); const heightRatio = (painted.bottom - painted.top) / Math.max(1, rect.height); if (widthRatio < .58 || heightRatio < .5) add(gateSeverity(heightRatio < .32 ? "error" : "warning"), "chart-plot-occupancy", label(host), `painted plot uses ${Math.round(widthRatio * 100)}% width × ${Math.round(heightRatio * 100)}% height of chart host`); }
              for (const auditLayer of host.querySelectorAll("[data-audit-surface],[data-background-layer],[data-placeholder-layer]")) {
                if (!visible(auditLayer) || !painted) continue;
                const layerRect = auditLayer.getBoundingClientRect(); const layerZ = Number.parseInt(getComputedStyle(auditLayer).zIndex || "0", 10) || 0;
                const chartZ = Number.parseInt(getComputedStyle(host).zIndex || "0", 10) || 0;
                if (layerZ > chartZ && layerRect.left < painted.right && layerRect.right > painted.left && layerRect.top < painted.bottom && layerRect.bottom > painted.top) add("error", "audit-surface-overlap", label(auditLayer), "audit/background layer is painted above real chart evidence");
              }
              host.querySelectorAll("svg text").forEach((text) => { const size = Number.parseFloat(getComputedStyle(text).fontSize); if (size > 0 && size < 14) add("warning", "chart-label-too-small", text.textContent?.trim() || label(text), `${size}px`); });
            });
            section.querySelectorAll("[data-chart-overlay], [data-chart-tooltip], .echarts-tooltip").forEach((overlay) => {
              if (!visible(overlay)) return;
              const rect = overlay.getBoundingClientRect();
              if (rect.left < 2 || rect.right > window.innerWidth - 2) add("error", "report-overlay-outside-viewport", label(overlay), `Overlay escapes horizontal viewport in ${section.id}`);
              if (rect.left < sectionRect.left - 2 || rect.right > sectionRect.right + 2 || rect.top < sectionRect.top - 2 || rect.bottom > sectionRect.bottom + 2) add("error", "report-overlay-outside-section", label(overlay), `Overlay escapes section in ${section.id}`);
            });
            const heading = section.querySelector("[data-report-section-heading]");
            const navigation = document.querySelector("[data-report-navigation]");
            if (heading && !["hero", "closing"].includes(role ?? "")) {
              const style = getComputedStyle(heading);
              const lineHeight = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.2;
              const lineCount = Math.max(1, Math.round(heading.scrollHeight / Math.max(1, lineHeight)));
              const mode = heading.getAttribute("data-title-mode");
              const severity = stage === "complete" && enforceQuality ? "error" : "warning";
              if (enforceQuality && !heading.hasAttribute("data-title-audit")) add(severity, "title-audit-metadata", section.id, "Substantive report heading is missing data-title-audit");
              if (lineCount > 2) add(severity, "title-more-than-two-lines", section.id, "Report heading exceeds two lines");
              if (mode === "single-line" && lineCount > 1) add(severity, "title-unexpected-wrap", section.id, "single-line report heading wrapped");
              if (!mode && enforceQuality) add(severity, "title-mode-missing", section.id, "Report heading must declare data-title-mode");
              if (heading.scrollWidth > heading.clientWidth + 1 || heading.scrollHeight > heading.clientHeight + 1) add(severity, "title-clipped", section.id, "Report heading is clipped or overflows");
              const headingRect = heading.getBoundingClientRect();
              const titleGate = (type, message) => add(severity, type, section.id, message);
              const header = section.querySelector(".report-section-header");
              if (header && headingRect.bottom > header.getBoundingClientRect().bottom + 2) titleGate("title-geometry-overlap", "Report heading crosses its header rule");
              const overlap = (a, b) => Boolean(a && b && Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2);
              [[section.querySelector("[data-brand-audit='true'], [data-logo-contains-institution-name]"), "logo"], [section.querySelector(".report-section-lead, [data-section-lead]"), "lead"], [section.querySelector("[data-substantive-region], [data-evidence-visual], .report-finding-band, .evidence-strip"), "body"]].forEach(([target, name]) => {
                if (target instanceof HTMLElement && overlap(headingRect, target.getBoundingClientRect())) titleGate("title-geometry-overlap", `Report heading intersects ${name}`);
              });
            }
            if (heading && visible(navigation)) {
              const hr = heading.getBoundingClientRect(); const nr = navigation.getBoundingClientRect();
              if (Math.min(hr.right, nr.right) - Math.max(hr.left, nr.left) > 2 && Math.min(hr.bottom, nr.bottom) - Math.max(hr.top, nr.top) > 2) add("error", "report-navigation-heading-overlap", section.id, "Sticky navigation overlaps section heading");
            }
          }

          if (brandingProfile === "none" && document.querySelector("[data-brand-audit], [data-brand-role], .report-hero-brand")) add("error", "brand-unexpected", "report", "Unbranded report contains brand nodes or an empty brand-only header");
          if (brandingProfile === "zuel") for (const section of document.querySelectorAll("[data-report-section]")) {
            const role = section.dataset.sectionRole === "hero" ? "report-hero" : section.dataset.sectionRole === "closing" ? "report-closing" : null;
            const logo = role ? section.querySelector(`img[data-brand-role='${role}']`) : null;
            if (role && (!logo || !logo.complete || !logo.naturalWidth)) add("error", "brand-missing", section.id, `Selected ZUEL treatment is missing a loaded ${role} logo`);
          }
          const ordinaryLogos = document.querySelectorAll("[data-report-section]:not([data-section-role='hero']):not([data-section-role='closing']) img[data-brand-audit='true']");
          if (ordinaryLogos.length) add("error", "report-repeated-section-brand", "report", `${ordinaryLogos.length} ordinary section logo(s); default lockup belongs in hero/closing only`);

          const ranges = { "report-hero": [230, 270, 54, 64], "report-header": [200, 240, 47, 57], "report-closing": [220, 260, 52, 62] };
          const positionFraction = (token, fallback) => token === "left" || token === "top" ? 0 : token === "right" || token === "bottom" ? 1 : token === "center" ? .5 : token?.endsWith("%") ? Number.parseFloat(token) / 100 : fallback;
          for (const image of document.querySelectorAll("img[data-brand-audit='true']")) {
            if (!(image instanceof HTMLImageElement) || !image.complete || !image.naturalWidth || !image.naturalHeight) continue;
            const role = image.dataset.brandRole; const rect = image.getBoundingClientRect(); if (!rect.width || !rect.height) continue; const style = getComputedStyle(image); const canvas = document.createElement("canvas");
            canvas.width = image.naturalWidth; canvas.height = image.naturalHeight; const context = canvas.getContext("2d", { willReadFrequently: true });
            let bounds = { left: 0, top: 0, right: image.naturalWidth, bottom: image.naturalHeight };
            if (context) { context.drawImage(image, 0, 0); const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data; let left = canvas.width, top = canvas.height, right = -1, bottom = -1; for (let y = 0; y < canvas.height; y += 1) for (let x = 0; x < canvas.width; x += 1) if (pixels[(y * canvas.width + x) * 4 + 3] > 8) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); } if (right >= left && bottom >= top) bounds = { left, top, right: right + 1, bottom: bottom + 1 }; }
            const fit = style.objectFit || "fill"; const containScale = Math.min(rect.width / image.naturalWidth, rect.height / image.naturalHeight); const coverScale = Math.max(rect.width / image.naturalWidth, rect.height / image.naturalHeight); const scaleX = fit === "fill" ? rect.width / image.naturalWidth : fit === "cover" ? coverScale : fit === "none" ? 1 : containScale; const scaleY = fit === "fill" ? rect.height / image.naturalHeight : scaleX; const fittedWidth = image.naturalWidth * scaleX; const fittedHeight = image.naturalHeight * scaleY; const tokens = style.objectPosition.split(/\s+/); const px = positionFraction(tokens[0], .5); const py = positionFraction(tokens[1], .5); const painted = { left: rect.left + (rect.width - fittedWidth) * px + bounds.left * scaleX, top: rect.top + (rect.height - fittedHeight) * py + bounds.top * scaleY, width: (bounds.right - bounds.left) * scaleX, height: (bounds.bottom - bounds.top) * scaleY }; const range = ranges[role];
            const brandContainer = image.closest(".report-hero-brand, .report-closing, [data-logo-contains-institution-name]"); const containsInstitutionName = image.dataset.logoContainsInstitutionName === "true" || brandContainer?.getAttribute("data-logo-contains-institution-name") === "true"; const institutionTextVisible = Boolean(brandContainer?.querySelector("[data-institution-text='true']")); const duplicateInstitutionText = containsInstitutionName && institutionTextVisible;
            const detail = { role, source: [image.naturalWidth, image.naturalHeight], alphaBounds: bounds, cssBox: [Math.round(rect.width), Math.round(rect.height)], painted: [Math.round(painted.width * 10) / 10, Math.round(painted.height * 10) / 10], objectFit: fit, logoContainsInstitutionName: containsInstitutionName, institutionTextVisible, duplicateInstitutionText };
            add("info", "brand-geometry", label(image), JSON.stringify(detail));
            if (duplicateInstitutionText) add("error", "brand-institution-duplication", label(image), "Complete lockup is accompanied by duplicate institution text");
            if (fit === "cover") add("error", "brand-logo-crop", label(image), "Brand mark must not use object-fit: cover");
            if (fit === "fill") add("error", "brand-logo-fit", label(image), "Brand mark must use object-fit: contain or an explicitly verified ratio-preserving mode");
            if (Math.abs((painted.width / painted.height) / ((bounds.right - bounds.left) / (bounds.bottom - bounds.top)) - 1) > distortionTolerance) add("error", "brand-logo-distortion", label(image), "Painted logo aspect ratio is distorted");
            if (range && window.innerWidth > 1180 && (painted.width < range[0] || painted.width > range[1] || painted.height < range[2] || painted.height > range[3])) add("error", "brand-painted-size", label(image), `${role} ${painted.width.toFixed(1)}×${painted.height.toFixed(1)} px; expected ${range[0]}–${range[1]} × ${range[2]}–${range[3]}`);
          }
          return result;
        }, { distortionTolerance: 0.04, stage: manifestStage, enforceQuality, brandingProfile: manifestDocument.branding?.profile });
        reportViews.push({ viewport, findings });
      }
      return { target, mode: "scroll-report", sectionCount: await page.locator("[data-report-section]").count(), views: reportViews };
    }

    await page.goto(`${baseUrl}#/1`, { waitUntil: "networkidle" });
    await page.waitForSelector(".slide", { timeout: 15000 });
    const slideCount = await page.locator(".slide").count();
    const slides = [];

    for (let index = 1; index <= slideCount; index += 1) {
      await page.goto(`${baseUrl}#/${index}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(180);
      await page.waitForFunction((expected) => [...document.querySelectorAll(".slide")][expected - 1]?.classList.contains("is-active"), index, { timeout: 10000 });
      await page.waitForFunction(() => {
        const active = document.querySelector(".slide.is-active") ?? [...document.querySelectorAll(".slide")].find((node) => node.getAttribute("aria-hidden") !== "true");
        if (!active) return false;
        return [...active.querySelectorAll("[data-evidence-visual]")].every((visual) => visual.getAttribute("data-visual-ready") === "true");
      }, undefined, { timeout: 25000 });
      const findings = await page.evaluate(async ({ minEvidenceWidth, minEvidenceHeight, distortionTolerance, stage, enforceQuality, designSystemVersion, brandingProfile }) => {
        const active = document.querySelector(".slide.is-active") ?? [...document.querySelectorAll(".slide")].find((node) => node.getAttribute("aria-hidden") !== "true");
        if (!(active instanceof HTMLElement)) return [{ severity: "error", type: "missing-active-slide", message: "No active slide element" }];
        const result = [];
        const slideRect = active.getBoundingClientRect();
        const add = (severity, type, element, message) => result.push({ severity, type, element, message });
        const label = (element) => element.getAttribute("data-audit-label") || element.getAttribute("aria-label") || element.className || element.tagName;
        const visible = (element) => element instanceof Element && element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0 && getComputedStyle(element).visibility !== "hidden";
        const union = (rects) => rects.reduce((box, rect) => box ? ({ left: Math.min(box.left, rect.left), top: Math.min(box.top, rect.top), right: Math.max(box.right, rect.right), bottom: Math.max(box.bottom, rect.bottom) }) : ({ left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }), null);
        const clip = (rect, bounds) => ({ left: Math.max(rect.left, bounds.left), top: Math.max(rect.top, bounds.top), right: Math.min(rect.right, bounds.right), bottom: Math.min(rect.bottom, bounds.bottom) });
        const unionArea = (rects) => {
          const valid = rects.filter((rect) => rect && rect.right > rect.left && rect.bottom > rect.top);
          if (!valid.length) return 0;
          const xs = [...new Set(valid.flatMap((rect) => [rect.left, rect.right]))].sort((a, b) => a - b);
          let area = 0;
          for (let index = 0; index < xs.length - 1; index += 1) {
            const left = xs[index]; const right = xs[index + 1]; if (right <= left) continue;
            const spans = valid.filter((rect) => rect.left < right && rect.right > left).map((rect) => [rect.top, rect.bottom]).sort((a, b) => a[0] - b[0]);
            let covered = 0; let top = null; let bottom = null;
            for (const span of spans) { if (top === null || span[0] > bottom) { if (top !== null) covered += Math.max(0, bottom - top); top = span[0]; bottom = span[1]; } else bottom = Math.max(bottom, span[1]); }
            if (top !== null) covered += Math.max(0, bottom - top); area += (right - left) * covered;
          }
          return area;
        };
        const gateSeverity = (fallback = "warning") => stage === "complete" && enforceQuality ? "error" : fallback === "error" ? "warning" : fallback;
        const densitySeverity = (value, prototypeHardFloor) => stage === "complete" && enforceQuality ? "error" : enforceQuality && value < prototypeHardFloor ? "error" : "warning";
        const overlaps = (a, b) => Boolean(a && b && Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2);
        const pointDistanceToRect = (point, rect) => Math.hypot(Math.max(rect.left - point.x, 0, point.x - rect.right), Math.max(rect.top - point.y, 0, point.y - rect.bottom));
        const pathScreenPoint = (path, atEnd) => { const length = path.getTotalLength(); const point = path.getPointAtLength(atEnd ? length : 0); const matrix = path.getScreenCTM(); return matrix ? new DOMPoint(point.x, point.y).matrixTransform(matrix) : point; };
         const paintedHtmlBounds = (host) => { const rootIsChart = host.matches("table,[role='img'],[role='table'],[role='progressbar'],[data-html-chart],[data-css-chart],[data-chart-bar],[data-metric-card],[data-progress-bar]"); const painted = [...(rootIsChart ? [host] : []), ...host.querySelectorAll("*:not([data-editor-lock='true']):not([data-runtime-controls]):not([data-editor-panel])")].filter((node) => { const style = getComputedStyle(node); const rect = node.getBoundingClientRect(); if (node.closest("[data-editor-lock='true'],[data-runtime-controls],[data-runtime-control],[data-report-navigation],[data-editor-panel],[data-editor-control],[data-audit-surface],[data-background-layer],[data-placeholder-layer],[data-scaffold-placeholder]")) return false; if (rect.width <= 1 || rect.height <= 1 || style.display === "none" || style.visibility === "hidden" || Number(style.opacity || 1) <= 0) return false; const background = style.backgroundColor && !/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0\s*\)/i.test(style.backgroundColor) && style.backgroundColor !== "transparent"; const border = ["Top", "Right", "Bottom", "Left"].some((side) => parseFloat(style[`border${side}Width`]) > 0 && style[`border${side}Style`] !== "none"); const shadow = style.boxShadow && style.boxShadow !== "none"; const semantic = node.matches("table,thead,tbody,tr,td,th,[role='img'],[role='table'],[role='progressbar'],[data-chart-bar],[data-metric-card],[data-progress-bar]"); const copy = Boolean(node.textContent?.trim()) && parseFloat(style.fontSize) >= 10; return background || border || shadow || semantic || copy; }).map((node) => node.getBoundingClientRect()); return union(painted.filter((rect) => rect.width > 1 || rect.height > 1)); };
         const paintedChartBounds = (host) => { const svg = host.querySelector("svg"); const hostRect = host.getBoundingClientRect(); const svgRects = svg ? [...svg.querySelectorAll("path, rect, line, polyline, polygon, circle, text")].filter((node) => { const style = getComputedStyle(node); return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) > 0; }).map((node) => ({ node, rect: node.getBoundingClientRect() })).filter(({ node, rect }) => (rect.width > 1 || rect.height > 1) && !(node.matches("rect") && rect.width * rect.height >= hostRect.width * hostRect.height * .90 && !node.matches("[data-chart-mark],[data-chart-bar],[data-data-mark]"))).map(({ rect }) => rect) : []; if (svgRects.length) return union(svgRects); const canvas = host.querySelector("canvas"); if (canvas instanceof HTMLCanvasElement) { try { const context = canvas.getContext("2d", { willReadFrequently: true }); const pixels = context?.getImageData(0, 0, canvas.width, canvas.height).data; if (pixels) { let left = canvas.width, top = canvas.height, right = -1, bottom = -1; for (let y = 0; y < canvas.height; y += 2) for (let x = 0; x < canvas.width; x += 2) if (pixels[(y * canvas.width + x) * 4 + 3] > 8) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); } if (right >= left) { const rect = canvas.getBoundingClientRect(); return { left: rect.left + left / canvas.width * rect.width, top: rect.top + top / canvas.height * rect.height, right: rect.left + (right + 1) / canvas.width * rect.width, bottom: rect.top + (bottom + 1) / canvas.height * rect.height }; } } } catch {} } return paintedHtmlBounds(host); };
         const visibleText = (node) => Boolean(node.textContent?.trim()) && !node.matches(".section-kicker, .deck-footer, .source, .page-counter, [data-runtime-controls], [data-editor-panel], [data-editor-lock], [aria-hidden='true']");
        const substantiveNodes = (root) => [...root.querySelectorAll(".slide-lead, h3, h4, p, li, dt, dd, td, th, strong, b, figure, img, canvas, svg, .evidence-strip, .synthesis-row, [data-chart-host='true'], .evidence-chart-canvas, [data-html-chart], [data-css-chart]")]
          .filter((node) => visible(node) && !node.closest("[data-audit-surface='true'],[data-background-layer],[data-placeholder-layer],[data-scaffold-placeholder]") && !node.matches("[data-substantive-region], .section-kicker, .deck-footer, .source, .page-counter, [data-runtime-controls], [data-editor-panel], [data-editor-lock], [data-evidence-content]") && (node.matches("img,canvas,svg,figure,.evidence-strip,.synthesis-row") || visibleText(node)))
          .filter((node, index, list) => !list.some((parent, parentIndex) => parentIndex !== index && parent.contains(node) && !node.matches("img,canvas,svg")));
        const paintedBounds = (node) => {
           if (node.matches("canvas")) return paintedChartBounds(node.parentElement ?? node) ?? node.getBoundingClientRect();
          if (node.matches("[data-chart-host='true'], .evidence-chart-canvas, [data-html-chart], [data-css-chart]")) return paintedChartBounds(node) ?? node.getBoundingClientRect();
          if (node.matches("svg")) return union([...node.querySelectorAll("path, rect, line, polyline, polygon, circle, text")].map((child) => child.getBoundingClientRect()).filter((rect) => rect.width > 1 || rect.height > 1)) ?? node.getBoundingClientRect();
          if (node.matches("figure")) return union([...node.querySelectorAll("img, svg, canvas, figcaption")].map((child) => paintedBounds(child)).filter(Boolean)) ?? node.getBoundingClientRect();
          return node.getBoundingClientRect();
        };

        if (active.scrollWidth > active.clientWidth + 1 || active.scrollHeight > active.clientHeight + 1) add("error", "slide-overflow", label(active), `${active.scrollWidth}×${active.scrollHeight} exceeds ${active.clientWidth}×${active.clientHeight}`);

        if (enforceQuality && !["cover", "closing"].includes(active.dataset.slideType ?? "content")) {
          if (!active.dataset.visualCenter) add(gateSeverity(), "visual-plan-missing", label(active), "Substantive slide must declare data-visual-center from its material-adaptive VisualPlan");
          if (!active.dataset.visualKinds) add(gateSeverity(), "visual-kind-missing", label(active), "Substantive slide must classify its visual/evidence kinds");
          if (designSystemVersion >= 2 && !active.dataset.bodySilhouette) add(gateSeverity(), "body-silhouette-missing", label(active), "Design system V2 slide must declare a real body silhouette");
        }

        for (const flow of active.querySelectorAll("[data-flow-id]")) {
          const nodes = [...flow.querySelectorAll("[data-flow-node]")];
          const nodeIds = new Set(nodes.map((node) => node.getAttribute("data-flow-node")));
          const degree = new Map(nodes.map((node) => [node.getAttribute("data-flow-node"), 0]));
          for (const edge of flow.querySelectorAll("[data-flow-from][data-flow-to]")) {
            const from = edge.getAttribute("data-flow-from");
            const to = edge.getAttribute("data-flow-to");
            if (!nodeIds.has(from) || !nodeIds.has(to)) add(gateSeverity(), "flow-edge-reference", label(flow), `${from} → ${to} references a missing node`);
            else { degree.set(from, (degree.get(from) ?? 0) + 1); degree.set(to, (degree.get(to) ?? 0) + 1); }
            const path = edge.querySelector("path[data-flow-edge-path], path");
            if (!path || (typeof path.getTotalLength === "function" && path.getTotalLength() <= 0)) add(gateSeverity(), "flow-edge-empty", label(flow), `${from} → ${to} has no drawable connection`);
            else if (typeof path.getTotalLength === "function") {
              const fromNode = nodes.find((node) => node.getAttribute("data-flow-node") === from); const toNode = nodes.find((node) => node.getAttribute("data-flow-node") === to);
              if (fromNode && toNode) {
                const startDistance = pointDistanceToRect(pathScreenPoint(path, false), fromNode.getBoundingClientRect()); const endDistance = pointDistanceToRect(pathScreenPoint(path, true), toNode.getBoundingClientRect());
                if (startDistance > 14 || endDistance > 14) add(gateSeverity(), "flow-connector-fragmented", label(flow), `${from} → ${to} endpoint gap is ${Math.round(startDistance)} px / ${Math.round(endDistance)} px`);
              }
            }
            const edgeLabel = edge.querySelector("[data-flow-edge-label], text");
            if (edgeLabel && edgeLabel.textContent?.trim()) {
              const labelRect = edgeLabel.getBoundingClientRect();
              if (!edgeLabel.hasAttribute("data-flow-edge-label")) add(gateSeverity(), "flow-edge-label-hook", label(flow), `${from} → ${to} visible label must expose data-flow-edge-label`);
              if (path && typeof path.getTotalLength === "function") {
                const point = path.getPointAtLength(path.getTotalLength() / 2); const matrix = path.getScreenCTM(); const midpoint = matrix ? new DOMPoint(point.x, point.y).matrixTransform(matrix) : point;
                const distance = Math.hypot((labelRect.left + labelRect.right) / 2 - midpoint.x, (labelRect.top + labelRect.bottom) / 2 - midpoint.y);
                if (distance > 28) add(gateSeverity(), "flow-label-detached", label(flow), `${from} → ${to} label is ${Math.round(distance)} px from the connector midpoint`);
              }
              const adjacent = nodes.filter((node) => [from, to].includes(node.getAttribute("data-flow-node")));
              if (nodes.some((node) => overlaps(labelRect, node.getBoundingClientRect()))) add(gateSeverity(), "flow-edge-label-overlap", label(flow), `${from} → ${to} label overlaps a flow node`);
              const normalize = (value) => String(value ?? "").replace(/[\s·：:，,。.;；()（）\-—_]/g, "").toLowerCase();
              const normalizedLabel = normalize(edgeLabel.textContent);
              const adjacentCopy = adjacent.flatMap((node) => [...node.querySelectorAll("text, [data-flow-node-label]")].map((item) => normalize(item.textContent))).filter(Boolean);
              if (adjacentCopy.includes(normalizedLabel)) add(gateSeverity(), "flow-label-redundancy", label(flow), `${from} → ${to} repeats adjacent node copy`);
              if (adjacent.length === 2) {
                const [a, b] = adjacent.map((node) => node.getBoundingClientRect()).sort((left, right) => left.left - right.left);
                const horizontal = Math.abs((a.top + a.bottom) / 2 - (b.top + b.bottom) / 2) < Math.max(a.height, b.height);
                const gap = b.left - a.right; const required = labelRect.width + 42;
                if (horizontal && gap < required) add(gateSeverity(), "flow-edge-label-gap", label(flow), `${from} → ${to} has ${Math.round(gap)} px gap for a ${Math.round(labelRect.width)} px label; minimum is ${Math.round(required)} px`);
              }
            }
          }
          for (const [nodeId, count] of degree) if (!count) add(gateSeverity(), "flow-isolated-node", label(flow), `flow node '${nodeId}' is isolated`);
          for (let first = 0; first < nodes.length; first += 1) for (let second = first + 1; second < nodes.length; second += 1) {
            const a = nodes[first].getBoundingClientRect(); const b = nodes[second].getBoundingClientRect();
            if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2) add(gateSeverity(), "flow-node-overlap", label(flow), `${nodes[first].getAttribute("data-flow-node")} overlaps ${nodes[second].getAttribute("data-flow-node")}`);
          }
          if (active.dataset.bodySilhouette === "process-board") {
            const flowBody = [...active.querySelectorAll("[data-slide-body][data-safe]")].at(-1) ?? active.querySelector(".slide-body[data-safe], .scaffold-deck-body") ?? active;
            const bodyRect = flowBody.getBoundingClientRect();
            const processRegion = flow.closest("[data-silhouette-role~='process-flow']") ?? flow;
            const flowRect = processRegion.getBoundingClientRect();
            const nodeRects = nodes.map((node) => node.getBoundingClientRect()).filter((rect) => rect.width > 1 && rect.height > 1);
            const widthRatio = flowRect.width / Math.max(1, bodyRect.width);
            const heightRatio = flowRect.height / Math.max(1, bodyRect.height);
            const nodeOccupancy = unionArea(nodeRects) / Math.max(1, flowRect.width * flowRect.height);
            const nodeBounds = union(nodeRects); const nodeSpan = nodeBounds ? (nodeBounds.right - nodeBounds.left) / Math.max(1, flowRect.width) : 0;
            const leftMargin = nodeBounds ? nodeBounds.left - flowRect.left : flowRect.width; const rightMargin = nodeBounds ? flowRect.right - nodeBounds.right : flowRect.width;
            if (widthRatio < .80) add("error", "process-flow-too-narrow", label(flow), `process flow uses ${Math.round(widthRatio * 100)}% of body width; minimum is 80%`);
            if (heightRatio < .28) add("error", "process-flow-too-short", label(flow), `process flow uses ${Math.round(heightRatio * 100)}% of body height; minimum is 28%`);
            if (nodeOccupancy < .30) add("error", "process-node-occupancy", label(flow), `flow nodes occupy ${Math.round(nodeOccupancy * 100)}% of the flow host; minimum is 30%`);
            if (nodeSpan < .82) add("error", "flow-horizontal-span", label(flow), `flow nodes span ${Math.round(nodeSpan * 100)}% of the process host; minimum is 82%`);
            if (Math.abs(leftMargin - rightMargin) > Math.max(24, flowRect.width * .05)) add("error", "flow-unbalanced-margins", label(flow), `outer margins differ by ${Math.round(Math.abs(leftMargin - rightMargin))} px`);
            const labelSizes = [...flow.querySelectorAll(".flow-label, .flow-detail, [data-flow-node] text")].map((node) => Number.parseFloat(getComputedStyle(node).fontSize)).filter(Number.isFinite);
            if (labelSizes.length && Math.min(...labelSizes) < 18) add("error", "process-label-too-small", label(flow), `${Math.min(...labelSizes)}px process label; minimum is 18px`);
            const supportRects = [...flowBody.querySelectorAll("[data-audit-box], [data-silhouette-role]:not([data-silhouette-role~='process-flow'])")].filter((node) => visible(node) && !node.contains(processRegion)).map((node) => node.getBoundingClientRect()).filter((rect) => rect.top >= flowRect.bottom - 1);
            if (supportRects.length) {
              const supportGap = Math.min(...supportRects.map((rect) => rect.top)) - flowRect.bottom;
              if (supportGap > 36) add("error", "process-support-gap", label(flow), `${Math.round(supportGap)}px gap between process flow and supporting evidence; maximum is 36px`);
            }
          }
        }

        if (!["cover", "closing"].includes(active.dataset.slideType ?? "content")) {
          const densityException = active.dataset.densityException === "true";
          const body = [...active.querySelectorAll("[data-slide-body][data-safe]")].at(-1) ?? active.querySelector(".slide-body[data-safe], .scaffold-deck-body") ?? active;
          const bodyRect = body.getBoundingClientRect();
          if (designSystemVersion >= 2) {
            const declared = active.dataset.bodySilhouette;
            const requirements = {
              "dominant-figure-aside": { all: ["dominant", "aside"] },
              "figure-support-matrix": { all: ["dominant", "support"] },
              "comparison-bridge": { all: ["comparison-left", "comparison-right", "bridge"] },
              "process-board": { all: ["process-flow"] },
              "evidence-table-board": { all: ["evidence-table", "interpretation"] },
              "chart-interpretation-strip": { all: ["chart", "interpretation-strip"] },
              "hierarchy-map": { all: ["hierarchy-root", "hierarchy-node", "hierarchy-edge"], minimum: { "hierarchy-node": 3 } },
              "synthesis-matrix": { all: ["synthesis-axis", "synthesis-cell"], minimum: { "synthesis-cell": 4 } },
              "multi-panel-evidence": { all: ["evidence-panel"], minimum: { "evidence-panel": 3 } },
              "text-structure-board": { all: ["structure-section"], minimum: { "structure-section": 2 } },
            };
            const requirement = requirements[declared];
            if (requirement) {
              const counts = {};
              for (const node of body.querySelectorAll("[data-silhouette-role]")) {
                if (!visible(node)) continue;
                for (const role of (node.getAttribute("data-silhouette-role") ?? "").split(/\s+/).filter(Boolean)) counts[role] = (counts[role] ?? 0) + 1;
              }
              for (const role of requirement.all) if (!counts[role]) add(gateSeverity(), "silhouette-structure-mismatch", label(body), `${declared} requires visible data-silhouette-role='${role}' evidence`);
              for (const [role, minimum] of Object.entries(requirement.minimum ?? {})) if ((counts[role] ?? 0) < minimum) add(gateSeverity(), "silhouette-structure-mismatch", label(body), `${declared} requires at least ${minimum} visible '${role}' regions; found ${counts[role] ?? 0}`);
            }
          }
          const candidates = substantiveNodes(body);
          const clipped = candidates.map((node) => clip(paintedBounds(node), bodyRect)).filter((rect) => rect.right > rect.left && rect.bottom > rect.top);
          const bodyArea = Math.max(1, bodyRect.width * bodyRect.height);
          const paintDensity = unionArea(clipped) / bodyArea;
          const semanticRegionNodes = [...body.querySelectorAll("[data-audit-box], [data-silhouette-role], [data-flow-id], [data-chart-host='true'], figure, .evidence-strip, .synthesis-row, [data-substantive-region]")]
            .filter(visible)
            .filter((node) => !node.matches("[data-background-layer], [data-audit-surface]") && !node.closest("[data-background-layer], [data-audit-surface]"))
            .filter((node) => {
              const rect = node.getBoundingClientRect();
              if (rect.width <= 1 || rect.height <= 1) return false;
              if (rect.width * rect.height >= bodyArea * .95 && !node.matches("[data-flow-id], [data-chart-host='true']")) return false;
              return node.matches("[data-flow-id], [data-chart-host='true'], figure") || substantiveNodes(node).length > 0 || (node.matches("[data-substantive-region]") && visibleText(node));
            });
          const layoutRects = semanticRegionNodes.map((node) => clip(node.getBoundingClientRect(), bodyRect)).filter((rect) => rect.right > rect.left && rect.bottom > rect.top);
          const occupancyRects = layoutRects.length ? layoutRects : clipped;
          const contentArea = unionArea(occupancyRects);
          const contentOccupancy = contentArea / bodyArea;
          const paintToLayoutRatio = paintDensity / Math.max(.001, contentOccupancy);
          const topLevelLayoutNodes = semanticRegionNodes.filter((node) => !semanticRegionNodes.some((parent) => parent !== node && parent.contains(node)));
          const signatureRects = (topLevelLayoutNodes.length ? topLevelLayoutNodes.map((node) => clip(node.getBoundingClientRect(), bodyRect)) : occupancyRects)
            .filter((rect) => rect.right > rect.left && rect.bottom > rect.top)
            .map((rect) => ({ x: (rect.left - bodyRect.left) / bodyRect.width, y: (rect.top - bodyRect.top) / bodyRect.height, w: (rect.right - rect.left) / bodyRect.width, h: (rect.bottom - rect.top) / bodyRect.height }))
            .sort((a, b) => a.y - b.y || a.x - b.x);
          const quantize = (value) => Math.round(value * 20) / 20;
          const layoutSignature = signatureRects.map((rect) => [rect.x, rect.y, rect.w, rect.h].map(quantize).join(",")).join("|") || "empty";
          const primaryRegions = signatureRects.filter((rect) => rect.y < .25 && rect.h > .45).sort((a, b) => a.x - b.x);
          let layoutFamilySignature = `geometry:${layoutSignature}`;
          if (primaryRegions.length === 2) {
            const [left, right] = primaryRegions;
            if (left.w >= .52 && right.w <= .40) layoutFamilySignature = "left-dominant-right-aside";
            else if (left.w <= .40 && right.w >= .52) layoutFamilySignature = "left-aside-right-dominant";
            else layoutFamilySignature = "balanced-two-column";
          } else if (primaryRegions.length === 3) layoutFamilySignature = "three-column-body";
          const lowerBody = { left: bodyRect.left, top: bodyRect.top + bodyRect.height * .5, right: bodyRect.right, bottom: bodyRect.bottom };
          const lowerHalfCoverage = unionArea(occupancyRects.map((rect) => clip(rect, lowerBody)).filter((rect) => rect.right > rect.left && rect.bottom > rect.top)) / Math.max(1, (lowerBody.right - lowerBody.left) * (lowerBody.bottom - lowerBody.top));
          const evidenceWrappers = [...active.querySelectorAll("[data-evidence-visual], [data-evidence-wrapper], [data-chart-host='true'], .evidence-chart-canvas")].filter(visible);
          const internalValues = [];
          let plotOccupancy = "not-applicable";
          const evidenceRects = [];
          for (const wrapper of evidenceWrappers) {
            const wrapperRect = wrapper.getBoundingClientRect();
            const wrapperNodes = [wrapper.matches("[data-chart-host='true'],[data-html-chart],[data-css-chart]") ? wrapper : null, ...substantiveNodes(wrapper)].filter(Boolean).filter((node, index, list) => list.indexOf(node) === index && node !== wrapper || node === wrapper);
            const innerRects = wrapperNodes.map((node) => clip(paintedBounds(node), wrapperRect)).filter((rect) => rect.right > rect.left && rect.bottom > rect.top);
            const ratio = unionArea(innerRects) / Math.max(1, wrapperRect.width * wrapperRect.height);
            const chartHost = wrapper.matches("[data-chart-host='true'], .evidence-chart-canvas, [data-html-chart], [data-css-chart]") ? wrapper : wrapper.querySelector("[data-chart-host='true'], .evidence-chart-canvas, [data-html-chart], [data-css-chart]");
            const flowHost = wrapper.matches("[data-flow-id]") ? wrapper : wrapper.querySelector("[data-flow-id]");
            if (!chartHost && !flowHost) internalValues.push(ratio);
            evidenceRects.push(...innerRects);
            if (chartHost) { const painted = paintedChartBounds(chartHost); if (!painted) add(gateSeverity("error"), "blank-chart", label(chartHost), "chart host has no painted SVG, Canvas, or HTML/CSS evidence"); else plotOccupancy = Math.min(1, unionArea([clip(painted, chartHost.getBoundingClientRect())]) / Math.max(1, chartHost.getBoundingClientRect().width * chartHost.getBoundingClientRect().height)); for (const surface of chartHost.querySelectorAll("[data-audit-surface],[data-background-layer],[data-placeholder-layer]")) { if (!visible(surface) || !painted) continue; const surfaceRect = surface.getBoundingClientRect(); const surfaceZ = Number.parseInt(getComputedStyle(surface).zIndex || "0", 10) || 0; const chartZ = Number.parseInt(getComputedStyle(chartHost).zIndex || "0", 10) || 0; if (surfaceZ > chartZ && surfaceRect.left < painted.right && surfaceRect.right > painted.left && surfaceRect.top < painted.bottom && surfaceRect.bottom > painted.top) add("error", "audit-surface-overlap", label(surface), "audit/background layer is painted above real chart evidence"); } }
            if (!chartHost && !flowHost && ratio < .6) add(gateSeverity(), "evidence-wrapper-occupancy", label(wrapper), `evidence descendants occupy ${Math.round(ratio * 100)}% of wrapper; complete threshold is 60%`);
          }
          const moduleSelector = "[data-audit-box], [data-structure-panel], [data-silhouette-role]";
          const moduleCandidates = [...body.querySelectorAll(moduleSelector)].filter(visible).filter((module) => {
            const rect = clip(module.getBoundingClientRect(), bodyRect);
            return rect.right > rect.left && rect.bottom > rect.top && (rect.right - rect.left) * (rect.bottom - rect.top) >= bodyArea * .035;
          });
          const leafModules = moduleCandidates.filter((module) => !moduleCandidates.some((child) => child !== module && module.contains(child)));
          const moduleValues = leafModules.filter((module) => !module.matches("[data-silhouette-role~='process-flow']") && !module.querySelector("[data-flow-id], [data-chart-host='true']")).map((module) => {
            const rect = module.getBoundingClientRect();
            const innerRects = substantiveNodes(module).map((node) => clip(paintedBounds(node), rect)).filter((item) => item.right > item.left && item.bottom > item.top);
            const textRects = [];
            const walker = document.createTreeWalker(module, NodeFilter.SHOW_TEXT);
            while (walker.nextNode()) {
              const textNode = walker.currentNode;
              if (!textNode.textContent?.trim() || !visible(textNode.parentElement) || textNode.parentElement.closest("[data-background-layer],[data-audit-surface],[data-runtime-controls],[data-editor-panel]")) continue;
              const range = document.createRange(); range.selectNodeContents(textNode);
              textRects.push(...[...range.getClientRects()].map((item) => clip(item, rect)).filter((item) => item.right > item.left && item.bottom > item.top));
            }
            const contentSpan = union([...innerRects, ...textRects]);
            return contentSpan ? (contentSpan.right - contentSpan.left) * (contentSpan.bottom - contentSpan.top) / Math.max(1, rect.width * rect.height) : 0;
          }).filter(Number.isFinite);
          const equalSizes = leafModules.map((module) => { const rect = module.getBoundingClientRect(); return `${Math.round(rect.width / 8)}x${Math.round(rect.height / 8)}`; });
          const sizeCounts = new Map(); equalSizes.forEach((key) => sizeCounts.set(key, (sizeCounts.get(key) ?? 0) + 1));
          const repeatedEqualRegionCount = Math.max(0, ...sizeCounts.values()) >= 3 ? Math.max(...sizeCounts.values()) : 0;
          const visualRects = candidates.filter((node) => node.matches("img,canvas,svg,figure,.evidence-strip,.synthesis-row")).map((node) => clip(paintedBounds(node), bodyRect)).filter((rect) => rect.right > rect.left && rect.bottom > rect.top);
          // Chart internals are deliberately editor-locked and may be absent
          // from ordinary semantic candidates. Measure their real plotted ink
          // explicitly; a registered Type A plot must never become N/A merely
          // because its SVG is protected from text editing.
          for (const host of body.querySelectorAll("[data-chart-host='true'], .evidence-chart-canvas, [data-html-chart], [data-css-chart]")) {
            if (!visible(host)) continue;
            const painted = paintedChartBounds(host);
            if (painted) {
              const rect = clip(painted, bodyRect);
              if (rect.right > rect.left && rect.bottom > rect.top) visualRects.push(rect);
            }
          }
          const dominantVisualRatio = visualRects.length ? Math.max(...visualRects.map((rect) => Math.max(0, rect.right - rect.left) * Math.max(0, rect.bottom - rect.top))) / Math.max(1, bodyArea) : "not-applicable";
          const content = union(occupancyRects);
          const largestEmptyRegionRatio = content ? Math.max(0, (bodyRect.bottom - content.bottom) / Math.max(1, bodyRect.height), (content.top - bodyRect.top) / Math.max(1, bodyRect.height)) : 1;
          const evidenceAreas = evidenceRects.map((rect) => rect.width * rect.height).filter((area) => Number.isFinite(area) && area > 0);
          const evidenceWeightBalance = evidenceAreas.length > 1 ? Math.max(...evidenceAreas) / Math.max(1, Math.min(...evidenceAreas)) : 1;
          const metrics = { contentOccupancy: Number(contentOccupancy.toFixed(3)), paintDensity: Number(paintDensity.toFixed(3)), paintToLayoutRatio: Number(paintToLayoutRatio.toFixed(3)), bodyBounds: [bodyRect.left, bodyRect.top, bodyRect.width, bodyRect.height].map(Math.round), internalOccupancy: internalValues.length ? Number((Math.min(...internalValues)).toFixed(3)) : "not-applicable", moduleInternalOccupancy: moduleValues.length ? Number((Math.min(...moduleValues)).toFixed(3)) : "not-applicable", measurableModuleCount: moduleValues.length, lowerHalfCoverage: Number(lowerHalfCoverage.toFixed(3)), dominantVisualRatio: dominantVisualRatio === "not-applicable" ? dominantVisualRatio : Number(dominantVisualRatio.toFixed(3)), plotOccupancy, largestEmptyRegionRatio: Number(largestEmptyRegionRatio.toFixed(3)), evidenceWeightBalance: Number(evidenceWeightBalance.toFixed(3)), repeatedEqualRegionCount, layoutSignature, layoutClusterSize: 1, layoutFamilySignature, layoutFamilyClusterSize: 1 };
          for (const [metric, value] of Object.entries(metrics)) if (typeof value === "number" && !Number.isFinite(value)) add("error", "metric-integrity", label(body), `${metric} is null, NaN, or Infinity`);
          add("info", "density-metrics", label(body), JSON.stringify(metrics));
          if (contentOccupancy < .7) add(densitySeverity(contentOccupancy, .45), "content-occupancy", label(body), `semantic layout coverage is ${Math.round(contentOccupancy * 100)}%; complete threshold is 70%`);
          if (paintDensity < .38 && !densityException) add(densitySeverity(paintDensity, .24), "paint-density", label(body), `visible painted content uses ${Math.round(paintDensity * 100)}% of the safe body; complete minimum is 38%`);
          else if (paintDensity < .45 && !densityException) add("warning", "paint-density", label(body), `visible painted content uses ${Math.round(paintDensity * 100)}% of the safe body; review for hollow cards or oversized containers`);
          if (paintToLayoutRatio < .45 && !densityException) add(densitySeverity(paintToLayoutRatio, .30), "paint-to-layout-ratio", label(body), `only ${Math.round(paintToLayoutRatio * 100)}% of declared semantic layout is visibly painted; backgrounds and large cards cannot certify density`);
          if (metrics.internalOccupancy !== "not-applicable" && metrics.internalOccupancy < .6) add(densitySeverity(metrics.internalOccupancy, .25), "internal-occupancy", label(body), `evidence wrapper occupancy is ${Math.round(metrics.internalOccupancy * 100)}%; complete threshold is 60%`);
          if (!leafModules.length && enforceQuality && designSystemVersion >= 2) add(gateSeverity(), "module-measurement-missing", label(body), "substantive V2 body has no measurable visible semantic modules");
          if (metrics.moduleInternalOccupancy !== "not-applicable" && metrics.moduleInternalOccupancy < .3) add(densitySeverity(metrics.moduleInternalOccupancy, .15), "module-internal-occupancy", label(body), `text-led module content span is ${Math.round(metrics.moduleInternalOccupancy * 100)}%; complete threshold is 30%`);
          if (lowerHalfCoverage < .45 && !densityException) add(densitySeverity(lowerHalfCoverage, .20), "lower-half-coverage", label(body), `lower-half semantic coverage is ${Math.round(lowerHalfCoverage * 100)}%; complete threshold is 45%`);
          else if (lowerHalfCoverage < .45 && densityException) add("info", "density-exception", label(body), "lower-half coverage is below 45% but the slide declares an auditable layout rationale");
          if (content) {
            const lowerBoundary = slideRect.top + slideRect.height * .76;
            if (content.bottom < lowerBoundary && !densityException) add(content.bottom < slideRect.top + slideRect.height * .64 ? "error" : gateSeverity(), "slide-empty-lower-region", label(active), `substantive content ends at ${Math.round((content.bottom - slideRect.top) / slideRect.height * 100)}% of slide height`);
            else if (content.bottom < lowerBoundary && densityException) add("info", "density-exception", label(active), "lower region is intentionally reserved under an auditable layout rationale");
            const contentWidth = content.right - content.left; const center = slideRect.left + slideRect.width / 2; const leftArea = clipped.filter((rect) => rect.right <= center + 20).reduce((sum, rect) => sum + rect.width * rect.height, 0); const rightArea = clipped.filter((rect) => rect.left >= center - 20).reduce((sum, rect) => sum + rect.width * rect.height, 0); if (contentWidth > slideRect.width * .65 && Math.min(leftArea, rightArea) > 0 && Math.max(leftArea, rightArea) / Math.min(leftArea, rightArea) > 4.5) add(gateSeverity(), "slide-column-weight-imbalance", label(active), `visible evidence area ratio exceeds 4.5:1`);
          }
          if (repeatedEqualRegionCount >= 3 && !active.querySelector("[data-comparison-rationale]")) add(gateSeverity(), "repeated-equal-regions", label(active), `${repeatedEqualRegionCount} peer regions share the same geometry without a comparison rationale`);
          if (repeatedEqualRegionCount >= 3 && active.querySelector("[data-comparison-rationale]") && typeof metrics.moduleInternalOccupancy === "number" && metrics.moduleInternalOccupancy < .50) add(gateSeverity(), "justified-equal-regions-underfilled", label(active), `${repeatedEqualRegionCount} equal regions have a rationale but the least-filled module uses only ${Math.round(metrics.moduleInternalOccupancy * 100)}% of its box; rationale cannot excuse a hollow card wall`);
          if (active.querySelector("[data-evidence-type='A']") && typeof dominantVisualRatio === "number" && dominantVisualRatio < .40) add(gateSeverity(), "decisive-visual-too-small", label(active), `the largest Type A visual uses ${Math.round(dominantVisualRatio * 100)}% of the safe body; complete minimum is 40%`);
        }

        active.querySelectorAll("[data-safe]").forEach((element) => {
          const rect = element.getBoundingClientRect();
          const safe = { left: slideRect.left + 72, right: slideRect.right - 72, top: slideRect.top + 42, bottom: slideRect.bottom - 36 };
          if (rect.left < safe.left - 1 || rect.right > safe.right + 1 || rect.top < safe.top - 1 || rect.bottom > safe.bottom + 1) add("error", "safe-area", label(element), "Element crosses the 1600×900 safe area");
        });

        active.querySelectorAll("[data-check-text]").forEach((element) => {
          if (element.classList.contains("slide-title")) return;
          if (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1) add("error", "text-overflow", label(element), "Text is clipped or overflows its box");
        });

        const boxes = [...active.querySelectorAll("[data-audit-box]")].filter((element) => element instanceof HTMLElement && element.offsetParent !== null);
        for (let first = 0; first < boxes.length; first += 1) {
          for (let second = first + 1; second < boxes.length; second += 1) {
            const a = boxes[first];
            const b = boxes[second];
            if (a.contains(b) || b.contains(a)) continue;
            const ar = a.getBoundingClientRect();
            const br = b.getBoundingClientRect();
            const overlapWidth = Math.min(ar.right, br.right) - Math.max(ar.left, br.left);
            const overlapHeight = Math.min(ar.bottom, br.bottom) - Math.max(ar.top, br.top);
            if (overlapWidth > 2 && overlapHeight > 2) add("error", "peer-overlap", `${label(a)} ↔ ${label(b)}`, `${Math.round(overlapWidth)}×${Math.round(overlapHeight)} px overlap`);
          }
        }

        active.querySelectorAll("img[data-scientific]").forEach((image) => {
          if (!(image instanceof HTMLImageElement)) return;
          const rect = image.getBoundingClientRect();
          const style = getComputedStyle(image);
          const cropSafe = image.dataset.cropSafe === "true";
          if (style.objectFit === "cover" && !cropSafe) add("error", "unsafe-scientific-crop", label(image), "Scientific figure uses object-fit: cover without data-crop-safe=true");
          if (rect.width < minEvidenceWidth || rect.height < minEvidenceHeight) add("error", "scientific-figure-too-small", label(image), `${Math.round(rect.width)}×${Math.round(rect.height)} px`);
          if (image.naturalWidth && image.naturalHeight && style.objectFit === "fill") {
            const naturalRatio = image.naturalWidth / image.naturalHeight;
            const renderedRatio = rect.width / rect.height;
            if (Math.abs(renderedRatio / naturalRatio - 1) > distortionTolerance) add("error", "image-distortion", label(image), "Rendered aspect ratio differs from the source");
          }
        });

        active.querySelectorAll("[data-evidence-visual]").forEach((visual) => {
          if (!(visual instanceof HTMLElement) || visual.offsetParent === null) return;
          const rect = visual.getBoundingClientRect();
          const visualId = visual.dataset.visualId || label(visual);
          if (!visual.dataset.visualId) add("error", "missing-visual-id", label(visual), "Evidence visual has no data-visual-id");
          if (!visual.dataset.claimIds) add("error", "missing-visual-claim-links", visualId, "Evidence visual has no linked claim IDs");
          if (visual.dataset.visualReady !== "true") add("error", "evidence-visual-not-ready", visualId, "Evidence visual is not ready");
          if (rect.width < minEvidenceWidth || rect.height < minEvidenceHeight) add("error", "evidence-visual-too-small", visualId, `${Math.round(rect.width)}×${Math.round(rect.height)} px`);
          if (visual.dataset.evidenceType === "A" && (!visual.dataset.defaultState || !visual.dataset.printState)) add("error", "chart-state-contract-missing", visualId, "Type A chart lacks defaultState or printState");
          if (visual.dataset.evidenceType === "A") {
            const chartHost = visual.querySelector("[data-chart-host='true'], .evidence-chart-canvas, [data-html-chart], [data-css-chart]");
            if (!chartHost) add(gateSeverity("error"), "type-a-chart-host-missing", visualId, "Type A evidence requires a recognizable chart host");
            else if (!chartHost.getAttribute("data-chart-form")) add(gateSeverity("error"), "chart-form-missing", visualId, "Type A chart host must declare data-chart-form");
          }
          if (visual.dataset.evidenceType === "A" && visual.querySelector("[data-runtime-hook]") && (!visual.dataset.resetState || !visual.dataset.reducedMotionState)) add("error", "chart-interaction-state-contract-missing", visualId, "Interactive Type A chart lacks resetState or reducedMotionState");
          if (visual.dataset.evidenceType === "C" && visual.dataset.pixelImmutable !== "true") add("error", "type-c-source-not-locked", visualId, "Type C source is not marked pixel-immutable");
          const parseTokens = (value) => new Set(String(value ?? "").split(/[\s,]+/).map((token) => token.trim()).filter(Boolean));
          const defaultMetrics = parseTokens(visual.dataset.defaultVisibleMetrics);
          const titleBasisMetrics = parseTokens(visual.dataset.titleBasisMetrics);
          const mustShowMetrics = parseTokens(visual.dataset.mustShowMetrics);
          const printMetrics = parseTokens(visual.dataset.printVisibleMetrics);
          const resetMetrics = parseTokens(visual.dataset.resetVisibleMetrics);
          for (const [kind, required, actual] of [["title basis", titleBasisMetrics, defaultMetrics], ["MUST_SHOW", mustShowMetrics, defaultMetrics], ["print", new Set([...titleBasisMetrics, ...mustShowMetrics]), printMetrics], ["reset", new Set([...titleBasisMetrics, ...mustShowMetrics]), resetMetrics]]) {
            for (const metric of required) if (!actual.has(metric)) add(gateSeverity(), "interactive-evidence-hidden", visualId, `${kind} metric '${metric}' is not visible in the declared state`);
          }
        });

        active.querySelectorAll("[data-chart-host='true'], .evidence-chart-canvas, [data-html-chart], [data-css-chart]").forEach((host) => {
          if (!(host instanceof HTMLElement) || host.offsetParent === null) return;
          const rect = host.getBoundingClientRect();
          const surface = host.querySelector("canvas, svg") ?? host;
          const surfaceRect = surface.getBoundingClientRect();
          if (surfaceRect.width < rect.width * .9 || surfaceRect.height < rect.height * .82) add("warning", "chart-surface-geometry", label(host), "Canvas/SVG does not use most of the declared chart host");
          const painted = paintedChartBounds(host);
          if (painted) { const widthRatio = (painted.right - painted.left) / Math.max(1, rect.width); const heightRatio = (painted.bottom - painted.top) / Math.max(1, rect.height); if (widthRatio < .58 || heightRatio < .6) add(gateSeverity(heightRatio < .32 ? "error" : "warning"), "chart-plot-occupancy", label(host), `painted plot uses ${Math.round(widthRatio * 100)}% width × ${Math.round(heightRatio * 100)}% height of chart host`); }
          host.querySelectorAll("svg text").forEach((text) => {
            const size = Number.parseFloat(getComputedStyle(text).fontSize);
            if (size > 0 && size < 14) add("warning", "chart-label-too-small", text.textContent?.trim() || label(text), `${size}px chart label`);
          });
        });

        const overlays = [...active.querySelectorAll("[data-chart-overlay], [data-chart-tooltip], .echarts-tooltip")].filter((element) => element instanceof HTMLElement && element.offsetParent !== null);
        overlays.forEach((overlay) => {
          const rect = overlay.getBoundingClientRect();
          if (rect.left < slideRect.left + 4 || rect.right > slideRect.right - 4 || rect.top < slideRect.top + 4 || rect.bottom > slideRect.bottom - 34) add("error", "chart-overlay-outside-safe-area", label(overlay), "Tooltip or overlay escapes the chart/slide safe region");
        });

        // Only controls painted by the active slide may participate in the
        // overlap check. Inactive slides are kept in the DOM for keyboard
        // navigation and must not obstruct the current page's evidence.
        const controls = [...active.querySelectorAll("[data-runtime-controls], .control-discovery-hint, .runtime-notice")].filter((element) => element instanceof HTMLElement && element.offsetParent !== null && Number(getComputedStyle(element).opacity) > 0);
        const protectedTargets = [...active.querySelectorAll(".slide-title, [data-brand-audit], [data-evidence-visual], .evidence-chart-canvas")].filter((element) => element instanceof HTMLElement && element.offsetParent !== null);
        controls.forEach((control) => protectedTargets.forEach((target) => {
          const ar = control.getBoundingClientRect(); const br = target.getBoundingClientRect();
          const width = Math.min(ar.right, br.right) - Math.max(ar.left, br.left); const height = Math.min(ar.bottom, br.bottom) - Math.max(ar.top, br.top);
          if (width > 2 && height > 2) add("error", "runtime-control-overlap", `${label(control)} ↔ ${label(target)}`, `${Math.round(width)}×${Math.round(height)} px overlap`);
        }));

        const targetRanges = { cover: [230, 270, 54, 64], content: [215, 250, 50, 60], closing: [220, 260, 52, 62] };
        const targetClearances = { cover: [68, 140, 42, 120], content: [68, 120, 34, 92], closing: [68, 140, 42, 120] };
        const positionFraction = (token, fallback) => token === "left" || token === "top" ? 0 : token === "right" || token === "bottom" ? 1 : token === "center" ? .5 : token?.endsWith("%") ? Number.parseFloat(token) / 100 : fallback;
        if (brandingProfile === "none" && active.querySelector("[data-brand-audit], [data-brand-role], .closing-brand-row")) add("error", "brand-unexpected", "slide", "Unbranded slide contains brand nodes or an empty brand-only row");
        if (brandingProfile === "zuel") {
          const role = active.dataset.slideType === "cover" ? "cover" : active.dataset.slideType === "closing" ? "closing" : "content";
          const logo = active.querySelector(`img[data-brand-role='${role}'][data-brand-audit='true']`);
          if (!logo || !logo.complete || !logo.naturalWidth) add("error", "brand-missing", "slide", `Selected ZUEL treatment is missing a loaded ${role} logo`);
        }
        for (const image of active.querySelectorAll("img[data-brand-audit='true'], .cover-composition .brand-row img, .closing-composition .brand-row img")) {
          if (!(image instanceof HTMLImageElement) || !image.complete || !image.naturalWidth || !image.naturalHeight) continue;
          const role = image.dataset.brandRole || (active.dataset.slideType === "cover" ? "cover" : active.dataset.slideType === "closing" ? "closing" : "content");
          const rect = image.getBoundingClientRect(); const style = getComputedStyle(image); const canvas = document.createElement("canvas");
          canvas.width = image.naturalWidth; canvas.height = image.naturalHeight; const context = canvas.getContext("2d", { willReadFrequently: true });
          let sourceBounds = { left: 0, top: 0, right: image.naturalWidth, bottom: image.naturalHeight };
          if (context) {
            context.drawImage(image, 0, 0); const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
            let left = canvas.width, top = canvas.height, right = -1, bottom = -1;
            for (let y = 0; y < canvas.height; y += 1) for (let x = 0; x < canvas.width; x += 1) if (pixels[(y * canvas.width + x) * 4 + 3] > 8) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); }
            if (right >= left && bottom >= top) sourceBounds = { left, top, right: right + 1, bottom: bottom + 1 };
          }
          const fit = style.objectFit || "fill"; const containScale = Math.min(rect.width / image.naturalWidth, rect.height / image.naturalHeight); const coverScale = Math.max(rect.width / image.naturalWidth, rect.height / image.naturalHeight);
          const scaleX = fit === "fill" ? rect.width / image.naturalWidth : fit === "cover" ? coverScale : fit === "none" ? 1 : containScale; const scaleY = fit === "fill" ? rect.height / image.naturalHeight : scaleX;
          const fittedWidth = image.naturalWidth * scaleX; const fittedHeight = image.naturalHeight * scaleY; const tokens = style.objectPosition.split(/\s+/); const px = positionFraction(tokens[0], .5); const py = positionFraction(tokens[1], .5);
          const painted = { left: rect.left + (rect.width - fittedWidth) * px + sourceBounds.left * scaleX, top: rect.top + (rect.height - fittedHeight) * py + sourceBounds.top * scaleY, width: (sourceBounds.right - sourceBounds.left) * scaleX, height: (sourceBounds.bottom - sourceBounds.top) * scaleY };
          painted.right = painted.left + painted.width; painted.bottom = painted.top + painted.height;
          const brandContainer = image.closest(".branded-closing, [data-logo-contains-institution-name]"); const containsInstitutionName = image.dataset.logoContainsInstitutionName === "true" || brandContainer?.getAttribute("data-logo-contains-institution-name") === "true"; const institutionTextVisible = Boolean(brandContainer?.querySelector("[data-institution-text='true']")); const duplicateInstitutionText = containsInstitutionName && institutionTextVisible;
          const rightClearance = slideRect.right - painted.right; const topClearance = painted.top - slideRect.top; const paintedAreaRatio = painted.width * painted.height / Math.max(1, rect.width * rect.height);
          const range = targetRanges[role]; const clearanceRange = targetClearances[role]; const detail = { role, source: [image.naturalWidth, image.naturalHeight], alphaBounds: sourceBounds, cssBox: [Math.round(rect.width), Math.round(rect.height)], painted: [Math.round(painted.width * 10) / 10, Math.round(painted.height * 10) / 10], paintedBounds: [painted.left - slideRect.left, painted.top - slideRect.top, painted.right - slideRect.left, painted.bottom - slideRect.top].map((value) => Math.round(value * 10) / 10), clearances: { right: Math.round(rightClearance * 10) / 10, top: Math.round(topClearance * 10) / 10 }, cssBoxToPaintedAreaRatio: Math.round(paintedAreaRatio * 1000) / 1000, objectFit: fit, sourceAspect: image.naturalWidth / image.naturalHeight, paintedAspect: painted.width / painted.height, logoContainsInstitutionName: containsInstitutionName, institutionTextVisible, duplicateInstitutionText };
          add("info", "brand-geometry", label(image), JSON.stringify(detail));
          if (duplicateInstitutionText) add("error", "brand-institution-duplication", label(image), "Complete lockup is accompanied by duplicate institution text");
          if (fit === "cover") add("error", "brand-logo-crop", label(image), "Brand mark must not use object-fit: cover");
          if (fit === "fill") add("error", "brand-logo-fit", label(image), "Brand mark must use object-fit: contain or an explicitly verified ratio-preserving mode");
          if (Math.abs((painted.width / painted.height) / ((sourceBounds.right - sourceBounds.left) / (sourceBounds.bottom - sourceBounds.top)) - 1) > distortionTolerance) add("error", "brand-logo-distortion", label(image), "Painted logo aspect ratio is distorted");
          if (range && (painted.width < range[0] || painted.width > range[1] || painted.height < range[2] || painted.height > range[3])) add("error", "brand-painted-size", label(image), `${role} painted bounds ${painted.width.toFixed(1)}×${painted.height.toFixed(1)} px; expected ${range[0]}–${range[1]} × ${range[2]}–${range[3]}`);
          if (clearanceRange && (rightClearance < clearanceRange[0] || rightClearance > clearanceRange[1] || topClearance < clearanceRange[2] || topClearance > clearanceRange[3])) add("error", "brand-painted-anchor", label(image), `${role} painted clearances right=${rightClearance.toFixed(1)} px, top=${topClearance.toFixed(1)} px; expected right ${clearanceRange[0]}–${clearanceRange[1]}, top ${clearanceRange[2]}–${clearanceRange[3]}`);
          if (paintedAreaRatio < .35) add("warning", "brand-css-box-padding", label(image), `visible artwork occupies ${Math.round(paintedAreaRatio * 100)}% of its CSS image box`);
          controls.forEach((control) => { const cr = control.getBoundingClientRect(); const pr = { right: painted.left + painted.width, bottom: painted.top + painted.height }; if (Math.min(cr.right, pr.right) - Math.max(cr.left, painted.left) > 2 && Math.min(cr.bottom, pr.bottom) - Math.max(cr.top, painted.top) > 2) add("error", "brand-logo-obstruction", label(image), "Runtime control obstructs painted brand pixels"); });
        }

          active.querySelectorAll("p, li, td, th, dd").forEach((element) => {
            if (active.dataset.slideType === "cover" || element.closest("figcaption, .source, .source-footer, .cover-citation, .deck-footer, .section-kicker, [data-small-text], [data-accessible-summary], [data-chart-host='true'], [data-evidence-visual='true']")) return;
            const size = Number.parseFloat(getComputedStyle(element).fontSize);
            if (size > 0 && size < 18) add("error", "small-body-text", label(element), `${size}px body text`);
          });

        const title = active.querySelector(".slide-title");
        if (title) {
          const style = getComputedStyle(title);
          const lineHeight = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.2;
          const titleRect = title.getBoundingClientRect();
          const lineCount = Math.max(1, Math.round(title.scrollHeight / Math.max(1, lineHeight)));
          const mode = title.dataset.titleMode;
          const titleGate = (type, message) => add(gateSeverity(), type, label(title), message);
          if (enforceQuality && !title.dataset.titleAudit) titleGate("title-audit-metadata", "Substantive title is missing data-title-audit");
          if (lineCount > 2) titleGate("title-more-than-two-lines", `Title occupies ${lineCount} lines; maximum is two`);
          if (mode === "single-line" && lineCount > 1) titleGate("title-unexpected-wrap", "single-line title wrapped");
          if (!mode && enforceQuality) titleGate("title-mode-missing", "Title must declare data-title-mode single-line or two-line");
          if (mode === "two-line" && lineCount < 2 && enforceQuality) titleGate("title-two-line-underfilled", "two-line title does not use its declared two-line geometry");
          const explicitLines = String(title.textContent ?? "").split(/\n/).map((line) => line.trim()).filter(Boolean);
          if (lineCount > 1 && explicitLines.length > 1 && explicitLines.at(-1).length <= 3) titleGate("orphan-title-line", "Title ends with an orphaned short line");
          if (title.scrollWidth > title.clientWidth + 2 || title.scrollHeight > title.clientHeight + 2) titleGate("title-clipped", "Title is clipped or overflows its box");
          const logo = active.querySelector("[data-brand-audit='true']") ?? active.querySelector("[data-logo-contains-institution-name] img");
          const rule = active.querySelector(".header-rule");
          const lead = active.querySelector(".slide-lead, [data-slide-lead]");
          const body = active.querySelector(".slide-body, [data-slide-body], .scaffold-deck-body");
          const hint = document.querySelector(".control-discovery-hint");
          [[logo, "logo"], [rule, "header rule"], [lead, "lead"], [body, "body"], [hint, "control hint"]].forEach(([target, name]) => {
            if (target instanceof HTMLElement && overlaps(titleRect, target.getBoundingClientRect())) titleGate("title-geometry-overlap", `Title intersects ${name}`);
          });
        } else if (enforceQuality && !["cover", "closing"].includes(active.dataset.slideType ?? "content")) {
          add("error", "missing-slide-title", label(active), "Substantive slide has no .slide-title element");
        }

        const runtimePage = Number(active.dataset.runtimePage);
        if (Number.isInteger(runtimePage) && runtimePage > 0) {
          const display = active.querySelector("[data-runtime-page-display]");
          if (display) {
            const match = String(display.textContent ?? "").match(/\b(\d+)\s*\//);
            if (match && Number(match[1]) !== runtimePage) add("error", "page-number-mismatch", label(display), `visible page ${match[1]} does not match runtime page ${runtimePage}`);
          }
        }
        return result;
      }, { minEvidenceWidth: 300, minEvidenceHeight: 180, distortionTolerance: 0.04, stage: manifestStage, enforceQuality, designSystemVersion: Number(manifestDocument.designSystemVersion ?? 0), brandingProfile: manifestDocument.branding?.profile });
      const slideId = await page.locator(".slide.is-active").getAttribute("data-slide-id");
      slides.push({ slide: index, slideId, findings });
    }
    const scaledViews = [];
    const deckViewports = [{ width: 1024, height: 768 }, { width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 1920, height: 1080 }, { width: 2560, height: 1440 }, { width: 500, height: 281 }];
    for (const viewport of deckViewports) {
      await page.setViewportSize(viewport);
      // React applies viewport fitting asynchronously. Measure only after the
      // requested scale commits; the clipping/overflow checks below stay intact.
      await page.waitForFunction(() => {
        const frame = document.querySelector('.deck-frame');
        if (!frame) return false;
        const expected = Math.min(innerWidth / 1600, innerHeight / 900);
        return Math.abs(new DOMMatrixReadOnly(getComputedStyle(frame).transform).a - expected) < .0001;
      }, undefined, { timeout: 10000 });
      const findings = [];
      for (let index = 1; index <= slideCount; index += 1) {
        await page.goto(`${baseUrl}#/${index}`, { waitUntil: "networkidle" });
        await page.waitForFunction((expected) => [...document.querySelectorAll(".slide")][expected - 1]?.classList.contains("is-active"), index, { timeout: 10000 });
        const check = await page.evaluate(() => {
          const active = document.querySelector(".slide.is-active") ?? [...document.querySelectorAll(".slide")].find((node) => node.getAttribute("aria-hidden") !== "true");
          if (!(active instanceof HTMLElement)) return { missing: true };
          const rect = active.getBoundingClientRect(); const viewportWidth = document.documentElement.clientWidth; const viewportHeight = document.documentElement.clientHeight;
          return { missing: false, rect: [rect.left, rect.top, rect.width, rect.height], aspect: rect.width / Math.max(1, rect.height), slideOverflow: active.scrollWidth > active.clientWidth + 1 || active.scrollHeight > active.clientHeight + 1, pageOverflow: document.documentElement.scrollWidth > viewportWidth + 1 || document.documentElement.scrollHeight > viewportHeight + 1, outside: rect.left < -1 || rect.top < -1 || rect.right > viewportWidth + 1 || rect.bottom > viewportHeight + 1 };
        });
        const at = `slide-${index}`;
        if (check.missing) findings.push({ severity: "error", type: "scaled-preview-missing", element: at, message: "No active slide at scaled viewport" });
        else {
          if (Math.abs(check.aspect - 16 / 9) > .01) findings.push({ severity: "error", type: "scaled-preview-aspect", element: at, message: `rendered aspect ratio ${check.aspect.toFixed(3)} is not 16:9` });
          if (check.slideOverflow || check.pageOverflow) findings.push({ severity: "error", type: "scaled-preview-overflow", element: at, message: `overflow at ${viewport.width}×${viewport.height}` });
          if (check.outside) findings.push({ severity: "error", type: "scaled-preview-clipping", element: at, message: `logical slide escapes viewport at ${viewport.width}×${viewport.height}` });
        }
      }
      scaledViews.push({ viewport, findings });
    }
    return { target, slideCount, slides, scaledViews };
  });

  if (report.mode !== "scroll-report") {
    const signatureGroups = new Map();
    for (const slide of report.slides) {
      const densityFinding = slide.findings.find((finding) => finding.type === "density-metrics");
      if (!densityFinding) continue;
      try {
        const metrics = JSON.parse(densityFinding.message);
        if (!metrics.layoutSignature) continue;
        const group = signatureGroups.get(metrics.layoutSignature) ?? [];
        group.push({ slide, densityFinding, metrics });
        signatureGroups.set(metrics.layoutSignature, group);
      } catch {
        // Metric-integrity checks report malformed browser output elsewhere.
      }
    }
    for (const group of signatureGroups.values()) {
      for (const item of group) {
        item.metrics.layoutClusterSize = group.length;
        item.densityFinding.message = JSON.stringify(item.metrics);
      }
      if (group.length <= 2) continue;
      const pages = group.map((item) => item.slide.slide).join(", ");
      for (const item of group) item.slide.findings.push({ severity: manifestStage === "complete" && enforceQuality ? "error" : "warning", type: "cross-page-layout-repetition", element: `slide-${item.slide.slide}`, message: `browser-derived body geometry repeats on ${group.length} substantive slides (${pages}); layout names and silhouette labels do not count as visual variety` });
    }
    const familyGroups = new Map();
    for (const group of signatureGroups.values()) for (const item of group) {
      const key = item.metrics.layoutFamilySignature;
      if (!key) continue;
      const family = familyGroups.get(key) ?? [];
      family.push(item);
      familyGroups.set(key, family);
    }
    for (const family of familyGroups.values()) {
      for (const item of family) {
        item.metrics.layoutFamilyClusterSize = family.length;
        item.densityFinding.message = JSON.stringify(item.metrics);
      }
      if (family.length <= 2) continue;
      const pages = family.map((item) => item.slide.slide).join(", ");
      for (const item of family) item.slide.findings.push({ severity: manifestStage === "complete" && enforceQuality ? "error" : "warning", type: "cross-page-layout-family-repetition", element: `slide-${item.slide.slide}`, message: `the same body template family '${item.metrics.layoutFamilySignature}' appears on ${family.length} substantive slides (${pages}); bottom strips, labels, and role names do not create a new composition` });
    }

    const branded = report.slides.flatMap((slide) => slide.findings.filter((finding) => finding.type === "brand-geometry").map((finding) => { try { return { slide, detail: JSON.parse(finding.message) }; } catch { return null; } }).filter(Boolean));
    const cover = branded.find((item) => item.detail.role === "cover"); const closing = branded.find((item) => item.detail.role === "closing");
    if (cover && closing) {
      const rightDelta = Math.abs(cover.detail.clearances.right - closing.detail.clearances.right); const topDelta = Math.abs(cover.detail.clearances.top - closing.detail.clearances.top);
      if (rightDelta > 24 || topDelta > 24) closing.slide.findings.push({ severity: "error", type: "brand-cross-role-anchor", element: "cover ↔ closing", message: `painted anchor delta right=${rightDelta.toFixed(1)} px, top=${topDelta.toFixed(1)} px; maximum is 24 px` });
    }
  }

  const inspected = report.mode === "scroll-report"
    ? report.views.map((view) => ({ location: `${view.viewport.width}x${view.viewport.height}`, findings: view.findings }))
    : [...report.slides.map((slide) => ({ location: `slide-${slide.slide}`, findings: slide.findings })), ...report.scaledViews.map((view) => ({ location: `${view.viewport.width}x${view.viewport.height}`, findings: view.findings }))];
  const errors = inspected.flatMap((item) => item.findings.filter((finding) => finding.severity === "error").map((finding) => ({ location: item.location, ...finding })));
  const warnings = inspected.flatMap((item) => item.findings.filter((finding) => finding.severity === "warning").map((finding) => ({ location: item.location, ...finding })));
  const brandGeometry = inspected.flatMap((item) => item.findings.filter((finding) => finding.type === "brand-geometry").map((finding) => ({ location: item.location, ...finding })));
  const currentRenderFingerprint = target.startsWith("http") ? undefined : await computeRenderFingerprint(path.resolve(target));
  const output = { ...report, currentRenderFingerprint, passed: errors.length === 0, errorCount: errors.length, warningCount: warnings.length, errors, warnings, brandGeometry };
  await writeFile(outputPath, JSON.stringify(output, null, 2), "utf8");
  // Preserve human review flags while pre-filling the machine-readable review
  // artifact with measured findings from this browser pass. Legacy projects
  // without the artifact are left untouched.
  if (!target.startsWith("http")) {
    const reviewPath = path.join(path.resolve(target), "visual-review.json");
    try {
      const review = JSON.parse(await readFile(reviewPath, "utf8"));
      review.currentRenderFingerprint = currentRenderFingerprint;
      if (review.renderFingerprint !== currentRenderFingerprint) {
        review.reviewInvalidated = true;
        review.invalidationReason = "Output-relevant project files changed after the recorded visual review. Re-render and repeat composition/detail inspection.";
      } else {
        review.reviewInvalidated = false;
        delete review.invalidationReason;
      }
      const entries = report.mode === "scroll-report" ? (review.sections ?? []) : (review.slides ?? []);
        const findingSet = (items) => items.filter((finding) => finding.severity === "error" || finding.severity === "warning");
        const parseMetricFinding = (items, type) => { const finding = items.find((item) => item.type === type); if (!finding) return null; try { return JSON.parse(finding.message); } catch { return null; } };
      for (const entry of entries) {
        const id = entry.slideId ?? entry.sectionId;
        const manifestUnit = (report.mode === "scroll-report" ? (manifestDocument.sections ?? []) : (manifestDocument.slides ?? [])).find((unit) => unit.id === id);
        const items = report.mode === "scroll-report"
          ? report.views.flatMap((view) => view.findings).filter((finding) => finding.element === id || String(finding.message ?? "").includes(id))
          : report.slides.find((slide) => slide.slideId === id)?.findings ?? [];
        const slideRecord = report.mode === "scroll-report" ? null : report.slides.find((slide) => slide.slideId === id);
        const scaledItems = slideRecord ? report.scaledViews.flatMap((view) => view.findings.filter((finding) => finding.element === `slide-${slideRecord.slide}`)) : [];
        const findings = findingSet(items);
        const has = (types) => findings.some((finding) => types.includes(finding.type));
        const measured = parseMetricFinding(items, "density-metrics");
        entry.metrics = { ...(entry.metrics ?? {}), ...(measured ?? {}), browserFindingCount: findings.length, browserErrorCount: findings.filter((finding) => finding.severity === "error").length, browserWarningCount: findings.filter((finding) => finding.severity === "warning").length, auditSource: "browser" };
        const status = (types) => has(types) ? (findings.some((finding) => types.includes(finding.type) && finding.severity === "error") ? "fail" : "warning") : "pass";
        const autoStatus = (_current, types) => status(types);
        entry.densityStatus = autoStatus(entry.densityStatus, ["content-occupancy", "paint-density", "paint-to-layout-ratio", "internal-occupancy", "module-internal-occupancy", "module-measurement-missing", "lower-half-coverage", "slide-empty-lower-region", "report-empty-section-tail", "report-stacked-slide-density", "repeated-equal-regions", "justified-equal-regions-underfilled", "cross-page-layout-repetition", "cross-page-layout-family-repetition", "evidence-wrapper-occupancy", "visual-plan-missing", "visual-kind-missing"]);
        entry.titleStatus = autoStatus(entry.titleStatus, ["title-audit-metadata", "title-more-than-two-lines", "title-unexpected-wrap", "orphan-title-line", "title-clipped", "title-geometry-overlap"]);
        const hasChart = typeof measured?.plotOccupancy === "number" || items.some((finding) => ["chart-plot-occupancy", "chart-surface-geometry", "blank-chart", "type-a-chart-host-missing", "chart-form-missing"].includes(finding.type));
        entry.plotOccupancyStatus = hasChart ? autoStatus(entry.plotOccupancyStatus, ["chart-plot-occupancy", "chart-surface-geometry", "blank-chart", "type-a-chart-host-missing", "chart-form-missing"]) : "not-applicable";
        if (!hasChart && entry.plotOccupancyStatus === "not-applicable" && !entry.notApplicableReason) entry.notApplicableReason = "本页视觉中心不是图表/绘图区；按实际结构、文字或科学图像占用率复核。";
        entry.evidenceWeightStatus = autoStatus(entry.evidenceWeightStatus, ["slide-column-weight-imbalance", "evidence-visual-too-small", "decisive-visual-too-small", "missing-visual-claim-links", "brand-logo-fit", "brand-logo-crop", "brand-logo-distortion", "brand-painted-size", "brand-painted-anchor", "brand-cross-role-anchor", "brand-logo-obstruction", "brand-institution-duplication", "flow-horizontal-span", "flow-unbalanced-margins", "flow-edge-label-gap", "flow-edge-label-overlap", "flow-edge-label-hook", "flow-label-detached", "flow-label-redundancy", "flow-connector-fragmented"]);
        entry.overflowStatus = autoStatus(entry.overflowStatus, ["slide-overflow", "text-overflow", "safe-area", "report-section-overflow", "report-horizontal-overflow"]);
        entry.bodySilhouette = manifestUnit?.bodySilhouette ?? entry.bodySilhouette;
        entry.silhouetteStatus = entry.bodySilhouette ? autoStatus(entry.silhouetteStatus, ["body-silhouette-missing", "repeated-equal-regions", "justified-equal-regions-underfilled", "cross-page-layout-repetition", "cross-page-layout-family-repetition"]) : "not-applicable";
        entry.chartSemanticFitStatus = hasChart ? autoStatus(entry.chartSemanticFitStatus, ["chart-plot-occupancy", "chart-surface-geometry", "blank-chart", "type-a-chart-host-missing", "chart-form-missing"]) : "not-applicable";
        if (manifestUnit?.bodySilhouette === "process-board") entry.flowGeometryStatus = autoStatus(entry.flowGeometryStatus, ["flow-edge-reference", "flow-edge-empty", "flow-isolated-node", "flow-node-overlap", "flow-connector-fragmented", "flow-edge-label-overlap", "flow-edge-label-gap", "flow-edge-label-hook", "flow-label-detached", "flow-label-redundancy", "flow-horizontal-span", "flow-unbalanced-margins", "process-flow-too-narrow", "process-flow-too-short", "process-node-occupancy", "process-label-too-small", "process-support-gap"]); else delete entry.flowGeometryStatus;
        if (report.mode !== "scroll-report") entry.scaledPreviewStatus = scaledItems.some((finding) => finding.severity === "error") ? "fail" : scaledItems.some((finding) => finding.severity === "warning") ? "warning" : "pass"; else delete entry.scaledPreviewStatus;
        const brandFindings = items.filter((finding) => finding.type.startsWith("brand-"));
        if (brandFindings.length) entry.brandPlacementStatus = brandFindings.some((finding) => finding.severity === "error") ? "fail" : brandFindings.some((finding) => finding.severity === "warning") ? "warning" : "pass"; else delete entry.brandPlacementStatus;
        if (review.reviewInvalidated) { entry.compositionReviewed = false; entry.detailReviewed = false; }
        if (!entry.referenceCalibration && manifestDocument.referenceVisualContract?.sourceRefs?.length) entry.referenceCalibration = { status: "pending", sourceRefs: manifestDocument.referenceVisualContract.sourceRefs, notes: "浏览器审计不能代替参考图人工校准；请附上原型与参考图的并排截图或联系表后再标记 reviewed。", checked: [], evidence: [] };
      }
      await writeFile(reviewPath, `${JSON.stringify(review, null, 2)}\n`, "utf8");
    } catch {
      // The artifact is optional for legacy/prototype projects; audit output is
      // still authoritative when no editable review record exists.
    }
  }
  console.log(JSON.stringify({ output: outputPath, mode: report.mode ?? "slide-deck", slideCount: report.slideCount, sectionCount: report.sectionCount, passed: output.passed, errorCount: errors.length, warningCount: warnings.length }, null, 2));
  process.exit(errors.length ? 1 : 0);
} catch (error) {
  console.error(`[layout-audit] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
