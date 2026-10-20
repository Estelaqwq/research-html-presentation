# Sapphire technology reference calibration

Use this guide only for `tech-engineering-dark`, especially after a user supplies visual references or rejects the style. The fixed 1600×900 canvas, the selected branding mode, evidence fidelity, editing and shared runtime remain in force.

## Confirmed 16:9 direction for this personal skill

The user approved the refined cover and explicitly requested the remaining pages on 2026-10-18. Reuse this direction for their `tech-engineering-dark` 16:9 work; do not reopen font selection or show uniform font specimens when this choice is already known. Other styles, ordinary body text and existing projects are unchanged.

- **Display face:** user-supplied **汉仪尚巍手书W**, original `HYShangWeiShouShuW.ttf`, CSS alias `BrushShangwei`. The public package does not contain the proprietary font file. Use the system KaiTi/serif fallback unless the user supplies a licensed full WOFF through `--display-font` or `RESEARCH_HTML_PRESENTATION_FONT`; a privately configured installed copy may retain `assets/typography/shangwei-full.woff`. Its metadata records the original hash and embedding information, not redistribution permission. It is the preferred title role, not a font for paragraphs, tables or chart labels. Do not download a substitute or describe the font as universally redistributable.
- **Composed cover lettering:** native text with glyph-specific scale, baseline and optical spacing. Keep all characters upright and in reading order; let the font's brush movement provide energy. Use white/ice-blue principal lettering and one localized pale-gold emphasis. Increase the whole title mass and move it upward when necessary to fill the intended upper-left footprint, while preserving complete strokes and brand clearance. Exact pixel coordinates from the example are not a recipe for different words.
- **Supporting group:** keep the secondary phrase horizontal and unrotated; align its left ink edge with the descriptor below and use close spacing so the two lines read as a group. In the approved example, “让证据更清晰” is 48px and the descriptor 26px; adapt optically to real copy.
- **Complete callout:** the approved “证据有出处，结论有依据” uses an unbroken translucent blue bar with opaque foreground copy. Remove the ticket notch from this particular callout: it looked like a missing piece. Other deliberate irregular contours remain available when they read clearly.
- **Content pages:** vary silhouettes and information-role contours across the complete deck: capsules for inputs, ribbons for labels, an occasional cut-corner focus, open brackets for support, chevrons for outputs and shared translucent shelves for related interpretations. A chart/table/photo can retain its natural rectangle. Do not place all content in equal boxes or use the same layout after recoloring.
- **Hierarchy and delivery:** body copy remains clear sans serif, with selective bold for core judgments and their conditions. Preserve the selected identity when enabled, evidence provenance, shared DeckRuntime, Presenter, editing and offline portability. The conceptual device is limited to this design fixture and is not a universal research cover asset.

When a licensed font has been configured, the scaffold copies it and the optional `src/PosterTitle.tsx` / `src/poster-title.css` into new technology decks only. Compose the actual cover with that component or an equivalent project-local semantic adapter; it must rebuild glyphs after a whole-word edit and support Save/Reload, Undo/Redo and Reset. The component is not a replacement runtime. The complete source example `examples/tech-confirmed-16x9/` demonstrates varied content roles, with actual font-file measurements and clearly labelled explanatory content. Adapt its structures, never its illustrative topic as research evidence.

## What the 2026-10-18 correction teaches

The old ten-slide showcase was rejected for a gray/teal-blue field, muddy gold hierarchy, thick rounded frames and generic central rings. Eight supplied screenshots favor saturated royal blue, large ice-blue/white titles with short bright-gold accents, a dimensional technical subject and compact evidence zones. This supersedes earlier prescriptions for metallic-gold principal titles, gold active trapezoids and a mandatory large rounded outer frame.

| Role | Preferred treatment | Failure to catch |
|---|---|---|
| Main title | White → ice blue, strong scale | Bronze/mustard headings, heavy emboss |
| Primary field | Deep sapphire with electric-blue depth | Uniform gray-teal navy |
| Cover focus | Real subject, or clearly labelled appropriate concept | Generic CORE ring, irrelevant stock device |
| Content focus | Authentic plot/figure/table/structure | Decoration larger than evidence |
| Structure | Fine rules, shared edges, compact blue rail | Nested frames and identical boxed modules |
| Accent | Short pale-yellow phrase or decisive annotation | Every title, number, rail and button gold |

## Shape, transparency and cover-weight correction

The next review rejected the first sapphire iteration: recoloring had left a regular rectangular layout, the device was too large, and left-hand text was subordinate. Two clearer references showed clipped ribbons, capsule labels, open brackets, notched regions and translucent shared platforms. Read these as one coordinated visual language, not a request to sprinkle random polygons across a grid.

- Map contour to role. Inputs can be capsules, a central emphasis a notched surface, an output a chevron, and related interpretations one shared perspective shelf. A chart/photo naturally remains rectangular; shape its label or surrounding support without cutting evidence pixels.
- Vary closure and area, not only corner radius. Mix closed pills, a strong central region, unclosed corner strokes and one translucent background plane. Avoid the same grid with a different border on every cell. At reading scale, a clipped corner should read as deliberate; use a continuous surface when a small notch looks like a broken edge.
- Put transparency in the fill with `rgba()` or a transparent gradient. Keep the foreground at full opacity. Avoid whole-panel opacity, background blur over data and broad bright bloom.
- Keep large type editable in HTML. Calibrate the title against **painted subject bounds**, not the full hero-image box. Judge the letterform and optical scale together. A later review rejected the enlarged default-looking title, then rejected a brush candidate too. References can mix engineered lettering with calligraphic accents; neither a larger system face nor any arbitrary brush font is an adequate match. Compare actual cover variants before settling the title face; no fixture size or candidate becomes a universal recipe.
- Inspect dense content as well as the cover. A three-page fixture made only of reference screenshots cannot prove irregular content composition. The current fixture includes an actual seven-node explanatory relationship map derived from one FlowSpec, plus a shared translucent interpretation surface.

## Typography is a separate reference decision

- Inspect the title's actual letterform: brush movement, condensed/geometric construction, weight, spacing and accent contrast. Do not substitute a larger system sans-serif for a distinctive reference face. Keep ordinary body text readable and avoid applying display calligraphy to dense content.
- When the user supplies PPT font files, inspect those exact files first; otherwise inventory installed fonts before downloading more. Read font family/style names and check cmap coverage of the actual Chinese text; a suggestive file name can contain only a logo or a handful of glyphs. For a brush/flowing request, compare stroke taper, connected movement and long finishing strokes rather than relying on a "brush" label. Compare candidates in the real cover at the same optical scale.
- Use project-local `@font-face` for the chosen title role, preserving editable HTML text. Use the font's real weight rather than synthetic bold/italic unless the reference calls for it. Balance painted glyphs against the subject and supporting copy; "more prominent" does not mean "as large as possible".
- Local CSS font names alone do not travel to another computer/tablet. Package permitted font files with the project and embed their bytes in single-file offline exports. Preserve provenance and respect embedding restrictions; font metadata is not a substitute for a license. Do not install or download extra fonts when existing suitable ones suffice.
- Editable headlines need glyphs beyond the initial wording. Prefer a suitable full font for this role; honor a no-subsetting flag during format conversion. If permitted subsetting is necessary, provide adequate Chinese coverage/fallback and test a changed headline. Do not promise arbitrary future text coverage for a tiny current-text subset.
- Wait for `document.fonts.ready` before screenshots and print. Check the browser's actual rendered font, not just the declared CSS family. Verify the offline file with networking disabled and inspect both full-size and thumbnail hierarchy. Record unresolved fallback or missing glyphs instead of claiming the custom font is working.

## Compose a poster-style cover title when requested

When a user asks for poster lettering, first study the **whole word silhouette**: which glyphs establish the outer shape, which smaller glyph nestles between them, and how strokes lead into the next glyph. A uniform font specimen is useful for selecting a face; it does not demonstrate this composition.

- Assign roles before moving letters: anchor glyphs, one emphasis, and a smaller linking glyph. Vary size and baseline to form a continuous mass with deliberate internal whitespace. A composed title can stay upright: rotation is optional and must follow the reference or user preference. For the current confirmed direction, keep the handwriting glyphs and secondary phrase unrotated. Avoid the same large/small pattern on every future title.
- Kern against the actual ink of each supplied font. Allow selected stroke overlap while keeping the character's counterforms and reading order clear. Different fonts need an optical check; copying the same numeric coordinates is not proof that both work.
- Apply white/ice-blue fills and a short gold emphasis inside the word. Use slight edge depth and a localized highlight where appropriate. Let natural brush finishes carry movement; do not add a broad ornamental underline that divides the composition into rows.
- Integrate a secondary phrase into the title's lower whitespace at a smaller scale. Give the whole title object a controlled footprint beside the subject. Two isolated, evenly spaced calligraphic rows do not satisfy a request for a composed title. For supporting copy that reads as one unit, use a common optical alignment and deliberate proximity; inspect the secondary phrase together with the descriptor underneath.
- Keep a semantic plain-text title and separate styling roles. Rebuild glyph spans from that text after a whole-word edit; a direct text replacement across manually positioned single-character spans can collapse all new text into one span. Keep characters in reading order, provide an accessible title and preserve the full font. Use the existing typed editing Patch contract when integrating this into DeckRuntime; verify the adapter before propagating it. Do not lock ordinary title text or silently turn it into a bitmap to retain the effect.
- Render the actual cover and thumbnail. Check complete long strokes, overlap legibility, title/brand/subject separation, switched fonts, edited strings and offline font use. The density and ordinary body rules remain unchanged.

`examples/tech-poster-title-study/` contains a portable cover study with two user-provided faces, a composed/even-spacing comparison and a text-to-glyph review helper. `poster-title.js` and `poster-title.css` expose the small source example without reading the embedded font bytes in `index.html`. The handwriting face and refined cover composition are **confirmed by the user**; the alternate face and standalone review controls remain comparison tools. This study is not a DeckRuntime replacement or an approval of unseen content pages. Its title is illustrative design copy, not scientific evidence. Reuse the composition approach after adapting it to the actual words and checking the existing authoring adapter.

## Work from references, not a color-name guess

1. Inspect all supplied images at source resolution. Distinguish covers from content pages and montage frames from actual slide frames. Preserve originals.
2. Write a brief comparison of current vs requested: palette, title proportions, dominant subject, density, panel boundaries, and accent allocation. Do not infer research claims from template examples.
3. Build three representative pages. For a **design-review task**, reference anatomy and actual old/new renders are legitimate evidence. For a research report, use its real method and result; do not replace them with a discussion of the style system.
4. Render at 1600×900 and inspect full size and thumbnails. Ensure title/rail/brand separation, meaningful lower-half content, readable body type and undistorted figures. Check that UI hints never cover a conclusion.
5. Compare before/reference/after in a saved contact sheet. `referenceCalibration.checked` must include `titleGeometry`, `bodySilhouette`, `dominantVisual`, `imageTextRatio`, `sharedEdgeBehavior`, `accentPolicy`, `prohibitedTraits`. Set status to `reviewed` only after visual inspection.
6. For new undecided work, present the three validated pages and follow [prototype-review.md](prototype-review.md). Reuse an existing choice and explicit rollout authorization; do not ask again when the user has already approved the direction and requested the remaining pages. Record the authorization accurately, and still inspect every completed page.

## Implement without copying a sample topic

- Reuse `assets/react-template/visual-styles/tech-engineering-dark.css` and the dark chart palette. Do not fork DeckRuntime, Presenter or scientific components.
- Use project CSS for a cover's image/title positioning. The reusable skin supplies semantic colors and shared geometry; it cannot manufacture a credible hero from an empty project.
- Crop references only for documented excerpts, preserve parent images, and offer whole-image zoom. Do not crop original scientific figures merely to fit the style.
- Generated concept art is optional and subordinate to actual content. Keep the asset in the project, record generator/prompt/purpose, visibly label the concept, and keep HTML title/copy editable. The fixture's optical instrument is not a universal research icon.
- Keep all series/baselines visible when required; focus controls should explain evidence, not hide an unfavorable comparison. Preserve fixed domains and deterministic print/reduced-motion states.
- Preserve existing browser edits, portable exports, full-HTML downloads and other unrelated skill features during a style revision.

## Regression fixture

`examples/tech-blue-reference-prototype` contains a title-dominant cover, a shape-varied explanatory relationship map and an asymmetric before/after comparison. The map illustrates research-material organization; it does not claim a concrete study result or an implemented automatic analysis service. Its generated hero is **synthetic concept art**, not real equipment or scientific evidence. Its screenshot observations concern visual design only. The older golden fixtures remain compatibility fixtures; do not use their hardcoded gold-heavy project CSS as the current style authority.

Run `scripts/test_tech_blue_style.mjs <built-fixture>` for browser-backed heading/accent/border checks, image readiness, zoom, reduced motion, print, and light/omitted-style isolation. Run `validate_runtime_contract.mjs` separately for menu and Presenter behavior, and `validate_editor_runtime.mjs` for real editing/persistence checks. Also run manifest/evidence/layout checks and inspect the saved renders. If shared imports or base styles change, verify light and omitted-style fallback separately.
