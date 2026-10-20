# Dataset analysis and storytelling

## V2 chart-choice and audience-copy gates

Every Type A `ChartEvidenceSpec` records `chartForm`, `analyticalQuestion`, `visualThesis`, `encodedFields`, `comparisonBaseline`, `claimVisualFit`, `alternativeFormsConsidered`, and `selectionRationale`. Choose by analytical question: rank → sorted bar/lollipop/rank table; ranking mismatch → slopegraph/dumbbell; time change → line/area/bump; rank reorder → bump/slopegraph; two-variable relationship → scatter; coefficient comparison → correlation dot plot; multi-indicator pattern → heatmap or suitable parallel coordinates; regional share → 100% stacked/proportional area/reliable choropleth; distribution → box/dot distribution/small multiples.

Without a specific rationale, horizontal bars may appear on no more than two pages; no functional form may exceed 40% of key data pages; adjacent data pages do not repeat a form unless they are a controlled series. Variety never overrides fit. A Pearson title requires a scatter or explicit correlation-comparison visual. Ranking mismatch requires two rankings in one visual. Rank reorder requires at least two time points or a trajectory. A rank table alone does not prove Pearson correlation.

Titles state object + value/direction/meaning, comparison result, technical action + output, known fact + explicit gap, or numbered findings. Leads establish the comparison/reading entry. Body supplies evidence. Takeaways add consequence, application, or boundary. High-level copy rejects `不是…而是…`, `而不是`, `不等于`, `不能只讲`, `价值在于`, `本页`, `本报告`, `这组数据`, `需要组合阅读`, and other report-writing meta language. Put genuine limitations in a lower-level `解释边界`/`适用范围` note with a concrete object. Avoid repeating the same judgment or number across title, lead, and takeaway.

## Contents

1. Trigger, output-form gate, and shared-core handoff
2. Analysis execution order and task intent
3. Source, field, and preparation coverage
4. Analysis Mode Gate
5. Finding-First and Content Utility Gates
6. Model Gate, search adequacy, and predictive contract
7. Chart specification and interaction
8. Motion contract
9. Output narrative order and evidence copy
10. Provenance, privacy, and mixed materials
11. Prototype and QA

## 1. Trigger, output-form gate, and shared-core handoff

Read this reference for a standalone CSV, TSV, XLSX, JSON, or equivalent dataset, or when the dataset itself is the requested subject. A paper/report that contains figures or tables remains in the Existing Research Material Workflow; its extracted visuals use [scientific-evidence-visualization.md](scientific-evidence-visualization.md).

The universal Output Form Choice in SKILL.md precedes this branch for every reporting task. Reuse an explicit/already confirmed form; if unresolved, ask the universal two-option question and wait before full analysis or page generation. Do not infer the choice from file extension. An omitted mode in an existing manifest means `slide-deck`.

The Dataset Analysis Pipeline owns data understanding and analytical planning. It may produce only:

- immutable dataset records and recorded transforms;
- analyses and a Finding Inventory;
- claims and claim–evidence links;
- chart specifications;
- neutral narrative units and output metadata.

It must hand those outputs to the Shared Evidence Presentation Core defined in [implementation-contract.md](implementation-contract.md). Both output modes use the same records, calculations, finding priorities, claim IDs, chart specifications, values, interactions, accessibility summaries, and print states. `slide-deck` then uses the unchanged Deck Presentation Runtime. Explicit `scroll-report` uses [dataset-scroll-report.md](dataset-scroll-report.md). Neither renderer may implement another analysis, finding, claim, chart-data, adapter, or brand system.

## 2. Analysis execution order

Use this order for analytical work. It is intentionally different from the audience narrative:

`Source Lock → Dataset Profiling → Dataset Task Intent Gate → Analysis Mode Gate → Analysis Question → Data Preparation → Exploratory Analysis → Finding Inventory → Key-factor Analysis → Optional Model Gate → Model Search Adequacy Gate (when admitted) → Deep Insight → Application and Boundary → Claim–Evidence Linking → Chart Specification`

Quality checks happen early because they condition validity. Their presentation space is proportional to their effect on interpretation; they do not automatically become the first or largest substantive result.

### Source Lock and profiling

Preserve the original file and record its hash. Inventory sheets/tables, one-row meaning, keys, joins, fields, units, time/space coverage, privacy risks, missingness, duplicates, invalid values, ranges, cardinality, continuity, and candidate outliers.

Do not silently delete, impute, standardize, sample, merge categories, or change units. Record each operation as a `DataTransformRecord`, including inputs, parameters, affected fields/rows, outputs, and rationale. Treat inferred types, outliers, and sensitive-field matches as candidates rather than conclusions.

### Dataset Task Intent Gate

Run this gate before Analysis Mode. It decides the analytical task, not `outputMode`.

1. Honor an explicit user request for prediction/classification/regression, ranking/comparison, explanation/diagnosis, exploration, dataset portrait, quality review, or benchmark evaluation.
2. Reconstruct the dataset task contract from targets, labeled training files, validation files, unlabeled inference files, sample-submission schemas, benchmark metrics, experiment/method groups, time targets, data descriptions, and explicit file relationships.
3. Check data capability: observation/feature count, label quality, grain, missingness, validation options, leakage risk, and whether the proposed task is actually supportable.
4. If predictive, diagnostic, and exploratory readings remain similarly plausible and would produce materially different reports, ask the user before full analysis. Do not choose whichever subgroup is easiest to chart.

Record `analysisIntentSource: "user-explicit" | "dataset-contract" | "inferred" | "user-confirmed"`, `analysisModeRationale`, and a `datasetTaskContract` containing task type, target, labeled/validation/inference source IDs, submission-template ID, evaluation metric when known, task evidence, and ambiguity status. File extensions alone are never task evidence; file roles, target/schema relationships, and supplied benchmark metadata are.

## 3. Source, field, and preparation coverage

### Dataset Introduction Gate

After the cover or report hero, the first substantive unit establishes the audience context: dataset name/source, one-row meaning, every supplied file's role, sample/field counts, target, important field families, task, scope, and the route from preparation to result. It may combine background, question, introduction, and task definition. Source hashes, build state, a field dictionary, or a quality panel are not substitutes. If train, validation, inference/test, or submission files exist, explain all their roles rather than presenting only the labeled file.

### Source and Field Use Coverage Gate

Assign every source a role such as `labeled-training`, `validation`, `inference`, `sample-submission`, `lookup`, `metadata`, `auxiliary`, or `excluded`. For every major field record its role (`target`, `feature`, `identifier`, `grouping-variable`, `derived-source`, `metadata`, `validation-only`, or `excluded`), analytical/model use, derived features, missing strategy, frontend exposure policy, and exclusion rationale when unused.

Use fields according to task value. A high-cardinality identifier is not automatically a model feature, but a name, ticket, cabin, code, or grouped identifier may support a defensible derived feature. Conversely, never force meaningless IDs into a model merely to claim full coverage. "Not directly displayed" or "not packaged row-by-row" does not mean "not analyzed." Dataset-specific examples remain examples, never universal feature rules.

### Data Preparation and Missingness Treatment Gate

Distinguish missingness audit, treatment, sensitivity, indicator, missing-as-category, imputation, exclusion, and model-specific preprocessing. For every predictive feature, record its actual missing-value treatment, categorical encoding, scaling if needed, outlier handling, derived features, train/validation isolation, leakage controls, and inference transform.

Imputers, encoders, scalers, selectors, and learned feature steps fit inside each training fold or training split. Apply only the fitted pipeline to validation and inference/test. Do not preprocess the complete labeled+inference population before cross-validation. Record `fitScope`, `applyScope`, `foldSafe`, `leakageRisk`, `missingStrategy`, and `derivedFromFields` on the existing `DataTransformRecord`. Exploratory/diagnostic work may retain a missing group when analytically appropriate; predictive work may not treat "we preserve the missingness boundary" as an actual preprocessing strategy.

## 4. Analysis Mode Gate

Choose the mode from the question, target, comparison design, and data conditions—never from the file extension. Record `analysisMode` in the manifest or the primary `AnalysisRecord`.

| Mode | Use when | Analytical emphasis |
|---|---|---|
| `dataset-portrait` | The dataset itself is the topic and no external question is supplied | scope, structure, coverage, quality, and core distributions |
| `exploratory` | No question is supplied and the data supports discovery | distributions, groups, time, space, relationships, and anomalies |
| `diagnostic` | The user or task contract asks to explain a result, difference, or mechanism rather than predict it | key factors, group differences, mechanism clues, and non-causal boundaries |
| `predictive` | The user asks for prediction, or the task contract establishes a target with labeled training data and an inference/forecast/benchmark role | out-of-sample performance, calibration/error, usefulness, and limitations |
| `comparative` | Experiments, models, methods, groups, or options are compared | deltas, rankings, stability, significance/uncertainty, and error |

For `dataset-portrait` or `exploratory`, formulate a bounded primary analytical question from the available grain and fields. Do not invent a business objective or hypothesis. A large observed group delta does not by itself justify converting the whole assignment to `diagnostic`. A labeled-train/unlabeled-test/submission benchmark normally supports `predictive`; the absence of hidden test truth limits external-score claims but does not invalidate cross-validation. An explicit user diagnostic or portrait request still takes priority over the mere existence of a target. Every mode cites `analysisIntentSource`, `datasetTaskContract.taskEvidence`, or explicit user confirmation in `analysisModeRationale`.

## 5. Finding-First and Content Utility Gates

Before a slide outline, create a Finding Inventory by extending existing `AnalysisRecord` entries. At minimum answer:

1. What is the primary analytical question?
2. What is the data's direct answer?
3. What are the three most important findings?
4. Which relationships are exploratory only?
5. Which results have application or decision value?
6. Which limitations materially change interpretation?

Use `findingPriority: "MUST_SHOW" | "SHOULD_SHOW" | "BACKUP" | "OMIT"`. Record `questionId`, `primaryQuestion`, `findingStatement`, `supportingMetrics`, `evidenceStatus`, `decisionValue`, `sourceAnalysisId`, `limitations`, `applicationImplication`, and `contradictoryEvidence` as applicable. Do not create a parallel conclusion registry.

Enforce these narrative consequences:

- The direct answer to the primary question appears in the first half of substantive slides or report sections.
- Top findings receive a dedicated result slide/section or become its visual center.
- Synthesis may restate and connect findings already shown; it may not introduce a key result for the first time.
- Domain-specific questions require domain-specific answers. For occupational risk, identify the highest-risk occupations rather than stopping at distributions or correlations.
- Data quality cannot substitute for analytical conclusions.
- Every synthesis finding ID resolves to a finding already cited by an earlier body slide.
- Exploratory associations remain `DERIVED` and explicitly non-causal; speculative explanations are `HYPOTHESIZED` or omitted.

Before either renderer maps `NarrativeUnit`s, apply the Content Utility Gate. Every body unit must contribute at least one dataset/task fact, actual transform, method/model, validation/comparison result, finding, inference, application, or interpretation-changing boundary. Record this as `substantiveContribution`, resolvable `dataFactIds`/`methodIds`/`resultIds`, and `contentUtilityStatus: "keep" | "merge" | "remove"`. If deleting the unit loses no data fact, method, model, result, judgment, application, or boundary, remove or merge it.

Do not create standalone units for Source Lock/hash, privacy review, manifest/runtime/QA state, an internal gate, model rejection, alternative plans, or future work with no present result. Gate decisions remain analysis metadata.

## 6. Model Gate, search adequacy, and predictive contract

Model pages are optional. Admit them only when all of the following hold:

- a clear target variable exists;
- the target is not mechanically computed from the same inputs by a published formula, unless the page is explicitly formula analysis rather than prediction;
- observations and features are adequate for the proposed method;
- a defensible training/validation or estimation strategy exists;
- the model answers the primary question;
- performance and coefficients/importance can be interpreted within the design.

Record `decision: "admit" | "defer" | "reject"` and the rationale. Distinguish `predictive-model`, `explanatory-model`, `published-scoring-formula`, `formula-decomposition`, and `descriptive-association`. Judge separately whether a model suits the task, can be validated, belongs in the main narrative, or is auxiliary.

An unlabeled inference/test set is not sufficient reason to reject modeling. Cross-validation, grouped validation, time split, bootstrap, or a defensible holdout may evaluate the model. Missing external truth limits only external validation claims. A sample submission defines schema or a published baseline; it is never hidden ground truth and cannot establish test accuracy.

For predictive work, record the target, preprocessing pipeline, baseline(s), candidate models, validation design, primary/secondary metrics, selection rule, interpretability method, error analysis, final fit/inference, and limitations. A rejection routes analysis internally to an appropriate non-model method; it does not generate a "why no model," "alternative plan," or "model later" unit. Mention non-modeling in one or two method/limitation sentences only when that decision materially affects audience interpretation, without exposing gate terminology.

### Model Search Adequacy Gate

Model Gate decides whether modeling is analytically valid. Model Search Adequacy decides whether the candidate range supports selecting a model. Keep these stages distinct:

1. a non-learning `baseline`;
2. an untuned `candidate model`;
3. a reproducibly `tuned candidate`;
4. a `selected model` under the declared validation rule;
5. a `final fitted model` trained after selection for inference;
6. an `external evaluation result` from separately available truth or an authoritative benchmark.

A baseline is not a candidate model. A final fitted model is not an externally validated model, and an inference file without labels cannot supply an external score.

For ordinary tabular classification or regression, choose model families from the data and task rather than a fixed checklist. When sample size, feature types, missingness, compute, interpretation needs, and validation conditions allow, the initial comparison normally contains:

- a non-learning majority/mean/median or published simple-rule baseline;
- one linear or generalized-linear candidate;
- one single-tree candidate for thresholds and interactions;
- one ensemble candidate;
- both a bagging candidate such as Random Forest/Extra Trees and a boosting candidate such as Gradient Boosting/HistGradientBoosting when both are locally available and appropriate.

Naive Bayes, SVM, KNN, neural networks, survival models, time-series models, and external boosting libraries are optional task-appropriate families, not compulsory decoration. Do not mechanically run every algorithm. If an otherwise applicable tree or ensemble family is omitted, record the exact data, task, compute, dependency, or user-constraint reason. "For simplicity," "easier to explain," "already good," and generic overfitting concern are not adequate rationales.

Run initial candidates on the same target definition, data scope, fold/split assignment, and selection metric. Fit imputers, encoders, scalers, selectors, and learned feature steps inside each training fold. Test/inference truth and inference rows never tune parameters or choose features. For promising candidates, use a bounded Grid Search, Random Search, or documented manual search and record the search space, validation strategy, primary and secondary metrics, random seed, best parameters, fold-level results, leakage control, and stopping rule. Record why tuning was not run when it would otherwise be expected.

Do not select on Accuracy alone when imbalance, asymmetric error, ranking, or calibration matters. Record a primary metric, secondary metrics such as balanced accuracy, precision, recall, F1, ROC AUC, PR AUC, calibration, fold variation and subgroup error, plus a tie-break rule, performance tolerance, and stability requirement. When models are practically tied, prefer stability, interpretability, deployment fit, lower leakage risk, and user objectives over a trivial numeric lead.

Use `modelSearch.adequacyStatus: "sufficient" | "limited" | "preliminary" | "not-applicable"`. A normal tabular search cannot be `sufficient` if it has no non-learning baseline or compares only one capability range without a task-specific rationale. `limited` and `preliminary` require a specific limitation reason and `audienceClaimLevel: "preliminary" | "current-best"`; their audience copy says "初步候选模型比较" or "当前候选范围内表现最好", never "最终模型", "最佳模型", "已经优化", or "当前最优方案". Do not create a separate limitation or rejected-model page for this status; attach the limitation to comparison, inference, or synthesis.

### Predictive Dataset Report Contract

Both output modes consume one shared predictive record and protect these elastic modules: dataset/task definition; data quality plus actual preprocessing; exploratory analysis; feature engineering; baseline; model pipeline; validation design; candidate-model comparison; selected-model performance; error analysis; feature importance/coefficient interpretation where valid; inference/test prediction; application/limitations; evidence-bearing synthesis; and closing. Modules may merge, but dataset introduction, actual preprocessing, validation strategy, baseline, model comparison, selected result, error analysis, final inference, limitations, and synthesis may not disappear.

Model results state validation sample size, folds/split, baseline, primary metrics, fold variation or uncertainty, selection rationale, result provenance, and limitations. Keep cross-validation performance, separate validation performance, inference/test predictions, external benchmark scores, and unknown test truth explicitly distinct. Never call inference output "test accuracy."

## 7. Chart specification and interaction

Use Type A fidelity rules only from [scientific-evidence-visualization.md](scientific-evidence-visualization.md) and the canonical schema in [evidence-visualization-schema.md](evidence-visualization-schema.md). Chart titles express the finding rather than merely naming variables.

For `dataset-report`:

- With two or more decisive Type A charts, make at least two genuinely interactive by default.
- With one decisive Type A chart, make it interactive unless interaction has no analytical value.
- Every static Type A chart records `staticRationale`.
- Prefer the local ECharts adapter for tooltips, switches, linked views, selection, or dynamic highlighting. Never use a CDN or call ECharts directly inside page components.

Useful interactions include exact-value tooltip, metric/category/group/method switches, legend or series focus, time-range selection, cell/category inspection, point details, linked chart-to-evidence panels, and reset. Each interaction must serve a claim, keep decisive controls visible, preserve formulas and comparison baselines, and never silently alter an axis domain.

Each decisive `ChartEvidenceSpec` declares `analyticalQuestion`, `visualThesis`, `comparisonBaseline`, `annotationTargets`, `highlightPolicy`, `readingOrder`, `interactionSpec`, `motionSpec`, `defaultState`, `resetState`, `reducedMotionState`, `printState`, and `accessibleSummary`. Deck audience, Presenter View, scroll report, and both print paths use one chart data source. Interactive charts expose stable runtime hooks and a ready state; static charts explain why interaction would not improve interpretation.

## 8. Motion contract

Allowed motion is restrained and explanatory:

- 300–600 ms chart entrance;
- bars entering from a common baseline;
- time lines drawing in time order;
- scatter points entering with opacity and slight translation;
- smooth click-to-highlight;
- fragments for staged process, model, or factor explanation;
- synchronized chart and evidence-panel updates.

Prohibit random particles, black-neon effects, 3D flips, bouncing, loops, decorative motion, scale-domain changes, data/formula changes, or conclusions that exist only in an intermediate frame. Honor `prefers-reduced-motion`; the reduced state must reveal the complete conclusion without motion. PDF always applies the declared `printState`, never a transient live state.

## 9. Output narrative order and evidence copy

For `outputMode: "slide-deck"`, use this existing flexible audience arc after findings exist:

`Cover → Background and Question → Dataset Introduction → Data Processing → Exploratory Findings → Key Groups / Rankings / Comparisons → Key Factors → Model Analysis (optional) → Deep Insight → Application Value → Boundaries → Synthesis → Closing`

Modules may merge or disappear according to duration and analytical value. Prioritize primary answer, findings, deep insight, and application value above a field dictionary or routine quality report. Keep substantive synthesis and a separate closing. For a short talk, compress to `Question → Data → Results → Insight → Synthesis`, while retaining the mandatory cover and closing rules. Follow the compact profile summary in [presentation-profiles.md](presentation-profiles.md); this file is the detailed dataset policy source.

For explicit `outputMode: "scroll-report"`, keep the same finding order and priorities but map the neutral narrative units to the section arc in [dataset-scroll-report.md](dataset-scroll-report.md). Do not derive a second outline from raw data and do not stack slide canvases vertically.
For new scroll reports, default reader questions use the already approved Finding Inventory and aggregate Evidence Registry records under [analysis-companion.md](analysis-companion.md); their temporary answers never create another Finding Inventory or replace report conclusions.

When `analysisMode: "predictive"`, use the shared predictive contract above. A deck commonly maps it to `Cover → Dataset and Prediction Task → Data Quality and Preprocessing → Exploratory Findings → Feature Engineering → Model Pipeline and Validation → Baseline and Candidate Models → Model Comparison → Selected Performance → Interpretation/Error Analysis → Inference → Application/Limitations → Synthesis → Closing`; combine pages according to density rather than forcing a count. Group differences are EDA, interpretation, or error-analysis evidence unless the task contract makes them the main question.

Apply the Audience Plain-Language Gate to titles, navigation labels, leads, takeaways, module/chart headings, report-hero answers, and synthesis headings. Internal records may use Gate, adequacy, evidence status, leakage audit, external-validity, manifest, runtime, or QA terminology; audience copy does not. The audience sentence gives the object, analysis or comparison, result value/direction, and meaning in that order when each is relevant.

Use an audience title that stands on its own. A processing page can say `缺失值分布与处理方案` or `Age 和 Fare 采用折内中位数插补`; a model result can say `Random Forest 五折准确率达到 84.6%`; a feature page can say `票价、舱位和称谓是贡献最大的三类特征`; an inference page can say `模型为 418 条测试记录生成 155 个生存预测`. Prefer object plus method, change, comparison, or result. Do not default to argumentative shells such as `而不是…`, `不能只讲…`, `不等于…`, `仍需报告…`, `价值在于…`, `为什么本页…`, `先…再…`, `支持…但…`, `需要注意…`, `本报告选择…`, `本页展示…`, or a Gate pass/reject label. Removing the conjunction is not enough; rewrite around the concrete data or result.

Takeaways report evidence, not the author's reason for including a page. Replace `质量检查的价值在于决定处理方式` with the actual field treatments and retained row count. Replace `模型波动仍需报告` with the fold range and standard deviation. Replace `内部验证支持模型选择，但不等于外部有效性` with the cross-validation value and the fact that inference truth is unavailable. Do not use a takeaway for writing methodology, QA reminders, prior-version defenses, or abstract cautions without an object and basis IDs.

Use audience categories for chapters and scroll-report navigation, such as `数据与任务`, `数据处理`, `探索性分析`, `特征工程`, `模型比较`, `模型表现`, `预测误差`, `特征贡献`, `测试集推断`, `应用与限制`, and `综合结论`. Avoid mixed/internal labels such as `解释与误差`, `应用与边界`, `设计与门控`, `证据与状态`, `推断契约`, or any Gate/QA label. A chapter should name one coherent audience topic.

Retain real limitations, but give a standalone limitation unit only when the limitation changes model selection, metric interpretation, application, credibility, or inference scope. Otherwise attach unknown test truth to inference, non-causal coefficient interpretation to feature contribution, and search limitations to model comparison or synthesis. Never create standalone pages titled `为什么没有模型`, `为什么不能解释因果`, `为什么没有外部有效性`, `下一步再进行预测`, or `替代分析方案`.

Each kept v3 narrative unit records `titleBasisIds` that resolve to its data facts, methods, results, findings, or claims; takeaways use `takeawayBasisIds` when present. During prototype and final QA, ask whether the title is understandable without body text, names a concrete object, reports a value/direction/comparison on result units, discusses the analysis rather than report construction, avoids internal terminology, and justifies an independent unit. Rewrite, merge, or remove a unit that fails comprehension.

## 10. Provenance, privacy, and mixed materials

- Keep raw, transformed, analysis, chart, and presentation assets distinct.
- Link each chart to dataset/transform/analysis IDs; do not copy unaudited values.
- Authorized analysis use, frontend exposure, and public publishing are separate decisions. The user-supplied data may be analyzed within task scope, and non-display fields may support reasonable derived features. Frontend builds package only values needed for evidence; public publishing adds a separate privacy review.
- Do not expose direct identifiers, credentials, contact details, or exact sensitive locations when they are unnecessary for the rendered evidence.
- Do not ship raw sensitive records merely to power tooltips. Aggregate/suppress small groups through a recorded transform and disclose the change.
- Publishing requires separate authorization and a built-asset privacy review. Keep `privacyReview` in records/QA; unless privacy materially changes the scientific interpretation, it does not become a slide, section, navigation item, finding, or takeaway.
- When papers/reports and an independent dataset coexist, analyze them in their respective branches and merge through stable claim/source IDs without duplicated calculations or visuals. A paper-led request stays `slide-deck`; ask the output-form question only when the independent dataset is the report's primary subject.

## 11. Prototype and QA

For `slide-deck`, the three real-data prototype roles remain:

1. normal L01 cover;
2. analysis design: background plus primary question and data-processing logic, or the most demanding analytical design page;
3. decisive result: directly answers the primary question using real data, a comparison baseline, key annotations, meaningful interaction, and declared default/reset/reduced-motion/print states.

A quality page may serve role two only when quality materially determines the analytical design. Role three is judged by the answer it proves, not by the number of controls.

For predictive work, the three roles become cover; dataset/task plus actual preprocessing/model design; and decisive model result with real validation, baseline comparison, uncertainty/fold information, and declared interaction states. The internal role review additionally inspects field coverage, fold-safe transforms, error analysis/inference traceability, evidence copy, content occupancy, plot occupancy, and closing brand duplication.

Verify shared runtime loading, visible menu/Presenter/fullscreen entries, menu operation, Presenter opening and synchronization, correct progress and page total, keyboard/hash/fragments, chart hooks, reset, reduced motion, deterministic print, privacy, and no dashboard shell. Run `BrandGeometryAudit` for cover, a representative content page, and closing, measuring non-transparent painted bounds rather than only CSS boxes.

For explicit `scroll-report`, use the hero, analysis-design, and decisive-result section prototype in [dataset-scroll-report.md](dataset-scroll-report.md). Verify ReportRuntime, visible/collapsible navigation, scrollspy, stable section hash, browser history, reading progress, chart hooks/reset, reduced motion, deterministic report print, privacy, responsive overflow, and report-role painted brand bounds. Do not require or emulate Presenter View, slide totals, L01–L24, or fixed-canvas navigation in this mode.


## Data health for new dataset scroll reports

New explicit dataset scroll reports default to a collapsed data health entry. Follow [data-health.md](data-health.md) for local generation, declared-field rules, coverage, usage, privacy, and runtime/print QA. Derived diagnostics refer to the existing Shared Evidence Core and citations; pending scaffold content is not deliverable. Slide decks and existing projects retain their behavior.
