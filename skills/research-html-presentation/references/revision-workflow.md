# Existing-report revisions

Use this path for edits to an existing deck/report. Reuse its confirmed output form, style, source records and current authoring patch. Read the instructions for the affected feature; a spelling or emphasis change does not restart dataset profiling, outlining or prototype approval.

Classify by the actual effect, not by how small the request sounds:

| Change | Validation focus |
| --- | --- |
| Spelling, phrasing with unchanged meaning, selective emphasis | Affected copy and wrapping, mixed regular/bold editing, Save/Reload, desktop/narrow layout and print |
| Spacing, sizing or composition | Affected units and adjacent sections; rendering, navigation/brand obstruction and output layout |
| Editing, flow, assistant, health or toolbar interaction | Changed behavior, persistence, import/export, keyboard/narrow view and print exclusion |
| Data, number, unit, denominator, source, method or interpretation | Recheck affected evidence and recompute dependent results; run full verification |

After building, `scripts/verify_revision.mjs <project-root> --kind copy|layout|interaction|data` runs checks for the declared scope. `--plan` explains that scope without claiming validation passed. Copy/layout/interaction results are explicitly local revision checks, not formal release approval. Retain the earlier evidence verification only when its inputs and calculations are unchanged. If this cannot be established, take the full path.

Inspect the changed units and affected neighbors; changes to shared styles or runtimes require all affected units and a representative deck/report regression. Do not rerun unrelated raw-data analyses merely to adjust text weight. Formal publication, final deliverable export and scientific-evidence changes still use `verify_project.mjs --runtime --render` and the applicable PDF/offline validation.

When a browser patch exists, preserve and rebase it by stable field identity before source regeneration. Report conflicts rather than silently dropping user edits. Existing reports gain new runtime features only through an explicit, checked component update; updating the skill does not modify all old projects.
