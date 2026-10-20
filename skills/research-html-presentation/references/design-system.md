# Academic presentation design system

## `academic-light` V2: cobalt high-density academic board

New light projects use `designSystemVersion: 2`. Keep the public style name `academic-light`; do not add a third style or a green variant. The default palette is `#0b245b`, `#0e2f73`, `#173f9e`, `#2455b5`, `#2d65c6`, `#9fb9e8`, `#cbd9f2`, `#e3ebf9`, and `#f2f5fb`, with `#b3262e` reserved for decisive differences, variables, and conclusions. White remains the dominant surface. Bundled CSS tokens are authoritative for browser, Presenter, print, and PDF.

Use narrow low-intensity same-hue gradients, `--shadow-panel`, and `--shadow-band` only to clarify hierarchy. Radius may vary from 0–6 px. Mix complete frames with open frames, shared borders, notched labels, ribbons, arrow stages, dashed question boundaries, pale inset evidence stages, and a selective conclusion band. Prohibit glassmorphism, glow, heavy floating shadows, large gradient backgrounds, and card-wall repetition.

The V2 content header is compact: small cobalt marker, single-line title first, stable rule line, small page/section label, non-competing official logo, and a thin lead band. Give the body approximately y=160–805 whenever title length permits. A takeaway appears only when it adds consequence, application, or boundary. `compact-academic-board` changes header geometry, body boundaries, shared panels, and conclusion treatment; it is the new light scaffold default, not a padding alias.

## Contents

1. Shared visual target and default skin
2. Color and emphasis
3. Typography
4. Canvas and grid
5. Density and evidence weight
6. Titles and modules
7. Scientific figures and image geometry
8. Charts, tables, and formulas
9. Cover, agenda, synthesis, and closing
10. Brand handoff
11. AI-template rejection
12. Academic chart theme and motion appearance
13. Dataset scroll-report visual handoff

## 1. Shared visual target and default skin

Both supported skins use a formal, compact, evidence-rich Chinese academic composition. A viewer scanning only titles, module headings, decisive emphasis, main figures, and conclusion bands should recover the argument. The visual choice is recorded as `visualStyle` and detailed in [visual-styles.md](visual-styles.md).

`academic-light` remains the default and uses the V2 cobalt high-density board: shared/open boundaries, strong alignment, layered rule weights, pale evidence fields, compact deep-blue heading bands, varied container geometry, and stable baselines. `tech-engineering-dark` may change surfaces, semantic colors, border treatment, engineering rulework, and the visual proportions of regions within an already selected layout. It keeps the fixed canvas, the selected L01–L24 relationship, evidence hierarchy, density gates, and reading order; it never creates parallel B-layout IDs or changes the content model. Make research workload visible through real evidence rather than decorative density.

When the user supplies a different reference, extract a project visual contract containing title geometry, body silhouettes, image/text ratio, density, highlight rules, brand role, and prohibited traits. Use it as an override; never copy its topic or foreign brand.

## 2. Color and emphasis

Use these defaults for `academic-light` unless an explicitly selected, verified institutional template imposes authentic constraints. The `tech-engineering-dark` tokens and chart palette live in [visual-styles.md](visual-styles.md) and its scoped stylesheet; do not mix token sets casually:

```css
:root {
  --academic-blue-980: #0b245b;
  --academic-blue-950: #0e2f73;
  --academic-blue-900: #173f9e;
  --academic-blue-800: #2455b5;
  --academic-blue-700: #2d65c6;
  --academic-blue-300: #9fb9e8;
  --academic-blue-200: #cbd9f2;
  --academic-blue-100: #e3ebf9;
  --academic-blue-050: #f2f5fb;
  --academic-red-800: #962129;
  --academic-red-700: #b3262e;
  --academic-red-100: #f8e8ea;
  --ink-950: #17243a;
  --ink-800: #2d3748;
  --ink-600: #5c6675;
  --line-300: #c4cddd;
  --line-200: #dde3ed;
  --surface-050: #f8fafd;
  --white: #fff;
}
```

- Use blue for titles, rules, module headings, tables, process nodes, and structural fields.
- Use dark red for decisive variables, thresholds, risks, deltas, and conclusions.
- Keep red below roughly 8% of visible text and normally below three emphasis groups per region.
- Use dark gray for body text; do not create hierarchy through low contrast.
- Use no more than three blue shades on one slide.
- Do not rely on color alone; pair it with labels, symbols, line styles, or wording.
- Meet 4.5:1 contrast for normal text and 3:1 for large text.

Use solid fills for primary evidence surfaces. Same-hue gradients are allowed on narrow title, lead, and conclusion bands and on pale inset evidence stages. Use only the bundled subtle depth tokens. Vary radii from 0–6 px according to hierarchy; do not round every module.

## 3. Typography

```css
--font-sans: "Source Han Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
--font-mono: "JetBrains Mono", "Cascadia Mono", Consolas, monospace;
--font-math: "STIX Two Math", "Cambria Math", "Times New Roman", serif;
```

| Level | Use | Size | Weight | Constraint |
|---|---|---:|---:|---|
| L1 | Cover/section title | 64–84 px | 600–700 | One or two lines |
| L2 | Slide title | 38–42 px | 700–750 | Prefer one line |
| L2.5 | Lead claim | 24–28 px | 500–600 | One or two lines |
| L3 | Module/table header | 24–30 px | 600–700 | Short phrase |
| L4 | Body/bullets | 19–23 px | 400–600 | Absolute minimum 18 px |
| L5 | Caption/axis label | 15–18 px | 400–500 | Absolute minimum 14 px |
| L5 | Footer/page count | 14–16 px | 400–500 | Low visual weight |

Shorten, restructure, or split before reducing type. Do not use condensed fonts, negative tracking, or element-level scaling to force fit.


### Selective body emphasis

Apply this default to both deck and scrolling-report body copy, in either visual style, unless the user requests another treatment. Ordinary explanatory paragraphs should visibly distinguish their important information; headings, colored conclusion bands, and table headers alone do not provide enough emphasis inside the body.

- Bold the paragraph's core finding, decisive comparison, or interpretation-changing condition. For key quantities, include the unit, comparison basis, or observation window when these are needed to understand the claim.
- Keep supporting context at regular weight. Usually one or two short emphasis spans are sufficient; choose them by evidence importance rather than a fixed quota. Do not bold whole paragraphs, every number, every table cell, or generic transition words.
- Preserve scientific meaning and uncertainty. Do not visually detach a result from qualifiers such as “within the collected records,” “partial year,” or “descriptive comparison”; emphasize an important limitation together with the condition it limits.
- Use semantic inline `<strong>` (or the equivalent rich-text node), normally weight 700 against regular body copy. Retain the body font size, line height, and selected style's text color; bold emphasis does not require red text, a new badge, or an extra card.
- During visual review, scan the body separately from its already-bold titles and conclusion bands. Check that the emphasized fragments reveal the main finding and its relevant boundary, that regular copy remains readable, and that bold text wraps safely on narrow screens and in print. Preserve local authoring behavior for mixed regular/bold text.

For example: “2025年，AI标签记录占比为 **28.56%**；这一结果描述 **收录发布记录中的主题结构**。” For a partial-year comparison, keep “**2026年截至6月18日，属于部分年度**” together instead of highlighting a quantity while hiding its time boundary.

## 4. Canvas and grid

- Fix every slide to `1600 × 900` and scale the complete canvas uniformly.
- Center it in a neutral dark letterbox.
- Set document and slide overflow to hidden; never reflow columns at narrow viewports.
- Use safe margins near 72 px left/right, 42 px top, and 36 px bottom.
- Use a 12-column grid with about 20 px gutters.
- Use 8 px spacing increments.
- Keep 20–28 px between primary modules and 16–24 px inside them.

Common vertical zones:

| Zone | Typical range |
|---|---|
| Title | y = 28–94 |
| Optional lead | y = 109–151 |
| Body | y = 164–805; extend upward when lead is absent |
| Optional takeaway | y = 810–858 |
| Page/progress | bottom system layer |

Use explicit `grid-column` and `grid-row` on complex pages. Verify that fixed row heights plus gaps equal the available body height.

## 5. Density and evidence weight

- Fill roughly 72–86% of the safe area on substantive slides.
- Use two to four primary regions and three to six evidence units.
- Target 120–220 visible Chinese characters; allow up to about 320 for purpose-built tables or risk maps.
- Use one main figure or two to four supporting figures. Use a dedicated matrix for more than six essential images.
- Do not leave more than 20% narratively useless body space.
- Size modules by evidence weight, not symmetry. The decisive figure must not be smaller than explanatory decoration.
- Achieve density through real figures, tables, aligned explanation, and shared boundaries—not a higher card count. For substantive pages, the complete-stage browser contract requires at least 70% union occupancy of the safe body, at least 60% evidence-wrapper internal occupancy, and at least 45% coverage of the lower half; cover, pure closing, and explicitly justified section transitions are exempt. The implementation and thresholds live in [quality-contract.md](quality-contract.md); do not fill a failed page with decorative cards or stretched backgrounds.
- On ordinary dataset content pages, size the visual and plot area to the available evidence region. Treat a largely empty lower half, a plot confined to the top of a tall wrapper, or severely unbalanced columns as a composition failure even when nothing overflows. Merge weak pages or add real comparisons, validation metrics, error analysis, or explanation; never add filler cards or gate copy.

Composition is selected independently from the skin. New `academic-light` projects default to `compact-academic-board`; legacy manifests that omit the profile remain readable, and `tech-engineering-dark` keeps its existing default. The compact profile implements compact title geometry, shared/open edges, nested figure/text regions, red decisive terms, and a selective bottom conclusion band. It changes spacing and region treatment, not canvas, typography minimums, scientific fidelity, or active brand geometry. Apply its silhouette only after a `VisualPlan` identifies a real visual center; never use it to disguise a low-evidence page.

## 6. Titles and modules

Use a stable content-page title system: small blue marker, section/page number, takeaway-oriented title, authentic/default logo at upper right, and a 2 px blue rule.

Use lead statements for the core question or judgment. Use a pale fill, left rule, or arrow marker—not a web alert box.

Prefer compact deep-blue module headings with white text, shared table-like edges, or thin-rule sections. Use separate bordered cards only when the evidence units are genuinely comparable and independent.

Use a takeaway only when it adds an implication. Phrase it as a conclusion, boundary, or design consequence.

`ClaimBand`, `DenseSharedPanel`, `DominantFigure`, `FlowDiagram`, `EquationValidationPair`, and `BottomConclusionBand` are reusable primitives, not mandatory decorations. A page may omit a lead or conclusion band when the title and evidence already provide the reading path. Do not render a lead and takeaway that repeat the title or each other.

## 7. Scientific figures and image geometry

Before implementation, record for every key image:

- pixel dimensions and aspect ratio;
- scientific claim;
- axes, legends, annotations, subfigure labels, and scale bars that must remain visible;
- whether a crop is scientifically harmless;
- target container ratio and minimum readable display size.

Rules:

- Default scientific figures to `object-fit: contain`.
- Never force both width and height in a way that changes the image aspect ratio.
- Use `cover` only with an explicit crop-safe declaration and a verified harmless crop.
- When isolating a subfigure, preserve its complete panel and aspect ratio; do not stretch the parent image into a narrow viewport.
- Reject a layout when the image occupies a small fraction of its frame or key labels become unreadable.
- Preserve one caption per figure and state the comparison or claim.
- Add zoom when the figure cannot remain legible at normal scale.
- Use authentic images or exact reconstructions for specific real objects; do not invent plausible-looking geometry.

## 8. Charts, tables, and formulas

### Charts

- Use [scientific-evidence-visualization.md](scientific-evidence-visualization.md) as the sole decision policy for Type A reconstruction, fidelity gates, safe fallback, interaction, and print state. This file defines appearance only.
- Use direct labels where possible, blue for main series, and dark red for the critical series.
- Show axes, units, sample size, uncertainty, significance, and confidence intervals when relevant.
- Avoid 3D charts, rainbow palettes, decorative gauges, and unexplained truncated axes.
- Annotate one to three decisive values.
- Keep the default state aligned with the slide's claim, and never use interaction to hide a required control group or silently change a scale or calculation.
- Apply the selected bundled chart theme rather than the ECharts default theme. Use consistent axes, grids, typography, tooltip, legend, comparison baselines, annotation/reference lines, units, sample sizes, and precision. In `academic-light`, deep blue carries structure and the primary series and dark red is reserved for a decisive value, risk, or conclusion. In `tech-engineering-dark`, cyan carries structure, warm gold marks decisive values, and muted red is reserved for risk or contradiction; supporting series use lower saturation and opacity.
- Use common scales for comparisons and directly label one to three decisive values. A chart title states the finding—for example, which occupations lead a risk ranking—rather than repeating only a variable name.

### Tables

- Use deep-blue headers with white text and white/pale alternating rows.
- Left-align text; right- or decimal-align numbers; put units in headers.
- Keep cells within three lines and default to at most five rows by four columns.
- Highlight only cells that change interpretation.

### Formulas

- Render equations as MathML, KaTeX, or equivalent scalable mathematical text.
- Use only three visual levels on a slide: primary formula, supporting formula, and annotation.
- Keep formulas of the same role at the same size; do not enlarge short formulas merely to fill space.
- Align step labels, equation fields, equals signs where practical, and variable notes.
- Show one primary formula per slide; move lengthy derivations to backup or zoom layers.
- If an English research title is shown, translate the complete title or omit it.

## 9. Cover, agenda, synthesis, and closing

### Cover

Use this cover on every deck. Keep the title dominant. `academic-light` keeps the current white/pale structure with a deep-blue central band. `tech-engineering-dark` may use a layered navy field and restrained cyan/gold rulework while retaining the same formal identity, metadata, title geometry, and L01 role. Cover metadata is adaptive: display only presenter, team, unit, project, course, advisor, date, report type, topic, stage, material range, or other real fields supplied by the user/materials; omit absent fields and use fewer metadata items rather than adding blank labels or “not provided/identity cannot be verified” placeholders. Never invent a personal name or require presenter-plus-unit as a fixed pair.

### Agenda

Make chapter structure the whole composition. Do not force standard content chrome onto it.

### Synthesis

Use a regular evidence-bearing content page. Answer the opening problem through key findings, boundaries, implications, and limitations.

### Closing

Place it after synthesis when the selected profile requires a separate closing. Pair it visually with the mandatory cover. Include the discussion invitation and available research title, presenter, unit, and date. Include an authentic logo only when branding is enabled; otherwise omit the logo and brand-only row. It may be visually simple but must not replace the substantive conclusion. Follow [presentation-profiles.md](presentation-profiles.md) for the explicit combined conference-talk exception.

## 10. Brand handoff

Apply the identity decision and replacement rules in [branding.md](branding.md). For enabled logos, preserve the selected profile's visual placement contract: balanced prominence and clear space on the mandatory cover and closing, plus a stable, clearly legible institutional lockup in the upper-right title area on content pages. “Modest” means visually subordinate to the slide title, not small or annotation-like. Evaluate the visible non-transparent artwork rather than the CSS image box, and enforce the visible-size ranges in the branding contract.

An explicitly requested, verified brand-asset update may change authentic identity assets and necessary official color constraints. It must not change the fixed canvas, formal cover grammar, academic density, evidence hierarchy, or relationship-driven layout system. New projects remain unbranded unless the user requests a logo; any reporting institution is supported.

## 11. AI-template rejection

Reject:

- repeated three/four equal-card pages;
- equal module sizes despite unequal evidence weight;
- generic numbered circles and icon flows used instead of research evidence;
- tiny figures paired with oversized KPI numbers;
- decorative arrows, circuits, brains, laboratory stock photos, or unrelated imagery;
- simultaneously empty and overcrowded regions;
- three consecutive `left figure + right card stack` pages without experimental necessity;
- small screenshots used to imply workload;
- black neon, glassmorphism, particles, strong glow, lens flares, 3D card motion, dashboards, permanent sidebars, and promotional poster composition;
- full red paragraphs, rainbow palettes, heavy grids, internal scrolling, and content outside the slide.

## 12. Selected chart theme and motion appearance

Use restrained 300–600 ms transitions only when they make reading order or state change clearer: baseline bar entrance, time-ordered line draw, scatter fade with slight translation, or smooth highlight/evidence-panel update. Keep axis domains, formulas, values, and comparison groups fixed through motion. Avoid bounce, loops, 3D transforms, particles, glow, and motion that carries information unavailable in the settled frame.

The reduced-motion state removes transitions while preserving all labels, annotations, controls, and conclusions. Print applies a complete declared state with controls removed and SVG/Canvas/HTML rendering stable. These are appearance rules; Type A scientific fidelity and reconstruction decisions remain solely in [scientific-evidence-visualization.md](scientific-evidence-visualization.md).

## 13. Dataset scroll-report visual handoff

Sections 1–12 remain the shared visual policy for every `slide-deck`. An explicit standalone-dataset `scroll-report` reuses the selected style's color, typography, evidence hierarchy, chart theme, image-fidelity, emphasis, motion, and AI-template rejection rules, but not the fixed slide canvas or L01–L24 compositions. Its navigation, reading column, section rhythm, responsive behavior, and report print are defined only in [dataset-scroll-report.md](dataset-scroll-report.md). Do not reinterpret the report's left chapter navigation as permission for a dashboard sidebar, KPI wall, permanent filter panel, or generic website theme.

The report reads as one continuous document: content-driven section height, restrained separators, shared background/surface, and explanations adjacent to their figures. Avoid viewport-height section minimums, repeated outer card shadows, or large vertical gaps that make sections look like stacked slides. Detailed thresholds and browser QA remain in [dataset-scroll-report.md](dataset-scroll-report.md) and [interaction-and-qa.md](interaction-and-qa.md).
