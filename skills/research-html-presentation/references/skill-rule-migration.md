# SKILL.md rule migration record

## Academic-light V2 upgrade

The former flat gray-teal light treatment is replaced in place by `academic-light` design system version 2. Palette/depth/title geometry live in `presentation-core.css`; real body silhouettes and mixed containers live in `layout-recipes.css` and `SlidePrimitives.tsx`; analytical chart forms and typography live in `dataset-charts/` and `chart-adapters/academic-theme.ts`; flow layouts live in `FlowDiagram.tsx` and `flow-spec.schema.json`; copy, chart-semantic, and browser-authoritative quality gates live in `validate_audience_copy.mjs`, `validate_evidence_visuals.mjs`, `audit_layout.mjs`, and `validate_quality_contract.mjs`. Legacy manifests without `designSystemVersion` remain readable. `tech-engineering-dark`, both output modes, Presenter, Authoring, evidence fidelity, citations, and privacy rules are unchanged.

This record documents the 2026 contract refactor. It is traceability metadata, not a second policy source. “Preserved” means the destination retains an equal or stronger MUST/prohibition; the authoritative detail lives only at the destination.

| Former main-file location | Unique destination | Constraint |
|---|---|---|
| Applicability opening and brand identity paragraphs | `SKILL.md` applicability + `branding.md` §§1–3 | Updated by the user-authorized optional-branding change: public scope supports all reporting institutions; ZUEL-specific rules live in `zuel-branding.md` and activate only on request. |
| “Load the right resources” | `SKILL.md` reference routing | Preserved; routes each phase to a complete reference. |
| Deck Presentation Contract | `SKILL.md` common/deck contracts; `design-system.md`; `layout-selection.md`; `interaction-and-qa.md` | Preserved: cover, 1600×900, one-page runtime, density, evidence and controls remain mandatory. |
| Reusable asset inventory | `implementation-contract.md` §1 | Preserved; main file now names assets only where routing or invariants require them. |
| Project variables | `implementation-contract.md` §6 + `branding.md` | Reporting metadata remains factual; new projects are unbranded by default and existing projects retain their selected identity. |
| Brief/profile questions | `content-architecture.md` §1 + `presentation-profiles.md` §1 | Preserved. |
| Universal Output Form Choice and exact user question | `SKILL.md` output-mode Gate | Updated by explicit user request: ask all new reporting tasks when form is unresolved; user-selected form precedes content routing. Embedded-table analysis exclusion and omitted-mode compatibility retained. |
| Dataset Task Intent, Analysis Mode, Coverage, Preparation, Finding, Model, Model Search, Content Utility, Audience Copy gates | `dataset-analysis-and-storytelling.md` + `evidence-visualization-schema.md` | Preserved; main file retains the required ordered route and v3/legacy boundary. |
| Material inventory and evidence statuses | `evidence-policy.md` + `content-architecture.md` | Preserved. |
| Claim map, narrative priority and compression | `narrative-compression.md` + `content-architecture.md` | Preserved. |
| Built-in visual tokens/density rules | `design-system.md` | Preserved; no visual redesign. |
| Brand contract and replacement language | `branding.md` | Common selection/persistence stays in `branding.md`; optional ZUEL asset and geometry rules move to `zuel-branding.md`. Active official brand content remains editor-locked. |
| Layout selection vetoes and L01–L24 mapping | `layout-selection.md` | Preserved; main file retains the L01–L24 prohibition against redesign. |
| Three-page/section prototype details and approval pause | `prototype-review.md` | Preserved, including uninterrupted-generation exception and internal review requirement. |
| Scientific evidence composition, Type A/B/C, L0–L3, images, formulas, tables and runtime hooks | `scientific-evidence-visualization.md`, `evidence-visualization-schema.md`, `implementation-contract.md` | Preserved. |
| Shared Evidence Core Inheritance Gate | `implementation-contract.md` §10 + `SKILL.md` common contract | Preserved. |
| Deck key map, Presenter synchronization and notes details | `presenter-view.md` + `interaction-and-qa.md` §§1–2,8 | Preserved; main file retains runtime feature invariants. |
| Scroll Report Runtime Gate | `dataset-scroll-report.md` + `interaction-and-qa.md` §11 | Preserved; main file retains dataset-specific analysis features while admitting explicit general scrolling reports and forbidden deck features. |
| Local Authoring Gate (default-on for new scaffolds) | `lightweight-editing.md` | Strengthened to all-page ordinary-text/image discovery, stable targets, collapsed E workspace, non-blocking local text save, browser-local fallback, evidence-review separation, safe uploads, and print/Presenter/PDF exclusion. |
| Per-script validation command lists | `verify_project.mjs` orchestration + `interaction-and-qa.md` release sequence | Preserved through one mode-aware entry; independent validators keep their responsibilities. |
| Two-pass visual inspection and dataset chart QA | `interaction-and-qa.md` §§4–5,10–12 | Preserved. |
| PDF readiness, export and validation detail | `pdf-export.md` | Preserved; deck-only boundary made explicit. |
| Final delivery checklist | `SKILL.md` delivery + `interaction-and-qa.md` release sequence | Preserved. |

The user-authorized optional-branding change replaces the former ZUEL-only applicability and default. ZUEL authenticity and geometry rules remain in `zuel-branding.md` for enabled projects. Shared blocking validation, mode boundaries, evidence integrity, prototype approval, and visual QA remain in force; unbranded output has its own absence checks.
