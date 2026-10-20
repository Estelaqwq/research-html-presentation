# Narrative compression and slide budgeting

## Contents

1. Compression objective
2. Content priority
3. Duration and slide budget
4. Slide-level density
5. Backup planning
6. Compression sequence
7. Final checks

## 1. Compression objective

Convert large research materials into a time-bounded argument without weakening decisive evidence or changing the established high-information-density academic style.

Compression means removing repetition, weak relevance, and excessive explanation cost so that important evidence receives enough area. It does not mean converting the deck into sparse one-line keynote slides.

For a Word/report with page markers, page correspondence is a boundary and ordering contract, not a verbatim-transcription rule. Keep each marked page's supported facts, conclusions, methods, data, and reasoning relation on its corresponding page, while rewriting oral greetings, transitions, repeated explanations,现场提示, and speech-only wording as concise formal slide language. If an oral cue is useful for delivery, place it in Presenter notes rather than the audience body.

## 2. Content priority

Classify every candidate content unit before outlining slides.

### `MUST SHOW`

Include content that directly answers the research question or determines whether the argument is credible:

- research problem or question;
- essential method or design;
- decisive evidence;
- key result;
- conclusion;
- important validity or applicability boundary.

For `dataset-report` in either output mode, also protect the primary analytical question's direct answer, each `MUST_SHOW` Finding Inventory entry, the top decisive comparison or ranking, the deep insight that changes interpretation, and application value when it affects a decision. Ordinary field inventories, routine quality metrics, and secondary distributions cannot displace these items. The direct answer must appear in the first half of substantive slides or report sections, not first emerge in synthesis. Renderer choice may change compression and boundaries but not finding priority or evidence values.

Mode-specific protection for both renderers:

- `predictive`: dataset/task, actual preprocessing, feature engineering, validation design, baseline, candidate-family comparison, selection result, error analysis, inference result, interpretation-changing limitations, and synthesis;
- `diagnostic`: dataset/question, data preparation, direct answer, key factors, limitations, and synthesis;
- `exploratory`/`dataset-portrait`: dataset scope, fit-for-purpose preparation, important patterns, relationships/anomalies, interpretation boundary, and synthesis.

Run Content Utility before page/section budgeting. Prefer deleting or merging gate explanations, internal QA, privacy/Source Lock/hash/runtime/manifest content, rejection/alternative/future-work filler, repeated conclusions, low-value field dictionaries, abstract process commentary, and units that contain no data fact, actual method, model, result, inference, application, or interpretation-changing boundary. A limitation is `MUST SHOW` as an independent unit only when it changes model choice, metric meaning, application, credibility, or inference scope; otherwise merge it into the corresponding evidence unit or synthesis.

### `SHOULD SHOW`

Include when it materially improves confidence or interpretation:

- data source and sampling;
- experimental or analytical design;
- critical variables and controls;
- validation method;
- important comparison;
- mechanism supported by evidence;
- major limitation or boundary.

### `BACKUP`

Reserve for likely questions or technical verification that the main arc does not need to explain in full:

- complete parameter tables;
- lengthy derivations;
- secondary experiments;
- ablations;
- additional samples;
- detailed statistical tests;
- extended literature comparison;
- equipment and implementation details.

This phase plans backup content only. It does not add backup-slide navigation, search, or presenter-accessible backup runtime behavior.

### `OMIT`

Remove content that is weakly related, repetitive, poorly supported, excessively expensive to explain, or unnecessary for the current audience.

Do not keep a weak item merely because it appears in the source document or a conventional outline.

## 3. Duration and slide budget

Estimate roughly one substantive slide per 60–120 seconds, then adjust for figure complexity, formulas, audience expertise, and reading-first use.

- 6–7 slides: keep the cover; omit a standalone agenda unless unusually useful.
- 8–12 slides: use three to five meaningful sections and at least four content silhouettes for a thesis defense.
- 12–20 slides: add section transitions only when they improve orientation.
- Reading decks: add pages rather than shrinking self-contained detail below the legibility contract.

Never remove the cover to recover speaking time. Compress background, agenda, transitions, repeated evidence, and secondary detail first.

## 4. Slide-level density

Give each substantive slide:

- one primary narrative job;
- one takeaway-oriented title or title plus lead claim;
- one main visual center;
- two to four structured regions;
- three to six evidence units at most;
- a takeaway only when it adds an implication not already obvious.

Preserve the design system's organized-density targets. Use real figures, tables, formulas, annotations, shared edges, and aligned explanation. Do not increase density through a higher card count or body type below 18 px.

Protect the size of decisive figures. If essential evidence becomes unreadable, split or restructure the slide before reducing type.

## 5. Backup planning

Record each backup candidate with:

- the main slide or claim it supports;
- the likely question it answers;
- the source evidence;
- the reason it is not required in the main arc.

Do not include backup pages in the main speaking-time estimate unless the user explicitly plans to present them.

## 6. Compression sequence

When material exceeds the page or time budget, apply this order:

1. remove repeated wording and duplicate evidence;
2. remove weakly related context and decorative content;
3. rewrite long prose as concise evidence-bearing statements;
4. combine claims only when they share one visual center and research relationship;
5. move detailed derivations, parameters, and secondary experiments to backup planning;
6. split overloaded slides when both claims remain essential;
7. change image/text proportions or choose a better existing layout;
8. reduce type by at most 1 px only after the preceding steps and never below the minimum.

Do not solve overload with negative tracking, condensed fonts, element-level scaling, unsafe cropping, internal scrolling, or removal of the mandatory cover.

## 7. Final checks

Before implementation, verify:

- every `MUST SHOW` item has a planned slide;
- every `SHOULD SHOW` item either appears or has a documented omission reason;
- every `BACKUP` item maps to a likely question or main claim;
- every `OMIT` decision protects the central argument rather than hiding contradictory evidence;
- speaking time matches the user's limit;
- the cover remains present;
- the deck remains high-density, evidence-led, and readable rather than sparse or cramped.
- marked source pages still map one-to-one in the same order, while audience copy contains no copied opening greeting, oral transition, or speech-only filler.
- a dataset deck protects the primary answer, top findings, deep insight, and decision/application value before allocating extra pages to structure or quality;
- every dataset synthesis item points to a finding already shown in the main narrative.
