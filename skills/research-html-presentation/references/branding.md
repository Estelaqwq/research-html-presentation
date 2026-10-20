# Branding selection and persistence

## Default and explicit selection

This Skill supports academic reporting subjects from any institution and unaffiliated subjects. New projects default to `branding: { "profile": "none" }`. Render no institutional logo, invented institution, empty brand-only header, or reserved logo placeholder. Formal covers, conclusions, closing pages, research styles, evidence rules, and runtime QA remain required.

Enable `branding.profile: "zuel"` only after an affirmative request such as “加上中南财校标”, “使用中南财经政法大学校徽”, or “add the ZUEL logo”. Read [zuel-branding.md](zuel-branding.md) only for that selection or an existing ZUEL-branded project. “不要加中南财校标” and “不加任何校标” disable branding. A university affiliation, cited paper, dataset publisher, visual reference, or Skill invocation alone does not activate any logo. Do not ask about branding when the user has made no logo request; use the unbranded default.

The bundled automatic profiles are `none` and `zuel`. Reporting subjects from other institutions remain in scope and use the unbranded mode. This version provides the bundled ZUEL opt-in only; do not invent another scaffold profile or substitute the ZUEL logo for another institution. Never invent affiliations or a replacement logo. Ask only when a requested logo materially conflicts with the declared reporting identity.

## One Skill, one project choice

The shared research workflow, layout system, two visual styles, editing, evidence core, and QA have one implementation. Brand selection does not fork any of them. Use `scaffold_project.mjs --branding none` by default; use `--branding zuel` only for the explicit request. The selected logo configuration is stored under `manifest.branding.logo`, and the selected asset is copied into the generated project. Neither browser rendering nor offline export may depend on the installed Skill's asset path.

For revision, the current explicit user request takes precedence, followed by the existing project's saved branding; the unbranded default applies to new projects. An omitted branding field in an existing manifest means preserve its actual identity, assets, and markup, not silently migrate it. Do not overwrite completed projects or regenerate them to change branding. A requested logo removal also removes stale brand-only containers, institutional brand text, metadata/preview assets when present, and stale copied logo files; ordinary factual affiliations in content remain factual content.

## Rendering and validation

- `none`: no logo is required. Omit brand-only image/header/wrapper nodes entirely instead of hiding them; do not leave a logo gap or missing-image request. Check the audience, Presenter, report/deck print, and offline output for unintended branding. Formal cover and closing structure stay intact.
- `zuel`: read the optional reference and preserve its authentic asset, editor lock, aspect ratio, clear space, painted size, role-specific placement, and identity checks. Geometry measurements use visible artwork, not transparent image margins.
- Active official identity regions are editor-locked; normal audience copy remains editable. Do not fabricate missing presenter/unit metadata or infer it from citations.
- Run BrandGeometryAudit for active logos. Explicit `none` must reject rendered brand nodes; explicit `zuel` must reject missing role logos and missing or broken logo assets. Legacy projects without the branding field retain their current checks and are never migrated automatically.
- Changing a logo does not change the fixed deck canvas, report behavior, evidence hierarchy, layout family, visual style, data, or analysis. Both branded and unbranded paths share the same runtime and release workflow.
