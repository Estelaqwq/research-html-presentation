# Initial publication checks

Checked locally on Windows with Node.js 24 and the existing local build dependencies on 2026-10-20:

- Skill frontmatter and package validation: passed.
- Shared skill consistency: passed without warnings.
- Branding defaults and explicit ZUEL selection: 132 checks passed.
- General vertical-report contracts: passed.
- Scientific-chart numeric behavior: passed, including missing versus zero, numeric/rank orientation, palettes, interval/log geometry, incomplete pairs and residual integrity.
- Optional display font: both system fallback and a supplied local WOFF path passed. The supplied font was used only for the local test and is not in the repository.
- New unbranded technology deck: TypeScript check and Vite production build passed without a proprietary font.
- Documentation: the initial gallery passed desktop/mobile, image loading, lightbox, keyboard and long-image checks. See the showcase update checks below for the current assets.
- Publication files were checked for personal absolute paths, embedded font payloads and credential patterns; none were found.

These checks describe implementation behavior. They do not certify the scientific conclusions of a future presentation, cross-platform compatibility, or rights to third-party assets. Example screenshots retain the original project context and attribution.

## Showcase update checks (2026-10-20)

- Default blue-and-white economy deck comes first; selected pages are P1, P2, P3 and P10. NHL literature-review highlights follow in the order P1, P6, P5. The dark technology deck follows with P1, P4 and P6.
- Complete contact sheets contain 12 economy pages and 10 technology pages. The NHL review has no contact sheet.
- The Titanic prediction report was captured from its existing eleven-section build: opening, a live tooltip on the false-negative cell (83 passengers), and expanded chapter navigation.
- The complete seven-section World Bank report was captured with a real registered-question answer and an expanded analysis flow. The screenshot accurately shows the disconnected model-service state; the answer still uses registered aggregate evidence.
- Both READMEs display 18 images and link to three complete deck PDFs. All 107 local Markdown references were checked, including gallery anchors.
- The gallery displays 33 slide screenshots and five report/tool screenshots, plus a separate Presenter View. Together with the two contact sheets there are 41 PNG assets. Image/PDF hashes agree with `gallery.json`.
- Desktop and 390-pixel mobile checks passed, without horizontal overflow or browser errors. Gallery image decoding, lightbox navigation, arrow keys and Escape passed.
- PDF page counts: economy 12, NHL 11, technology 10. The first two preserve the existing exports; the technology preview contains rasterized pages without an embedded font program. Representative pages were rendered with Poppler and visually inspected.
- No skill-generation logic changed in this update. Previous core validation results above were not rerun for these documentation changes.
