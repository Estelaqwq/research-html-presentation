
# Visual style contract

## Academic light V2

`academic-light` now means the cobalt high-density academic board, not the former gray-teal report skin. Use saturated cobalt for structure, deep blue for titles, pale blue-gray evidence stages, white primary surfaces, and restrained red emphasis. Keep headings compact and evidence visually dominant. Container geometry must vary across the deck; complete rectangles are one option, not the default primitive. Reference images calibrate saturation, hierarchy, density, and rhythm only—never copy their brand assets or subject matter.

This change is represented internally by optional `designSystemVersion: 2`. Omitted means legacy-readable. The only valid visual-style values remain `academic-light` and `tech-engineering-dark`; no green style is permitted.

This reference defines the two supported visual skins for the shared research presentation core. It changes appearance only. Content analysis, evidence provenance, narrative units, layout IDs, runtime behavior, authoring, print/PDF, and QA remain governed by their existing references.

## 1. Style selection and compatibility

The manifest may declare:

```json
{
  "visualStyle": "academic-light"
}
```

Allowed values are:

- `academic-light`: the established blue-white compact academic style;
- `tech-engineering-dark`: a saturated sapphire-blue research board with white/ice-blue titles, cyan structure and scarce pale-yellow emphasis.

If the field is absent, resolve it to `academic-light`. Existing manifests are not rewritten or migrated solely to add this field. A selected style is fixed for the prototype and then propagated to the complete artifact. Explicit user choice takes precedence over the default.

## 2. Shared visual invariants

Both styles MUST preserve:

- the selected branding mode and, when enabled, locked official brand geometry;
- the fixed `1600 × 900` deck canvas, or the existing content-driven scroll-report contract;
- the L01–L24 relationship-driven layout system and its selection/veto rules;
- evidence-sized composition, readable body text, and the occupancy/title geometry gates;
- Type A/B/C fidelity, L0–L3 treatment, claim links, citations, captions, units, uncertainty, and source safety;
- one Shared Evidence Core, one chart data source, one Citation Registry, and one `NarrativeUnit` mapping;
- the same DeckRuntime, ReportRuntime, Presenter View, Authoring boundary, interaction, reduced-motion, deterministic print, and PDF behavior;
- the same scientific image aspect-ratio, crop, annotation, readiness, and accessibility rules;
- a restrained formal research tone rather than a dashboard, product page, game interface, or promotional poster.

Theme changes MUST NOT be used to hide evidence, change a chart domain, alter a comparison baseline, remove a required control group, or make a hypothesis look like a result.

## 3. `academic-light`

This is the compatibility/default skin name, but new projects render design system V2. Replace the former gray-teal palette and flat report geometry with the authoritative cobalt tokens, compact header, expanded body field, varied BodySilhouette set, shared/open boundaries, notched labels, ribbons, arrow stages, pale inset evidence fields, dashed research boundaries, restrained depth, and selective conclusion bands defined in [design-system.md](design-system.md). Do not preserve the former flat module silhouettes as the default for newly scaffolded work.

Legacy projects that omit `designSystemVersion` remain readable without a forced manifest migration. That compatibility rule does not authorize a new project to fall back to the old palette or repeated complete rectangles. Keep white as the main surface, cobalt as structure, dark blue as heading ink, and restrained red as the only decisive accent; never introduce a green variant.

## 4. `tech-engineering-dark`

This style uses saturated sapphire/royal-blue depth, white-to-ice-blue principal titles, electric-blue/cyan structure, cool-white copy, and scarce pale-yellow accents. It is not a gray-teal page with gold headings. Read [tech-blue-reference-calibration.md](tech-blue-reference-calibration.md) when creating or substantially revising this style; its confirmed 16:9 section and ten-page source example consolidate the user-approved 2026-10-18 direction. For this personal skill, prefer the supplied 汉仪尚巍手书W title face and the confirmed upright poster composition; do not repeat font selection unless the user requests a change or the actual title lacks glyph coverage.

Use the semantic tokens in `assets/react-template/visual-styles/tech-engineering-dark.css` and `chart-adapters/academic-theme.ts` as the implementation source of truth:

- page depth `#031044`, sapphire surfaces `#08246e` / `#083c9a`;
- electric blue `#087aec`, cyan structural light `#51dfff`;
- principal title gradient white → ice blue; primary copy `#f5fbff`, supporting copy `#d4e8ff`;
- pale-yellow accents `#ffe393` / `#ffd568`, only for a short emphasis or decisive annotation;
- red remains a semantic risk/contradiction color.

### Composition

- Make the title and evidence/object the strongest forms. Prefer a thin outer boundary with a small corner radius; the old mandatory 40px rounded engineering frame is superseded. No nested bevels around every region.
- Use local blue depth and foreground/background contrast. Keep subtle linework near margins, transitions or object platforms; never apply an equally bright full-page grid.
- Content titles are white/ice blue, module headings cool white. Avoid metallic bronze gradients, thick outline/emboss effects, gold main titles by default, gold-filled chapter rails and gold buttons. A user-requested short gold calligraphic accent can complement a blue-white title without taking over it.
- Use a compact chapter rail derived from the actual sections. Active state is bright blue/cyan with white text; inactive sections are dark blue. The rail must not overlap the title or official brand.
- Give every content page one dominant authentic figure, chart, table or technical structure. Surround it with aligned, subordinate explanations and shared/open boundaries. Do not substitute an anonymous CORE ring for available substantive material.
- For reference-led 16:9 technology boards, use contours by information role: a short slanted/notched ribbon for section labels, capsules for compact inputs, one cut-corner emphasis region, open bracket edges for supporting copy, chevrons for an output, and a shared translucent perspective shelf for related evidence. Choose the forms the material needs; do not apply the same corner cut to every box or force every paragraph into a rectangle. Keep meaningful image/text overlap or floating labels clear of evidence, units and captions.
- Flow diagrams use actual nodes/edges and arrow direction from FlowSpec, compact blue nodes, and selective accent. Size/occupancy/label rules still apply; decoration cannot stand in for a relationship.
- A cover can pair a dominant editable blue-white title at left with a smaller technical subject at lower right. Compare actual painted subject bounds rather than the image canvas (which may contain background/copy space). The title should win the first glance; a tall device must not automatically fill the slide height. Compare actual letterforms before adjusting scale. Distinctive reference lettering does not automatically mean calligraphy: compare engineered/angular, compact sans and brush candidates in the same cover when the match is unclear. A measured fixture size is not a universal size requirement; reuse the confirmed face for this user’s technology decks and optically adapt to the actual words. Use only authentic metadata. For an explicit poster-lettering request, compose the word with glyph-specific scale, baseline, kerning and a localized accent; a uniform-size brush face alone is insufficient. Keep the ordinary body hierarchy and research evidence readable. See the composed-title section of [technology reference calibration](tech-blue-reference-calibration.md).
- Cover concept art is optional: only use it when explicitly appropriate to the subject/user's requested visual treatment, label it as concept illustration, and store its provenance. Never present generated equipment, diagrams, certificates or screenshots as actual project evidence. Do not insert a generic medical/drone device into an unrelated research topic. The included concept device is a style fixture, not default report content.
- Result pages keep evidence larger than interpretation and decoration. Preserve domains, baselines, uncertainty, captions and underlying data. A selected gold annotation need not turn the full decisive series gold.
- Pair cover/closing within L01/L24, respecting brand geometry and actual content. Do not force decoration or a device where material does not support it.

### Reference-calibration failure checks

Compare actual browser renders with every supplied reference before propagation. Evaluate title geometry, body silhouette, dominant visual, image/text ratio, shared-edge behavior, accent policy and prohibited traits. Save a visible before/reference/after contact sheet and record observations, not only a checklist.

Reject gray-green/teal backgrounds as the main field, mustard/copper hierarchy, all-gold title/tab/button systems, heavy rounded app frames, repeating equal cards and decorative center rings. Also reject a sparse cover copied unchanged onto every content page. Borrow color, hierarchy, density and spatial organization; never copy reference identities, awards, commercial claims or subject matter.

The three-page `examples/tech-blue-reference-prototype` is a design-comparison fixture. Its source screenshots are evidence about **visual design**, and its generated cover image is explicitly conceptual. Do not copy its topic or its device into a real research report.

### Shared semantic hooks

Prefer the existing DOM. When CSS cannot infer the intended role safely, use only these presentational hooks:

- `data-visual-role="title-band"`
- `data-visual-role="section-rail"`
- `data-visual-role="lead-band"`
- `data-visual-role="tech-panel"`
- `data-visual-role="metric-strip"`
- `data-visual-role="process-rail"`
- `data-visual-role="evidence-stage"`
- `data-visual-role="gold-label"`
- `data-visual-role="conclusion-band"`
- `data-visual-role="brand-plate"`

The optional presentational `data-tech-shape` values are `ribbon`, `capsule`, `ticket`, `notched`, `open-bracket`, `chevron`, and `shelf`; their `.tech-*` classes are supplied by the scoped skin. Keep scientific images contained inside unclipped inner wrappers.

These hooks never carry claims, calculations, layout IDs, navigation state, or authoring authority. `academic-light` does not style them. Do not create dark copies of SlidePrimitives, evidence components, L01–L24, or either runtime.

### Charts and evidence

- Use a dark plotting surface with low-contrast cyan gridlines and clear cool-white labels.
- Use cyan for structure/primary series, muted blue-gray for supporting series, pale yellow for a selective decisive annotation, and muted red only for risks or contradictions.
- Preserve fixed domains, axis units, sample sizes, uncertainty, baseline lines, precision, annotations, and accessible summaries.
- Tooltips use opaque navy surfaces for reliable reading. Ordinary explanatory panels may use translucent blue fills when the references call for them; keep text fully opaque, test contrast over the actual background, and preserve unfiltered scientific-image pixels. Transparency expresses layering; it cannot replace hierarchy.
- Print uses the same selected dark chart theme and declared print state; it is not a separate light PDF skin.

### Brand handling

Unbranded projects do not render a logo or brand plate in either visual style. For the explicitly selected ZUEL profile, follow [zuel-branding.md](zuel-branding.md), including its optional dark-style monochrome treatment; preserve the source asset, alpha, clear space, aspect ratio, and painted-size requirements. Brand treatment does not activate automatically when selecting `tech-engineering-dark`.

### Prohibited drift

`tech-engineering-dark` MUST NOT introduce black-neon effects, full-page bloom, particles, lens flares, SaaS frosted-card composition, extruded 3D cards, random motion, game controls, or commercial KPI-wall composition. Local cyan platform/edge light is subordinate to the evidence or cover subject. Generated art follows the narrowly labelled cover-concept rule above and never replaces scientific evidence. Keep texture, linework and animation deterministic in print/reduced-motion states.

## 5. Implementation handoff

The renderer sets a stable `data-visual-style` marker on the shared runtime root. `academic-light` uses the existing base CSS; `tech-engineering-dark` is a separately scoped override loaded after the shared base and evidence styles. Report styles use the same marker while preserving their own content-driven layout contract.

Do not satisfy this contract by writing `academic-light` directly into a runtime, Presenter, print renderer, or Golden fixture. Resolve `manifest.visualStyle` once, pass that resolved value through audience, Presenter, and print/report roots, and use the fallback only when the field is absent. Golden regression must exercise an explicit light choice, an explicit dark choice, and a legacy omitted value for both deck and report paths; each live root and `document.documentElement.dataset.visualStyle` must equal the resolved manifest value.

Chart components consume the selected semantic chart palette through the local chart adapter. They do not duplicate chart data, calculate a second analysis, or embed a renderer-specific theme decision in page content.

Visual QA checks the selected style in audience, Presenter preview, reduced motion, and print. Academic-light regression is required whenever the base stylesheet or shared component imports change.
