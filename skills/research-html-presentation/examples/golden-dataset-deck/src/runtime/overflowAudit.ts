export type SafeMargins = { left: number; right: number; top: number; bottom: number };

const MIN_EVIDENCE_WIDTH = 300;
const MIN_EVIDENCE_HEIGHT = 180;
const IMAGE_DISTORTION_TOLERANCE = 0.04;

function selectorFor(element: Element) {
  const id = element.getAttribute("id");
  if (id) return `#${id}`;
  const classes = [...element.classList].slice(0, 3).join(".");
  return `${element.tagName.toLowerCase()}${classes ? `.${classes}` : ""}`;
}

function intersects(a: DOMRect, b: DOMRect, tolerance = 2) {
  const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return width > tolerance && height > tolerance;
}

function isVisible(element: HTMLElement) {
  const style = getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0 && element.getClientRects().length > 0;
}

export function auditActiveSlide(root: Document | HTMLElement = document, margins: SafeMargins = { left: 72, right: 72, top: 42, bottom: 36 }) {
  const slide = root.querySelector<HTMLElement>(".slide.is-active");
  if (!slide) return [];

  const findings: Array<Record<string, unknown>> = [];
  const slideRect = slide.getBoundingClientRect();

  if (slide.scrollWidth > slide.clientWidth + 1 || slide.scrollHeight > slide.clientHeight + 1) {
    findings.push({ type: "slide-scroll", width: slide.scrollWidth - slide.clientWidth, height: slide.scrollHeight - slide.clientHeight });
  }

  slide.querySelectorAll<HTMLElement>("[data-safe]").forEach((element) => {
    if (!isVisible(element)) return;
    const rect = element.getBoundingClientRect();
    const overflow = {
      left: Math.max(0, slideRect.left + margins.left - rect.left),
      right: Math.max(0, rect.right - (slideRect.right - margins.right)),
      top: Math.max(0, slideRect.top + margins.top - rect.top),
      bottom: Math.max(0, rect.bottom - (slideRect.bottom - margins.bottom)),
    };
    if (Object.values(overflow).some((value) => value > 1)) findings.push({ type: "safe-area", selector: selectorFor(element), overflow });
    if (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1) {
      findings.push({ type: "element-scroll", selector: selectorFor(element), width: element.scrollWidth - element.clientWidth, height: element.scrollHeight - element.clientHeight });
    }
  });

  slide.querySelectorAll<HTMLElement>("[data-check-text]").forEach((element) => {
    if (!isVisible(element)) return;
    if (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1) {
      findings.push({ type: "text-overflow", selector: selectorFor(element), width: element.scrollWidth - element.clientWidth, height: element.scrollHeight - element.clientHeight });
    }
  });

  const auditBoxes = [...slide.querySelectorAll<HTMLElement>("[data-audit-box]")].filter(isVisible);
  for (let index = 0; index < auditBoxes.length; index += 1) {
    for (let peer = index + 1; peer < auditBoxes.length; peer += 1) {
      const a = auditBoxes[index];
      const b = auditBoxes[peer];
      if (a.contains(b) || b.contains(a)) continue;
      if (intersects(a.getBoundingClientRect(), b.getBoundingClientRect())) {
        findings.push({ type: "peer-overlap", selectors: [selectorFor(a), selectorFor(b)] });
      }
    }
  }

  slide.querySelectorAll<HTMLImageElement>("img[data-scientific='true']").forEach((image) => {
    if (!isVisible(image)) return;
    const rect = image.getBoundingClientRect();
    const style = getComputedStyle(image);
    const cropSafe = image.dataset.cropSafe === "true";
    if (style.objectFit === "cover" && !cropSafe) findings.push({ type: "unsafe-scientific-crop", selector: selectorFor(image) });
    if (rect.width < MIN_EVIDENCE_WIDTH || rect.height < MIN_EVIDENCE_HEIGHT) findings.push({ type: "small-scientific-figure", selector: selectorFor(image), width: rect.width, height: rect.height });
    if (image.naturalWidth && image.naturalHeight && style.objectFit === "fill") {
      const naturalRatio = image.naturalWidth / image.naturalHeight;
      const renderedRatio = rect.width / Math.max(rect.height, 1);
      if (Math.abs(renderedRatio / naturalRatio - 1) > IMAGE_DISTORTION_TOLERANCE) findings.push({ type: "image-distortion", selector: selectorFor(image), naturalRatio, renderedRatio });
    }
  });

  slide.querySelectorAll<HTMLElement>("[data-evidence-visual]").forEach((visual) => {
    if (!isVisible(visual)) return;
    const rect = visual.getBoundingClientRect();
    const visualId = visual.dataset.visualId || selectorFor(visual);
    if (!visual.dataset.visualId) findings.push({ type: "missing-visual-id", selector: selectorFor(visual) });
    if (!visual.dataset.claimIds) findings.push({ type: "missing-visual-claim-links", visualId });
    if (visual.dataset.visualReady !== "true") findings.push({ type: "evidence-visual-not-ready", visualId });
    if (rect.width < MIN_EVIDENCE_WIDTH || rect.height < MIN_EVIDENCE_HEIGHT) findings.push({ type: "evidence-visual-too-small", visualId, width: rect.width, height: rect.height });
    if (visual.dataset.evidenceType === "A" && (!visual.dataset.defaultState || !visual.dataset.printState)) findings.push({ type: "chart-state-contract-missing", visualId });
    if (visual.dataset.evidenceType === "C" && visual.dataset.pixelImmutable !== "true") findings.push({ type: "type-c-source-not-locked", visualId });
  });

  slide.querySelectorAll<HTMLElement>("p, li, td, th, [data-check-text]").forEach((element) => {
    if (!isVisible(element) || element.closest("figcaption, .deck-footer, .source-note") || element.hasAttribute("data-small-text")) return;
    const size = Number.parseFloat(getComputedStyle(element).fontSize);
    if (size && size < 18) findings.push({ type: "small-body-text", selector: selectorFor(element), fontSize: size });
  });

  findings.forEach((finding) => console.warn("[deck-audit]", finding));
  return findings;
}
