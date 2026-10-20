# PDF export contract

## V2 visual and metadata release gate

The academic-light PDF must preserve the exact cobalt tokens, light gradients, subtle shadows, chart fonts, and container geometry used in the browser and Presenter preview. Inspect every page, not only the first screenshot. Fail on clipping, overflow, hidden evidence, controls, placeholder copy, missing chart paint, or body text below 18 px. PDF title/subject/producer metadata must describe the actual deliverable; remove scaffold phrases such as `prototype scaffold` and visible “测试” labels before release.

## Contents

1. Release gate
2. Command and dependencies
3. Print mode
4. Asset readiness
5. Export validation
6. Failure behavior

## 1. Release gate

Export a formal PDF only from a manifest whose effective stage is `complete`. Refuse `stage: "prototype"` because representative pages have not completed the user-approval and full-deck workflow.

Before export:

1. validate the complete manifest;
2. build the project;
3. run the complete-deck layout audit;
4. fix blocking overflow, missing images, unsafe crops, or invalid profile structure;
5. confirm that cover, synthesis, and closing follow the active profile.

Do not use PDF export to bypass a failed build or visual audit.

## 2. Command and dependencies

Run:

```powershell
node <skill-dir>/scripts/export_pdf.mjs <project-root> [output.pdf]
```

Use the existing browser discovery and local HTTP serving path from `browser_helpers.mjs`. Require a Chromium-capable Playwright runtime for print rendering.

Use a reliable PDF parser such as `pdf-lib` for page-count and page-size validation. Resolve it from `PDF_LIB_PATH`, the project dependencies, or the bundled Node runtime. If no trusted parser exists, fail with a clear dependency message; do not claim page-count validation from a fragile text regex.

Write the default artifact under `<project-root>/export/` and write a JSON validation report beside it.

## 3. Print mode

Use `?print=1` as a dedicated runtime mode. Render all slides in manifest order with one `1600 × 900` slide per printed page.

In print mode:

- preserve the original slide components, visual tokens, cover, brand, figures, tables, formulas, and captions;
- reveal every fragment at its final state;
- disable transitions and animation;
- omit navigation arrows, toolbar, progress line, chapter panel, lightbox, focus state, debug layers, Presenter View, timer, connection state, and notes;
- keep a restrained non-interactive page/section footer when the live deck normally shows page state;
- prohibit blank pages, internal scrollbars, clipping, responsive reflow, and alternate PDF-only themes;
- use `@page` size `1600px 900px` with zero margins and background printing enabled.

Keep print CSS isolated in `print-export.css`. Do not change live-mode geometry to solve print-only problems.

## 4. Asset readiness

Expose a deterministic deck-ready signal only after:

- the complete slide list is rendered;
- `document.fonts.ready` resolves when available;
- all images finish loading or report an error;
- every `[data-evidence-visual]` reports `data-visual-ready="true"`;
- each Type A chart has applied its declared deterministic `printState`, independent of any live temporary filter;
- evidence annotation layers have completed layout;
- two animation frames allow final layout calculation.

Wait for the signal before browser inspection and PDF generation. Then fail on any image with zero natural width, unresolved font state, slide-count mismatch, or print-mode overflow.

Do not silently replace missing images or export before web fonts settle.

## 5. Export validation

Validate before and after PDF generation.

### Browser-side checks

- rendered slide count equals manifest count;
- `data-slide-id` order equals manifest order;
- every slide measures `1600 × 900`;
- every slide has meaningful text or visual content;
- no slide canvas overflows;
- images are complete;
- evidence visuals are ready, Type A charts expose matching default/print-state contracts, and Type C sources remain pixel-immutable;
- evidence annotations required for static explanation are present and chart controls are hidden;
- fragments are fully visible;
- presenter, notes, interaction controls, and debug layers are absent or hidden.

### PDF-side checks

- output file exists and is not trivially small;
- parsed PDF page count equals manifest slide count;
- every page is 16:9 within a small numeric tolerance;
- the validation report records project, manifest, stage, output, page count, byte size, layout-audit path, and print inspection.

Use rendered page inspection or the existing deck screenshots for final visual confirmation of Chinese text, formulas, tables, images, cover, synthesis, and closing. A correct page count alone does not prove visual quality.

## 6. Failure behavior

Stop with a readable error when:

- manifest stage is `prototype`;
- manifest validation fails;
- layout audit reports blocking errors;
- no built `index.html` is available;
- Playwright or Chromium is unavailable;
- `pdf-lib` or another trusted parser is unavailable;
- fonts, images, charts, or annotation overlays fail readiness;
- slide count or order differs from the manifest;
- print-mode canvas overflows;
- PDF page count or aspect ratio is wrong.

Keep a successfully generated PDF only when all required post-export checks pass. Report environmental limitations explicitly instead of calling the export verified.
