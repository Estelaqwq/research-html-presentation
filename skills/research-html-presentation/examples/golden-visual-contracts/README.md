# Visual-contract Golden fixtures

These fixtures are synthetic, labelled regression inputs for material-adaptive planning. They are not research claims and must never be copied into a user project. Each fixture describes the expected visual center, evidence kind, layout family, and failure cases for one common material condition.

| Fixture | Material condition | Primary regression target |
| --- | --- | --- |
| `paper-figure-led` | Paper with figures, subfigures, and captions | Preserve real figure scale, subfigure readability, and claim-to-evidence linkage |
| `data-chart-led` | Structured dataset or existing chart | Make the chart the visual center and keep comparison/units traceable |
| `text-structure-led` | Text-only report | Use hierarchy, matrix, or relation structure without invented evidence |
| `method-process-led` | Technical route or project method | Validate FlowSpec topology, roles, feedback, and non-overlap |
| `equation-validation-led` | Formula plus validation evidence | Keep equations, variable definitions, and validation plots as one composition |

The fixtures are consumed by `scripts/test_golden_visual_contracts.mjs`. Runtime Goldens under `examples/golden-*` remain the end-to-end build/print regression set; these fixtures add visual-planning coverage without pretending that a TODO scaffold is a visual-quality reference.
