# Research content architecture

## Contents

1. Brief and profile gate
2. Material roles and format routing
3. Real-object grounding
4. Communication job
5. Narrative construction
6. Synthesis and closing
7. Evidence visualization and dataset routing

## 1. Brief and profile gate

Before full analysis or outlining, resolve the universal output-form choice. Then establish the reporting subject and branding selection and determine the content profile, audience, duration or page target, language, live-versus-reading mode, institutional template, and whether speaker notes are requested. A source-author affiliation, dataset publisher, study object, or photo location never establishes reporting identity; see [branding.md](branding.md).

Read [presentation-profiles.md](presentation-profiles.md) for the profile definitions and structure rules. Use information already present in the request and materials. Ask one concise question only when a missing answer would materially change page count, content selection, chapter structure, branding, language, or duration. Use `dataset-report` only when a standalone dataset is itself the presentation subject and no more specific profile was requested. Otherwise, if the profile remains ambiguous, default to `thesis-defense`.

Every explicit or legacy-default `outputMode: "slide-deck"` retains the mandatory cover, fixed `1600 × 900` canvas, high-information-density academic style, existing L01–L24 layout system, default unbranded mode or explicitly selected branding, and QA contract. Explicit `scroll-report` uses ReportRuntime: dataset-led analysis follows [dataset-scroll-report.md](dataset-scroll-report.md); work, materials and method reporting follows [general-scroll-report.md](general-scroll-report.md).

## 2. Material roles and format routing

Inspect every user-provided artifact before outlining slides. Classify each item as content evidence, visual reference, brand reference, or context according to [evidence-policy.md](evidence-policy.md).

Route formats to the appropriate capability:

- PDF or paper: extract headings, abstract, methods, results, figure captions, tables, references, and limitations.
- Word or report: preserve heading hierarchy, named decisions, appendices, deliverables, and any explicit page markers.
- Spreadsheet, CSV, TSV, or JSON: when it is an independent dataset or the requested presentation subject, after the already-resolved output-form choice, route its analysis through [dataset-analysis-and-storytelling.md](dataset-analysis-and-storytelling.md); a table extracted from a paper remains part of the research-material workflow.
- Images: record source, figure number, scientific role, dimensions, legibility, scale bars, and crop constraints.
- Existing slides: separate content evidence, visual reference, and branding; do not inherit them as one inseparable template.

Build the private material inventory and claim–evidence map defined in [evidence-policy.md](evidence-policy.md). Then classify candidate content as `MUST SHOW`, `SHOULD SHOW`, `BACKUP`, or `OMIT` using [narrative-compression.md](narrative-compression.md).

When slides are selected and a Word/report source explicitly marks pages, the markers define page boundaries and mapping. In a user-selected scroll report they preserve content order and logical sections, not a fixed-height canvas. They do not require verbatim copying of the source prose: retain the source's facts, conclusions, methods, data, and argument relations, but remove greetings, oral transitions, repeated explanations,现场提示, and other speech-only wording from the audience-facing slide body. Rewrite the retained material as concise formal academic copy; oral-only wording may be kept in optional Presenter notes.

Do not treat figures, tables, or structure diagrams embedded in papers and reports as a parallel top-level input route. Extract them through the existing material analysis, then send the extracted visual candidates through [scientific-evidence-visualization.md](scientific-evidence-visualization.md). The user does not need to upload those objects again.

## 3. Real-object grounding

Before drawing an apparatus, organism, cultural object, vehicle, mechanism, or multi-part physical structure, create a structure note:

- authentic source image or official diagram;
- components and their physical roles;
- connection or motion relationship;
- dimensions and orientation;
- features that must remain visible;
- features that may be abstracted;
- source confidence.

Prefer, in order:

1. paper or experiment figure;
2. official structure or field photograph;
3. exact geometry/data-derived reconstruction;
4. explanatory schematic grounded in the above;
5. generic icon only as a minor label.

If the object is not understood, do not draw a plausible-looking substitute. Use authentic evidence with annotation or ask one concise question when the ambiguity changes the slide.

## 4. Communication job

Write one sentence:

> By the end, **[audience]** should **[understand / approve / discuss / choose] [outcome]** because **[central evidence-backed takeaway]**.

Use it with the selected profile and speaking time to decide what to retain, move to backup planning, or omit. Keep attribution explicit: a literature report explains and evaluates source-author work; a grant review separates expected outcomes from completed evidence; a project review separates current progress from plans.

### Paper-led literature storyboard

Before building a literature-review prototype, outline the entire requested deck as a speaking sequence. For each page record: one question or speaking job, what the audience must already know, the transition from the previous page, source figure/table or claim, proposed primary visual treatment, and whether the page adds a new inference. This is a planning artifact, not audience-facing copy or a fixed template.

Test the sequence aloud from titles and visual centers alone. A listener should understand the paper's problem and question before a detailed method or result unless an intentional result-first opening supplies that context on the same page and then returns to it. Keep the authors' findings, their interpretation, the study's contribution and limits, and the presenter's evidence-grounded evaluation distinguishable. Merge a page that repeats a prior claim without a new question, comparison, or boundary. The three prototype roles may be sampled from non-adjacent positions; their prototype order does not set the complete deck's order.

## 5. Narrative construction

Build a cumulative arc from the selected profile. Every deck begins with a cover. A thesis-defense default arc is:

1. Cover: identify topic, context, and identity.
2. Agenda: include only when it helps orientation.
3. Background/gap: establish stakes with evidence.
4. Research question/hypothesis: expose what remains unknown.
5. Task/method route: show inputs, operations, constraints, and validation.
6. Experimental or analytical design: expose variables, controls, samples, and metrics.
7. Results: prioritize decisive figures and explain them.
8. Interpretation: connect evidence to mechanism or decision when supported.
9. Contribution/innovation: show the increment relative to a baseline when supported.
10. Limitation/uncertainty: connect supported boundaries to their consequences.
11. Synthesis: answer the opening question from the evidence.
12. Formal closing: invite discussion after the substantive conclusion.

Do not force unsupported thesis-defense sections into other profiles. Follow [presentation-profiles.md](presentation-profiles.md) for literature, project, grant, conference, course, and reading-deck emphasis. For slide output, profile differences may change substantive sequence without removing the cover or altering fixed geometry. A user-selected scroll report uses the appropriate continuous report contract.

## 6. Synthesis and closing

For thesis defenses, project reviews, and grant reviews, use a separate synthesis followed by a formal closing.

### Synthesis

- Use normal academic content-page structure.
- Map each opening question to evidence, quantitative finding, boundary, and implication.
- Do not introduce new results.
- Keep limitations visible when they condition the conclusion.

### Closing

- Unless the user explicitly specifies different closing-page wording, use `恳请各位老师同学批评指正` as the primary closing title. User-specified wording takes precedence. Keep any discussion question secondary; do not default to generic substitutions such as `谢谢聆听` or `欢迎讨论`.
- Preserve authentic/default branding, research title, presenter identity, and discussion invitation.
- Include presenter, advisor or team when relevant, unit, and date when available.
- Keep it visually paired with the mandatory cover but simpler.
- Do not use it instead of a substantive conclusion.

A conference talk may combine synthesis and closing only when its manifest explicitly uses `profile: "conference-talk"` and `closingPolicy: "combined"`. The cover remains mandatory and visually unchanged.

## 7. Evidence visualization and dataset routing

The existing research-material workflow remains the primary path for papers, reports, PDF, Word, and presentation files. After extracting methods, results, figures, captions, and tables, classify each scientific visual with the Figure Processing Pipeline and link it to the existing claim–evidence map.

The Dataset Analysis Pipeline is a separate branch only for standalone or dataset-led inputs. Resolve `slide-deck` versus `scroll-report` before full analysis or page generation, then profile the dataset, record data quality and transformations, plan analysis questions, derive bounded findings, and create Type A chart specifications once. If research materials and an independent dataset are both supplied, process them separately and merge their claims and evidence through stable IDs. For a mixed request, the user-selected form remains authoritative. Determine whether the task is material-led or analysis-led independently; supporting data do not force analysis modules. Do not duplicate a source observation, calculation, finding, chart value, or visual merely because two renderers exist.
