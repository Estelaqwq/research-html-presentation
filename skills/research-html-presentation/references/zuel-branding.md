# Optional ZUEL branding contract

## Contents

1. Explicitly selected ZUEL identity
2. Identity conflicts and trusted asset variations
3. Identity inference boundaries
4. Deck placement and treatment
5. Replacement checklist
6. Brand QA
7. Dataset scroll-report audit roles
8. Optional dark-style treatment

## 1. Explicitly selected ZUEL identity

Read this file only when the user explicitly requests the ZUEL logo or an existing project already uses that treatment. This optional profile does not limit the applicability of the public Skill. New projects otherwise use `branding.profile: "none"` and do not load these rules or the logo.

For `branding.profile: "zuel"`, use the bundled authentic lockup at `assets/branding/zuel-logo.png` and its configuration in `assets/branding/zuel.json`. Copy the asset into the generated project's `public/` directory and record the project-relative logo in the manifest. The user's request activates the visual treatment; do not invent a presenter, department, or institutional affiliation.

## 2. Identity conflicts and trusted asset variations

Do not silently replace an explicitly declared non-ZUEL reporting identity. If a ZUEL-logo request conflicts with that reporting subject, ask one concise question about the intended identity or documented co-branding. A report from another institution remains supported by the shared unbranded workflow.

Within a selected ZUEL treatment, a newer authentic official lockup or documented ZUEL sub-identity may replace the bundled asset through the brand-asset workflow: verify its source, update every project occurrence, preserve a recoverable asset record, and rerun brand geometry QA. Joint-program co-branding requires documented identities. Never silently replace or redraw the bundled logo.

Mark the official logo, full institutional name, and brand-only containers with `data-editor-lock="true"`. They stay outside ordinary text/image replacement; official asset changes use the brand-asset workflow.

## 3. Identity inference boundaries

Paper-author affiliations, references, dataset publishers, photographed venues, research subjects, and institutions mentioned only as context never activate this profile or determine reporting identity. A bare mention of ZUEL or the invocation of this Skill does not activate the logo. Omit missing presenter, team, or unit fields without placeholders. Preserve an existing project's selected identity and logo unless the user requests a change.

## 4. Deck placement, visible size, and treatment

Preserve the established brand geometry on the fixed `1600 × 900` canvas:

- cover: place the complete institutional lockup in the upper-right brand region;
- content pages: place the lockup consistently in the upper-right title area;
- closing: place the lockup in the upper-right brand region and align it with the cover;
- keep the visible painted logo—not merely the `<img>` element box—approximately:
  - cover: 230–270 px wide and 54–64 px high;
  - content pages: 215–250 px wide and 50–60 px high;
  - closing: 220–260 px wide and 52–62 px high.

Judge logo size from the non-transparent visible artwork. Official PNG assets may contain large transparent margins, so a numerically large CSS container can still produce an undersized visible logo.

Cover metadata is adaptive rather than a fixed presenter-plus-unit table. Show presenter, team, unit, project, course, advisor, date, report type, research topic, stage, or material range only when supported by the user or materials; omit absent fields, and use another supported datum or fewer metadata items when presenter/unit are not available. Do not render blank labels or phrases such as “汇报人未提供”“单位信息未提供” or “身份无法验证”.

Before finalizing the deck:

1. inspect the source image dimensions and alpha/non-transparent bounding box;
2. estimate or measure the visible rendered bounds;
3. inspect the cover, one representative content page, and the closing page at `1600 × 900`;
4. adjust the containing box when the visible mark falls outside the target range or appears weaker than the slide title system.

Measure the painted top and right clearances from the logical slide canvas, not from a transparent image box. The mark must stay visibly anchored in the upper-right brand region: approximately 68–140 px from the right and 42–120 px from the top on cover/closing pages, and 68–120 px from the right and 34–92 px from the top on content pages. Cover and closing painted anchors should align within 24 px on both axes unless an explicit supplied template documents another paired geometry. A CSS image box whose painted artwork occupies less than 35% of its area is a warning to resize or reposition the container even when the painted mark itself meets the size range.

Do not crop transparent margins with `object-fit: cover`. Preserve the complete official lockup with `object-fit: contain`, its original aspect ratio, and clear space. Never stretch, shadow, bevel, distort, or arbitrarily recolor an official mark. Do not place it over a noisy image or let it compete with decisive research evidence.

The bundled ZUEL asset is a complete lockup containing the mark and institution names. On the default closing, render that lockup once and do not add a separate “中南财经政法大学”/institution text line beside or above it. Keep `institutionText` optional for backward compatibility and show it only for a verified symbol-only logo or an explicit user request. This does not change the closing painted-bounds range.

Reject a logo when it looks like a footer annotation, is materially smaller than the page-number/title markers, requires close viewing to identify the institution, or exceeds the visible-size upper bounds and competes with the title.

An official ZUEL sub-identity or documented ZUEL co-brand does not permit a switch to commercial, sparse keynote, SaaS, dashboard, neon, glassmorphism, or unrelated visual theme.

## 5. Replacement checklist

When applying an official ZUEL sub-identity or documented ZUEL co-brand, review every project-specific occurrence of:

- institution name and official mark;
- presenter unit and metadata;
- cover and closing identity text;
- content-page logo;
- favicon or social preview when present;
- official institutional color tokens only when required by a supplied template.

Do not preserve a stale ZUEL logo in hidden slides, metadata, preview images, favicons, or closing components after an explicit replacement.

## 6. Brand QA

Run the automated `BrandGeometryAudit` in `scripts/audit_layout.mjs` for the three required page roles and review its measurements alongside rendered pages. The audit records source dimensions, alpha/non-transparent source bounds, rendered painted width/height, `object-fit`, source/rendered aspect ratios, crop/distortion risk, obstruction, and cross-role consistency. It is an implementation check of this policy, not a second branding policy source.

Before delivery, verify:

- a cover is present and uses the established formal academic cover grammar;
- the ZUEL treatment was explicitly requested or retained from an existing branded project;
- a conflicting non-ZUEL subject has not been silently replaced with ZUEL;
- cited affiliations never determine the deck identity;
- logos remain undistorted, uncropped, and unobstructed;
- the visible ZUEL lockup stays approximately 215–270 px wide and 50–64 px high on the `1600 × 900` canvas, according to page role;
- transparent padding in the source asset has not caused the visible mark to become undersized;
- the cover, one representative content page, and the closing page have been visually inspected at full canvas size;
- painted top/right clearances stay in the role-specific upper-right ranges, and cover/closing anchors agree within 24 px;
- the visible artwork is not stranded inside an oversized transparent CSS box;
- the logo remains clearly identifiable without competing with the slide title or scientific evidence;
- cover, content-page, and closing identity are consistent;
- a complete closing lockup is not duplicated by a separate institution-text node;
- an official ZUEL identity variation has not changed the fixed canvas, academic density, evidence hierarchy, or layout system.

## 7. Dataset scroll-report audit roles

This addition applies only to an explicit standalone-dataset `outputMode: "scroll-report"`. It does not replace, rescale, or relax any cover/content/closing range above.

Use the same identity decision and authentic asset. Audit non-transparent painted bounds at a normal desktop report viewport for:

- `report-hero`: approximately `230–270 × 54–64 px`;
- `report-header`: approximately `200–240 × 47–57 px` when a content header includes the lockup;
- `report-closing`: approximately `220–260 × 52–62 px`.

The default report shows the complete lockup in the hero and closing only; ordinary section headers and the left navigation do not repeat it. When the lockup contains the institution names, hero and closing omit a second institution-text node.

Continue to record source dimensions, alpha bounds, fitted content bounds, rendered painted width/height, object-fit, source/rendered aspect ratio, crop, distortion, and obstruction. Also record branding metadata `logoContainsInstitutionName`, whether a separate institution text node is visible, and `duplicateInstitutionText`; do not use OCR as the sole signal. Use `object-fit: contain`; `cover` remains a blocking failure. The sticky chapter navigation must not cover or visually compete with audited identity roles, and all navigation identity/control layers must disappear in report print.

## 8. Optional dark-style treatment

For an enabled ZUEL profile in `tech-engineering-dark`, use the authentic original asset unless the user explicitly selects a white monochrome treatment. Apply that treatment only in the scoped dark presentation layer, preserving original alpha, aspect ratio, clear space, and painted size. Never overwrite the source PNG or add a white plate without an explicit request.
