# Local lightweight authoring

This is the sole detailed contract for the local Authoring Layer. New scaffolds include it by default; an explicit read-only request is the opt-out. It keeps the research presentation and its two runtimes intact; it is not a browser PowerPoint clone or a second analysis system.
The optional scroll-report research companion is reader exploration, not Authoring. Its result/notebook store is separate from `presentation-edit-patch.json`; it cannot edit the Shared Evidence Core or formal report copy.

## Activation and output boundary

New projects are authoring-enabled by default and set `authoring.enabled: true` plus `requestedCapabilities.authoring: "required"`. A user may explicitly request read-only output or pass `--no-authoring` to opt out. Existing manifests with an explicit `authoring.enabled: false` remain unchanged; an omitted field in an existing project is not silently migrated. Ordinary browser delivery—loopback development, a static build, or a `file://` page—must expose the compact `编辑 E` entry on the same control row as directory, fullscreen, and Presenter controls; the complete workspace starts collapsed. `E` enters/exits the workspace; Save, Reload, Undo, Redo and Reset use operation history. Warn before exit or unload with unsaved work.

The ordinary browser bundle intentionally includes `EditorShell`, editor CSS, and keyboard handlers so the delivered page remains editable. `?print=1`, Presenter View, deck PDF, and report print hide the editor controls and outlines while preserving the effective content. The local project endpoint is preferred when available; static and `file://` pages fall back to a namespaced browser-local Patch store. If both stores are unavailable, Save must fail with the concrete storage reason (not a misleading success). Formal release still consists of **Base + validated Patch**, and the authoring layer must wrap—not replace—`DeckRuntime` or `ReportRuntime`.

## Default content editing

Inside the audience content region, all ordinary visible text is editable by default: `h1`–`h6`, `p`, `li`, `blockquote`, `dt`, `dd`, `td`, `th`, `figcaption`, `span`, `strong`, `em`, `b`, `small`, `kbd`, ordinary labels/citations/source copy, cover metadata, headings, leads, lists, takeaways, captions, chart titles/legends/labels, and report hero/header/finding/closing copy. Stable SVG text fields are included when they are audience copy. Nested text is covered by the nearest stable editable content target, so discovery cannot silently omit it.

Normal content images are editable by default: select, local replacement, alt, caption, bounded width/min-height, `contain`/`cover`, object position, reset, undo/redo and save/reload. Registry generation must give targets deterministic IDs from a stable presentation owner/component/field role or deterministic `data-edit-id`; never from sibling index, rendered DOM order, selectors with `nth-*`, or saved HTML.

The registry may be generated at build time or expanded deterministically from the rendered semantic content. It is an edit-binding contract, not a hand-maintained whitelist that makes ordinary content unavailable. Discovery covers all slides/sections, including non-current deck pages, and reverse-scans the rendered audience content for uncovered ordinary text. Every generated field synchronizes `baseValue`, `expectedValueHash`, `targetId`, `field`, and `editId`; each `editId` and each `targetId + field` pair is unique. A stale registry, missing rendered target, or mismatched base hash is a build/runtime failure—not a reason to keep rendering.

## Locked surfaces

Use `data-editor-lock="true"` for runtime controls, navigation, page/progress, Presenter UI, print/PDF/fullscreen controls, report navigation and back-to-top, CSS decorative/background geometry, canvas pixels, SVG/HTML-CSS chart internals (axes, ticks, legends, bars, table cells that encode values, and chart tool controls), raw data, model metrics, claims, finding priority, domains/baselines and other authoritative data records. Active official logos, full institutional names and locked brand geometry are also locked; a real official asset change follows the brand asset workflow, not normal image replacement. Do not lock rendered ordinary copy merely because it is a number, comparison, source, evidence statement, conclusion, or key result.

## Scientific integrity and patch model

Persist only narrow typed operations in project-root `presentation-edit-patch.json`: `replace-text`, `replace-image`, `set-image-fit`, `set-image-position`, `set-element-size`, `reset-field` and `reset-image`. A Patch has revision, `baseFingerprint`, expected hashes and status (`clean`, `rebased`, `conflict`, `orphaned`). Never persist a DOM, arbitrary JSON/CSS/HTML/JS, `innerHTML`, or arbitrary file path.

Ordinary narrative/illustrative edits save normally. Any ordinary plain-text replacement—including a number, percent, unit, ranking, comparison, model metric, conclusion, DOI/URL/source, or deliberately incorrect test string—is allowed to edit and save locally without semantic, evidence, importance, or layout blocking. A designated scientific-image or other formal evidence operation may retain `needs-evidence-review` as a non-blocking post-save status; it may be previewed and saved, but cannot pass formal deck-PDF/report-print/release validation until a source recheck marks it verified. Image reset retains the original; replacements use safe project relative managed paths and a newly calculated hash.

## Safe local image storage

The local server supports only `POST /__presentation-editor/upload-image` plus Patch load/save. It accepts loopback/allowlisted development requests, approved PNG/JPEG/WebP/AVIF MIME and magic bytes, a bounded size, safe filename and a server-chosen project image directory. It atomically writes a managed relative path and returns its hash. It rejects `..`, absolute targets, executable/HTML/scripted-SVG content and arbitrary file APIs. Do not delete old assets automatically; report unused assets for review.

## Output-specific layout guardrails

For `slide-deck`, sizes are on the existing 1600×900 logical canvas. Edits should stay in safe areas, introduce no internal scrolling, and preserve title, brand, takeaway and evidence composition; rerun the deck layout audit after save. Layout overflow is a post-save warning for local text editing, not a reason to reject the Patch.

For `scroll-report`, width is constrained by reading columns and responsive `max-width`; height remains content driven. Do not introduce a slide canvas, horizontal scrolling, break section IDs/scrollspy/navigation, or change report print behavior; rerun desktop and narrow-layout audits after save.

## Validation and rebase

Use `validate_edit_patch.mjs` and `validate_editor_runtime.mjs`, then the single `verify_project.mjs` entry for the selected mode. Test default text and image discovery across every page/section, reverse-scan coverage, nested text, deterministic non-duplicate IDs, image metadata and fit, arbitrary plain-text edits, focused-field Save/Reload, undo/redo/reset, localStorage fallback, locks, non-blocking review status, unsafe uploads, fingerprints/orphans, deck/report overflow, editor visibility in ordinary production/static/file delivery, and absence of editor UI from Presenter/Print/PDF. A local save may fail only for a real technical write, serialization, path, storage, or project-integrity failure.

When Codex regenerates a project, read and apply its current Patch first. Rebase by stable target/field only. Keep unresolved collisions as `conflict` or `orphaned`; never silently discard user edits or use a Patch to change the Shared Evidence Core.

## Inline structure and portable changes

Plain-text replacements preserve the trusted base inline emphasis, links, citations and code structure in memory; never flatten a mixed paragraph with a blanket `textContent` write. Compare multiple edits, changed emphasized values, Unicode, line breaks, undo/reset and Save/Reload. Complete rewrites still need a human emphasis review. Pasted HTML and text looking like HTML remain plain text; patches never store arbitrary HTML.

For a built authoring-enabled scroll-report fixture containing an ordinary editable paragraph with emphasis, run `node scripts/test_report_portability.mjs <project>` after the ordinary build and offline export. This browser regression checks native replacement, reload, JSON transfer, wrong-project rejection, and fresh offline reading/print/presenter with storage disabled. It runs in isolated contexts and writes test downloads under `.report-render/portability`, without changing source patches. It complements the full editor/runtime validators; it is not a formal release approval.

The editor provides **导出修改文件** and **导入修改文件**. The versioned JSON envelope includes the project ID, base fingerprint, typed patch, current registered flow modifications and approved replacement-image bytes with hashes. Reject a different project/base, invalid patch, malformed/dangling flow or tampered image before applying imports. Import updates the local editing session: the editor's **保存** persists body edits and imported image bytes; the flow panel's separate **保存** persists the flow. State this distinction in the import success notice. Alternatively, **下载修改版HTML** packages both current body and flow without requiring either save first. Browser-local imported images do not become source-project files or automatically enter a later rebuild; export the edited HTML for portable delivery. Downloads include current edits even if not yet saved. Reader assistant notebooks and raw datasets are not included.

For scroll reports, **下载修改版HTML** uses the immutable self-contained build entry plus the validated typed envelope. It does not serialize the live edited report DOM or chart canvases. Build the ordinary distribution first, then run `export_offline_report.mjs`; it produces the independent file and `dist/offline.html`, which the ordinary preview uses as its portable base. An opened standalone file can export directly without a server. Missing/externally dependent bases or unavailable replacement images fail visibly; exporting JSON remains available. Scientific-image review requirements still apply to final HTML export.

An embedded downloaded edition has an isolated browser-storage namespace, so an old local edit cannot silently override the downloaded state. Reset and save must survive reopening; the immutable source/initial graph remains the restore target. Validate a downloaded HTML in a fresh browser context or with browser storage blocked, proving the edits travel in the file. Verify imports, invalid cross-project files, inline formatting, flow restoration, assets and deterministic print. This is explicit file transfer, not automatic cloud synchronization.
