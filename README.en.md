# Research HTML Presentation

**Turn papers, documents, and datasets into evidence-led HTML research decks and interactive reports, with traceable sources and in-browser editing.**

[简体中文](README.md)

> MIT licensed · No logo by default · Optional branding and licensed typography

Research HTML Presentation is a coding-agent skill for group meetings, literature reviews, project updates, course reports, and dataset-led analysis. It guides a local agent through source inspection, evidence organization, a three-unit prototype, implementation, and rendered review. Codex on Windows is the primary locally tested environment.

## See the results

**Blue and white is the default academic style.** Dark technology decks and continuous vertical reports are also supported. These examples preserve the typography and branding of completed work; new projects still start without a logo.

### 01 · Default blue and white: provincial economy

`china-provincial-economy-analysis-v3` · A complete 12-slide analysis, from data definitions and analysis design to results and synthesis.

**All 12 pages**

![Contact sheet of all 12 provincial-economy pages](docs/images/academic-overview.png)

**P1 · Cover**

![P1 Provincial-economy analysis cover](docs/images/academic-01.png)

**P2 · Data and analysis path**

![P2 Data sources and analysis path](docs/images/academic-02.png)

**P3 · Rankings and concentration**

![P3 Provincial GDP rankings and concentration evidence](docs/images/academic-03.png)

**P10 · Multiple indicators**

![P10 Six provinces compared across five indicators](docs/images/academic-10.png)

**[Preview the complete 12-page PDF →](docs/previews/provincial-economy.pdf)** · [Page images](docs/SHOWCASE.md#academic)

### 02 · Blue and white literature review: survival forests

`nhl-rsf-literature-review` · An 11-slide review of random survival forests for non-Hodgkin lymphoma prognosis. Original scientific panels, quantitative comparisons and interpretation boundaries stay together.

**P1 · Literature cover**

![P1 Literature review cover for non-Hodgkin lymphoma prognosis](docs/images/nhl-01.png)

**P6 · Original ROC panels across prediction horizons**

![P6 Four original ROC panels with AUC reading guidance](docs/images/nhl-06.png)

**P5 · Training versus validation performance**

![P5 RSF and Cox C-index comparison with the validation boundary retained](docs/images/nhl-05.png)

**[Preview the complete 11-page PDF →](docs/previews/nhl-rsf-literature-review.pdf)** · [Page images](docs/SHOWCASE.md#literature)

### 03 · Dark technology deck

Dark backgrounds, blue layers and brush-lettered headings for technical and engineering presentations. This existing ten-slide deck demonstrates layouts.

**All 10 pages**

![Contact sheet of all ten technology pages](docs/images/technology-overview.png)

**P1 · Cover**

![P1 Technology cover with a research-device concept illustration](docs/images/technology-01.png)

**P4 · Sources and evidence relationships**

![P4 Evidence relationships from source materials to traceable conclusions](docs/images/technology-04.png)

**P6 · Quantitative comparison**

![P6 Grouped bars and quantitative interpretation](docs/images/technology-06.png)

**[Preview the complete 10-page PDF →](docs/previews/technology-deck.pdf)** · [Page images](docs/SHOWCASE.md#technology)

### 04 · Vertical report: reading and exploration

`titanic-survival-analysis/scroll-report` · A passenger-survival prediction report with continuous reading, chapter navigation and interactive charts.

**Opening · Question, direct answer and key figures**

![Titanic prediction report opening and chapter navigation](docs/images/titanic-opening.png)

**Prediction errors · Inspect one matrix cell**

Hovering the actual-survival / predicted-non-survival cell shows 83 false negatives alongside recall, precision and error interpretation.

![Prediction errors with the false-negative cell tooltip visible](docs/images/titanic-errors-selected.png)

**Navigation · All 11 chapters in a narrower window**

<img src="docs/images/titanic-navigation.png" width="760" alt="Expanded report navigation showing all 11 chapters">

[Report screenshots →](docs/SHOWCASE.md#report)

### 05 · Data reports: research assistant and analysis flow

`world-bank-asia-research-report-prototype` · Six-country emissions and development indicators, 2000–2024. Two additional tools help readers explore the evidence.

**Research assistant · Ask follow-ups and inspect sources**

Choose a registered question to get an answer computed from approved aggregate data, with sources and filtering scope. A comparison builder lets readers choose indicators, groups and years; useful findings can be saved as personal notes. The screenshot shows an actual answer for China's cumulative emissions in 2010–2020.

![Research assistant with a verified answer, source and comparison builder](docs/images/research-assistant.png)

Registered questions remain available when the model service is disconnected. Open-ended natural-language questions require a separately configured model service.

**Analysis flow · Follow data through to conclusions**

An interactive graph connects data, filtering, calculations, findings and the report. Inspect node details, edit nodes and connections, save changes, or restore the initial graph.

![Analysis flow graph with a selected node and its explanation](docs/images/analysis-flow.png)

[Data-report feature screenshots →](docs/SHOWCASE.md#analysis-tools)

<details>
<summary>Presentation tools: Presenter View</summary>

Current slide, next slide, notes and timer in one workspace.

![Presenter View with slides, notes and timer](docs/images/presenter.png)

</details>

**[Browse images directly on GitHub →](docs/SHOWCASE.md)**

The PDF links above provide complete static deck previews, with downloads available. Interactive charts require the actual HTML output. Third-party fonts, marks, scientific figures and data retain their respective rights; see [third-party notices](THIRD_PARTY_NOTICES.md).

## Get started

In Codex with skill-installer available:

```text
$skill-installer
Install skills/research-html-presentation from
https://github.com/Estelaqwq/research-html-presentation
```

Then select or mention `$research-html-presentation`. If the client does not discover the installation, refresh as directed by the client.

Alternatively, clone the repository:

```bash
git clone https://github.com/Estelaqwq/research-html-presentation.git
cd research-html-presentation
```

Ask an agent with file and shell access to read `skills/research-html-presentation/SKILL.md`. Keep its supporting files available; SKILL.md alone is not the complete package. Other agents require their own tool and compatibility checks. A source repository, plugin packaging, and public directory approval are separate milestones.

## Example requests

### Literature presentation

```text
Use $research-html-presentation.
Turn the attached paper into a 10-slide, 16:9 HTML group-meeting presentation.
Use academic-light, keep the main source figures and quantitative findings,
and explain the limitations for an audience familiar with the basic method.
Show the cover, a method page, and a decisive result before completing the deck.
```

### Work report

```text
Use $research-html-presentation.
Create a vertical HTML work report from these documents and meeting notes.
Use academic-light. Explain completed work, supporting material,
open questions, and next actions without forcing a statistical-model workflow.
```

### Dataset report

```text
Use $research-html-presentation.
Analyze the attached CSV and produce a vertical HTML research report.
Use academic-light. Compare how the groups change over time.
Check missingness, units, coverage, and comparison baselines;
record transformations and build the narrative around verified results.
```

New projects contain no institutional logo by default. An explicit request such as “add the ZUEL logo” activates the optional treatment; source affiliations do not. Revisions preserve the existing project's branding unless changed explicitly. Public distribution of identity assets follows their separate asset policy.

## Two output forms

| | HTML slide deck | Vertical HTML report |
| --- | --- | --- |
| Intended use | Live projection and page-by-page explanation | Scrolling explanation and independent reading |
| Layout | Fixed 1600×900 stage, scaled as a whole | Content-driven document flow with narrow-screen adaptation |
| Navigation | Keyboard paging, chapters, progress | Section links, scrollspy, reading progress |
| Speaker support | Separate Presenter View | Optional speaking and interaction tools |
| Static output | Validated 16:9 PDF | Deterministic report print and browser PDF |

The skill resolves the form before analyzing and outlining a new task. A confirmed choice is retained.

## Core capabilities

- **Research-focused storytelling.** Connect questions, methods, results, interpretation, and boundaries. Papers, work materials, and datasets follow appropriate content routes.
- **Traceable evidence.** Keep important claims, sources, figures, and derived results connected. Reconstruct figures only from verified structured data; preserve complex source images when reconstruction would lose meaning.
- **Interactive and scientific charts.** Use questions and baselines to choose charts, including distributions, paired observations, trends with intervals, coefficients, diagnostics, and mixed panels. Missing observations and zero remain distinct.
- **Browser editing.** New projects include an Edit / E entry for ordinary text and content images, with save, undo, redo, and reset. Authoritative data, chart internals, controls, and official identity regions remain protected.
- **Prototype and rendered checks.** Review three real-content units before expanding the artifact, then check the full output in its intended runtime, print state, and layout.
- **Dataset-report exploration.** New dataset-driven scroll reports default to populated aggregate-evidence questions, data-health checks, and an editable analysis-flow diagram. Ordinary work reports do not inherit empty analysis controls.

Editing uses a project-local save service when available and browser-local storage as a fallback. Moving edits to another device requires exporting the supported changes or a modified offline HTML; local browser storage does not synchronize automatically.

Aggregate exploration uses bounded, verified calculations by default. Natural-language model access is an explicit optional server configuration and cannot run as a server feature inside a static offline file.

## Visual styles

`academic-light` uses white surfaces, cobalt structure, deep-blue titles, and restrained red emphasis. `tech-engineering-dark` uses royal-blue depth, white/ice-blue titles, cyan structure, and limited pale-gold emphasis. Both preserve the shared research, evidence, editing, and runtime rules. Special display fonts depend on the actual asset license and configuration.

## Requirements

Use a local coding agent with material-reading, file-writing, and shell capabilities; Node.js and a package manager for React/Vite/TypeScript builds; and Chromium/Playwright for automated rendering, runtime checks, and deck PDF. Python and analysis libraries are task-dependent. Local combination regression used Node.js 24; other environments need their own verification.

Structured charts use a local ECharts adapter. Scientific static exports may use NumPy and Matplotlib. Installing project dependencies and viewing an already packaged output have different requirements.

## Delivery and scope

The agent delivers the project path and available preview entry. Built artifacts can be hosted statically when their paths and assets support it. There is no automatic public URL for every report. Scroll reports have a dedicated offline export path; server-backed model options must first follow the offline rules.

This project targets HTML output and does not claim native editable PPTX export. Evidence checks do not certify scientific conclusions. Local-first editing does not determine the data policies of the coding agent, optional model services, or hosting provider. Equivalent end-to-end coverage for other operating systems and clients is not yet established.

## Repository and contributions

The `skills/research-html-presentation/` directory is the single maintained core. Repository documentation provides the distribution and usage entry points. Branded and unbranded generation share one implementation.

For issues, provide the environment, selected form, reproduction steps, errors, and a sanitized minimal input. Changes to charts, editing, interaction, or export should include relevant runtime results and screenshots.

## License and assets

Original code and workflow rules use the [MIT License](LICENSE), permitting commercial use, modification and redistribution while retaining the copyright and license notices. Third-party fonts, institutional marks, figures and datasets retain their respective rights. Hanyi font files are not included in the public installation package; users obtain any optional font from the official source under the applicable terms. Existing screenshots retain their original appearance. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Optional title font

No proprietary Hanyi font is bundled. Technology decks use local KaiTi/serif fallback. With appropriate use and embedding permission, pass `--display-font <full WOFF path>` or set `RESEARCH_HTML_PRESENTATION_FONT`. Both paths use the same skill source.

## Local maintenance

Maintain the single source under `skills/research-html-presentation/`. Run `node tools/sync-local-skill.mjs` after updating the repository to copy it into the current user's Codex skill directory, preserving private local font files.
