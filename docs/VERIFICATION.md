# Initial publication checks

Checked locally on Windows with Node.js 24 and the existing local build dependencies on 2026-10-20:

- Skill frontmatter and package validation: passed.
- Shared skill consistency: passed without warnings.
- Branding defaults and explicit ZUEL selection: 132 checks passed.
- General vertical-report contracts: passed.
- Scientific-chart numeric behavior: passed, including missing versus zero, numeric/rank orientation, palettes, interval/log geometry, incomplete pairs and residual integrity.
- Optional display font: both system fallback and a supplied local WOFF path passed. The supplied font was used only for the local test and is not in the repository.
- New unbranded technology deck: TypeScript check and Vite production build passed without a proprietary font.
- Documentation: linked local assets exist; 38 existing screenshots are included. The local gallery previously passed desktop/mobile, image loading, lightbox, keyboard and long-image checks.
- Publication files were checked for personal absolute paths, embedded font payloads and credential patterns; none were found.

These checks describe implementation behavior. They do not certify the scientific conclusions of a future presentation, cross-platform compatibility, or rights to third-party assets. Example screenshots retain the original project context and attribution.
