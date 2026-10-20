# Academic presentation profiles

> Applicability: these academic profiles support any reporting institution or unaffiliated reporting subject. New projects are unbranded by default; only an explicit logo request enables the optional treatment. A citation, dataset, research object, or source affiliation never determines reporting identity; follow [branding.md](branding.md).

## Contents

1. Profile and output-form gate
2. Deck invariants across profiles
3. Thesis defense
4. Literature review
5. Project review
6. Grant review
7. Conference talk
8. Course report
9. Reading deck
10. Dataset report
11. Profile-driven manifest rules
12. Work progress reports

## 1. Profile and output-form gate

After resolving the user's output-form choice through the universal gate in SKILL.md, determine or safely infer these content requirements before outlining:

- presentation profile;
- target audience;
- speaking duration or page target;
- language or bilingual requirement;
- live-speaking versus reading-first use;
- official institutional template or reporting identity;
- whether speaker notes are requested.

Use information already present in the user's request and materials. Do not repeat questions that are already answered. Ask one concise question only when a missing answer would materially change page count, content selection, chapter structure, branding, language, or duration.

Supported manifest profile values:

- `thesis-defense`
- `literature-review`
- `project-review`
- `grant-review`
- `conference-talk`
- `course-report`
- `reading-deck`
- `dataset-report`
- `work-report`

Choose `dataset-report` only when a standalone dataset is the presentation subject or the user explicitly requests a dataset introduction or visualization deck and has not selected a better profile. A paper or report containing tables does not trigger it. Otherwise choose the closest formal academic profile; if ambiguity remains, default to `thesis-defense`.

Resolve output form first for every new task using the universal choice in SKILL.md; explicit or already confirmed choices are reused. Determine the content profile after selection. Every supported profile permits `slide-deck` or explicit `scroll-report`. Omitted mode remains `slide-deck` for existing manifests. Work/material/method reports with supporting tables do not become dataset-report unless analysis itself is the primary task.

## 2. Deck invariants across profiles

Every explicit or legacy-default `outputMode: "slide-deck"` must:

- begin with `type: "cover"` and layout `L01`;
- preserve the established formal academic cover structure and brand region;
- use the fixed `1600 × 900` canvas and whole-slide scaling;
- retain the high-information-density academic visual language;
- keep real research evidence as the visual center;
- use the existing L01–L24 relationship-driven layout system;
- prohibit internal scrolling, responsive column reflow, and mobile-page conversion;
- preserve the interaction and visual QA contracts;
- default to no institutional logo; enable the optional ZUEL treatment only on explicit request, and preserve existing project branding during revisions.

Profiles change substantive emphasis and sequence. They do not authorize removal of the cover, a sparse keynote style, a commercial theme, or a runtime redesign. The selected `visualStyle` may change the cover's appearance while preserving its formal L01 structure, brand geometry, and evidence hierarchy. Explicit dataset `scroll-report` follows [dataset-scroll-report.md](dataset-scroll-report.md); general scrolling work/material reports follow [general-scroll-report.md](general-scroll-report.md); it is an additional renderer and does not modify these deck invariants.

## 3. Thesis defense

Use `thesis-defense` for dissertations, theses, graduation defenses, and formal research defenses.

Prioritize:

1. cover;
2. context and research gap;
3. research question or hypothesis;
4. method, analytical design, or experimental design;
5. decisive results;
6. interpretation and mechanism where supported;
7. contribution or innovation relative to a baseline;
8. limitations and applicability boundaries where supported;
9. evidence-bearing synthesis;
10. separate formal closing.

Require both `type: "synthesis"` and a later `type: "closing"`. For decks with eight or more slides, require at least four distinct non-cover, non-closing layout IDs.

## 4. Literature review

Use `literature-review` when the primary task is to explain, evaluate, or discuss one or more papers.

Prioritize:

1. cover;
2. paper or field problem;
3. method or conceptual framework;
4. reported evidence;
5. contribution;
6. limitations, controversy, or competing interpretation;
7. the presenter's evidence-grounded evaluation or discussion;
8. formal closing.

Attribute experiments, methods, data, and conclusions to the source authors. Never present cited work as the presenter's own experiment. Do not invent personal innovation or an experimental design merely to imitate a thesis-defense outline.

A separate synthesis is recommended when the deck compares several papers or answers an opening evaluation question, but the closing remains required by default.

Before prototyping, check the full literature-report speaking arc rather than treating the three sample pages as the final opening sequence. The audience must be able to state why the paper matters, what its authors asked, how they investigated it, what the decisive evidence shows, what is new or useful about the work, which limitations condition the conclusion, and what the presenter concludes. These are comprehension jobs, not a mandatory one-page-per-item template. A result-first opening is valid only when its page supplies enough context to interpret the result and the following pages return to the research question. Do not move the problem/background page after detailed results merely because the prototype sampled a method and a result page.

## 5. Project review

Use `project-review` for project proposals, midterm reviews, progress reviews, completion reviews, and internal research reviews.

Prioritize:

1. cover;
2. background and necessity;
3. scientific or technical question;
4. objectives and work packages;
5. technical route and validation logic;
6. current progress and completed evidence;
7. risks, gaps, and next work;
8. synthesis or overall judgment;
9. formal closing.

Separate completed results from plans. Label preliminary, expected, and pending evidence accurately. Require synthesis and a later closing.

## 6. Grant review

Use `grant-review` for grant proposals, project applications, and funding reviews.

Prioritize:

1. cover;
2. research necessity and gap;
3. scientific question;
4. objectives;
5. tasks and technical route;
6. feasibility and research foundation;
7. expected measurable outcomes;
8. risk and validation plan;
9. synthesis;
10. formal closing.

Treat uncompleted outputs as `EXPECTED` or `HYPOTHESIZED`. Never display planned work as completed experimental evidence. Require synthesis and a later closing.

## 7. Conference talk

Use `conference-talk` for a time-bounded academic conference or seminar talk.

Always retain the cover. Compress background, agenda, and section transitions before reducing evidence quality or removing the opening identity page.

Prioritize:

1. cover;
2. problem and research question;
3. essential method;
4. one to three decisive results;
5. concise synthesis;
6. closing when time permits.

Use `closingPolicy: "separate"` by default. Permit `closingPolicy: "combined"` only when the user explicitly requests a short conference deck or a strict page limit. In that mode, the last `type: "synthesis"` slide must also contain a restrained discussion invitation; the cover remains mandatory.

Do not convert a short talk into a sparse commercial keynote. Preserve organized academic density and decisive evidence.

## 8. Course report

Use `course-report` for coursework presentations grounded in research materials.

Always retain the cover. Select content according to the assignment: literature understanding, method explanation, results, discussion, critique, or a project proposal. Keep source authorship explicit and do not fabricate personal research.

Use a formal closing by default. Add synthesis when the assignment asks for an evaluation, answer, or recommendation.

## 9. Reading deck

Use `reading-deck` when the slides must remain intelligible without a live speaker.

Use a cover for slides or a hero for explicit vertical output. A reading-first request may use more self-contained explanation, structured tables, annotations, and source context; for slide output preserve:

- fixed 16:9 geometry;
- no internal scrolling;
- readable body type;
- decisive figure size;
- high-information-density academic composition;
- formal closing by default.

If the user selected slides, do not silently change them into a scrolling report or dashboard. An explicit vertical choice follows the general scroll-report contract. Use additional slides when self-contained detail exceeds the safe canvas.

## 10. Dataset report

Use `dataset-report` when an independent dataset is the presentation subject. Do not require an accompanying paper. Both output modes share these elastic analytical modules:

1. cover for `slide-deck`, or report hero for `scroll-report`;
2. background and analytical question;
3. dataset scope, source, and variables;
4. data processing and analytical design;
5. exploratory findings;
6. key rankings, groups, or comparisons;
7. key-factor analysis;
8. model analysis when the Model Gate admits it;
9. deep insight;
10. application value;
11. boundaries and limitations;
12. evidence-bearing synthesis;
13. separate formal closing or report footer.

These are modules, not fixed pages, sections, or chapters. Merge dataset introduction with quality, distributions with group comparisons, or weak application value into synthesis when appropriate; omit model analysis when it is not defensible. For a short deck, compress to question–data–results–insight–synthesis. Primary answer, top findings, deep insight, and application value outrank ordinary field or quality description. Keep substantive synthesis and closing distinct. A deck never becomes a dashboard or permanent-sidebar site; a scroll report uses a restrained chapter navigator rather than a filtering sidebar and follows [dataset-scroll-report.md](dataset-scroll-report.md).

The first substantive unit after the deck cover or report hero must establish dataset/task context, including file roles and target/task when present. Run the Dataset Task Intent Gate before Analysis Mode; an explicit predictive benchmark with labeled training data and unlabeled inference data is not reduced to a narrow diagnostic subgroup question merely because the hidden test labels are unavailable.

When the resulting mode is `predictive`, protect dataset/task definition, actual preprocessing, feature engineering, validation design, baseline, adequate candidate-family comparison, selected-model performance, error analysis, inference, limitations, synthesis, and closing. Both output modes inherit the shared Model Search Adequacy Gate and Audience Plain-Language Gate. These remain elastic modules and may share pages/sections. The detailed analytical, model-search, content-utility, and audience-copy rules live only in [dataset-analysis-and-storytelling.md](dataset-analysis-and-storytelling.md); the continuous report mapping lives in [dataset-scroll-report.md](dataset-scroll-report.md).

[dataset-analysis-and-storytelling.md](dataset-analysis-and-storytelling.md) is the sole detailed policy for analysis order, gates, finding inventory, chart interaction, motion, privacy, and dataset narrative. This profile records only the recommended emphasis and structure.

## Work report

Use `work-report` for personal/team work summaries, periodic progress and mixed material-method-progress reporting. Prioritize scope, concrete work/methods, supported results or examples, accurate progress and next steps. Do not require models or finished results when the work is preparation. Chapters and modules are optional and material-driven. Use the selected output form; general scroll reports may finish with a substantive plan rather than separate synthesis/thanks sections.

## 11. Profile-driven manifest rules

Record `profile` and, for new dataset work, `outputMode` in `deck-manifest.json`. If profile is omitted, validation defaults to `thesis-defense`; if output mode is omitted, validation defaults to `slide-deck` for backward compatibility.

For `slide-deck`, use explicit slide `type` values for `cover`, `content`, `synthesis`, and `closing`. Treat title or section keyword matching only as legacy compatibility.

All `slide-deck` profiles require the first slide to use `type: "cover"` and layout `L01`. Explicit `scroll-report` instead requires a first `role: "hero"` section and does not use L01–L24.

Require a separate closing for every deck profile by default. The only first-stage exception is `conference-talk` with explicit `closingPolicy: "combined"`. Do not use this exception merely because the deck is short. A complete dataset scroll report requires a substantive synthesis followed by a `role: "closing"` report section. A general scroll report may close with a substantive plan, synthesis or closing; it does not manufacture a quantitative result.

Require synthesis for `thesis-defense`, `project-review`, `grant-review`, and `dataset-report`. Recommend it for the remaining profiles when it answers an opening question or evaluates evidence.
