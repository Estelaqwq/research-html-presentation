# Scientific plot recipes

Use when trusted structured observations or verified estimates need statistical figures. This extends Type A rendering in the existing Shared Evidence Core; it does not create another analysis pipeline. For source-only raster figures, retain the fidelity gate in [scientific-evidence-visualization.md](scientific-evidence-visualization.md).

## Select by the question

| Question | Reusable component | Required input / boundary |
|---|---|---|
| How do groups differ, and how variable are they? | `ScientificDistributionChart` | Independent observation IDs + supplied box summaries; optional means and defined intervals. Raw points, Q1–Q3, median, Tukey whiskers, n. No KDE/violin is inferred. |
| How did the same units change? | `PairedObservationChart` | Stable ID, before/after, units. Null remains missing; count complete and incomplete pairs in caption. No automatic paired test. |
| How precise is a trend? | `UncertaintyTrendChart` | Ordered unique time labels, estimates, bounds, n, interval definition. Break line and band at missing values; declare pointwise vs simultaneous coverage. |
| How large are estimated effects? | `CoefficientIntervalChart` | Estimate/lower/upper/n, effect units, CI method, reference. Linear effects often reference 0; ratios may use log scale with positive bounds and reference 1. Do not infer a ratio scale from names. |
| Does the fitted relation warrant the story? | `RegressionDiagnosticChart` | Observations plus supplied fitted values/residuals, ordered fit coordinates and interval definition. Separate residual panel. The component does not fit a model. |
| Which result leads the argument? | `ScientificPanelGrid` | One hero figure + supporting figures, A/B/C reading order. Child evidence IDs remain distinct. Share domains only for genuinely comparable quantities. |

All components are exported by `assets/react-template/dataset-charts/index.ts`, wrap `DatasetChartFrame`, accept the existing `visual`, `spec`, `adapter`, `caption`, `visualStyle`, and use `input` for validated scientific data. Pure option builders and validation types are exported for reuse/testing. Add these assets to a new project via `scaffold_project.mjs --scientific-charts`; dataset scaffolds include them automatically. A regular non-chart project does not need ECharts.

```tsx
import * as echarts from "echarts";
import {createEChartsAdapter} from "./runtime/chart-adapters/echarts";
import {CoefficientIntervalChart} from "./runtime/dataset-charts";
const adapter = createEChartsAdapter(echarts); // create once, outside render
// input comes from the project's verified analysis output, never from invented numbers.
<CoefficientIntervalChart visual={visual} spec={chartSpec} adapter={adapter}
  visualStyle={manifest.visualStyle} caption="Effect size and 95% CI; independent subjects."
  input={coefficientResult} />
```

Existing `ChartForm` values cover these recipes: `box-plot`, `slopegraph`, `line`, `dot-plot`, `scatter`, `small-multiples`. The form alone does not document the method: retain `analyticalQuestion`, `visualThesis`, `encodedFields`, `comparisonBaseline`, `claimVisualFit`, `selectionRationale`, actual transform IDs and alternative forms in `ChartEvidenceSpec`. The gallery's synthetic IDs are fixtures, never project evidence.

## Statistical input contract

- Declare independent sampling unit, sample counts, interval **kind** (`CI`, `SD`, `SE`, `prediction`), level where applicable, and method. A mean alone cannot supply an interval. Group-level independent rows suit the distribution recipe; repeated measurements need an explicit subject/cluster-aware analysis upstream.
- Renderers validate finite values, ordered bounds, unique IDs and consistent group n. They do not determine whether assumptions, confounder adjustment, sampling design or inference are scientifically appropriate. Record these in analysis and limitations.
- Use `null` for missing observations. Zero is a measured value. `DistributionChart` defaults to gaps for absent group/bin cells; opt into `missingPolicy="zero"` only when absent cells are documented empty bins. An explicit null stays null even then.
- `Slopegraph` defaults to increasing numeric values upwards. Rankings explicitly pass `valueMode="rank"`. Existing rank callers need this option when updating the component.
- Supplied box summaries use linear quantiles and Tukey 1.5 IQR whiskers; all valid raw observations, including outliers, remain visible. The caption must match that definition. Use a different custom recipe if the source defines other whiskers.
- Show n and exclusions in nearby copy. A paired chart connects complete pairs; it must not silently imply unmatched rows were paired. No automatic p-values, significance stars, regression, interval estimation or causal claims.

## Presentation styling and annotations

Use semantic palettes, not a universal color ramp: `categorical` for groups, `sequential` for nonnegative magnitude, `diverging` for signed values around a declared neutral reference. Correlations use `[-1,1]` and a neutral center. Null heatmap cells are absent, never colored as zero. Maintain group-color/marker mapping across panels. Do not introduce 3D bars, glowing curves or gradients that encode a fake numerical relationship.

`profile="slide"` (default) uses 18px axes at the intended chart canvas; `manuscript` uses a more compact profile. Measure readability on the actual deck/report and smallest intended screen; do not transplant a 7pt journal style into a projected slide. Poster title fonts remain restricted to titles; chart numbers/axes use a legible sans serif. In dark style, retain saturated blue structure and sparse gold; preserve statistical contrast. Use direct text/line/shape differences where color alone would carry meaning.

`annotationTargets` now renders all entries, with optional `detail` and `critical`. The first falls back to `visualThesis` for legacy compatibility; later entries do not repeat that paragraph. Keep annotations selective and near the evidence; use chart-coordinate callouts in a custom option when a point needs an exact anchor. Do not turn all labels into long annotations.

For coefficients, show the original table or precision tooltip when exact values matter. For an existing published forest plot or geometry-bearing figure, verified labels alone still do not authorize reconstruction of its geometry; retain the source figure under the fidelity gate.

## Static figures and reproducibility

For independent SVG/PDF/PNG figures use `scripts/export_scientific_figure.py`. It takes the **same verified numeric input** as the component, uses scoped Matplotlib settings, keeps fonts in SVG as paths for portable appearance, and writes input SHA256 + export settings beside outputs. It never bootstraps or fits models during rendering. Dependencies are NumPy + Matplotlib; fitting the synthetic fixture additionally uses SciPy. Inspect available local runtimes first; do not add a service or download packages without need.

```text
python scripts/export_scientific_figure.py --input analysis-result.json --kind coefficient --style academic-light --profile slide --output figures/effects
python scripts/export_scientific_figure.py --input analysis-result.json --kind coefficient --style tech-engineering-dark --profile manuscript --output figures/effects-dark
```

Supported kinds: `distribution`, `paired`, `trend`, `regression`, `coefficient`, `multipanel`. Input may be the individual recipe object, or a bundle keyed by those names (multipanel requires distribution/trend/coefficient). For journal submission, check required dimensions, fonts, editable-text/vector policy and color rules separately; exporting a vector file does not certify publication compliance. Keep raw values, analysis code and editable source with the export.

The optional source fixture `assets/scientific-plot-gallery/` shows six simplified/enhanced comparisons in both skins, including missing points and incomplete pairs. It is a capability gallery, not a real reporting subject or a finished research deck. `scripts/create_scientific_gallery.mjs --output <new-directory>` assembles a runnable source project without downloading dependencies. `scripts/generate_scientific_demo.py` regenerates the deterministic fixture; raw observations, transform methods and seed are included. Inspect rendered geometry and behavior with `scripts/test_scientific_charts.mjs` and gallery browser QA. Test invalid bounds, null vs zero, rank orientation, positive/log geometry and palette meaning, not source keywords alone.

## Design references consulted 2026-10-20

These are sources of design ideas, not extra runtime rules or auto-invoked dependencies. Implementation here is original; no external skill files or illustration assets are copied.

- [nature-figure](https://github.com/jing1312/nature-figure-skill/tree/main/skills/nature-figure): analytical question → figure form, hero/support panel hierarchy. Its journal sizes and approval workflow are not imported.
- [K-Dense scientific-visualization](https://github.com/K-Dense-AI/scientific-agent-skills/blob/main/skills/scientific-visualization/SKILL.md): explicit uncertainty/sampling units, semantic palettes, reproducible export.
- [schematic-figure](https://github.com/lgwrightlab/schematic-figure): code-generated vector geometry and reviewable structure. Quantitative statistical plots here stay code/data driven.
- [SciencePlots](https://github.com/garrettj403/SciencePlots): scoped styles and medium-specific figure settings. No global style or LaTeX dependency is imposed.
