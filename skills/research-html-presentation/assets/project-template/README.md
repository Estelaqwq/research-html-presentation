# Canonical runnable project scaffold

`scripts/scaffold_project.mjs` composes `common/` with exactly one renderer template:

- `deck/` for `research-deck` and `dataset-deck`;
- `report/` for `dataset-scroll-report`;
- `authoring/` by default for new projects; pass `--no-authoring` for an explicit read-only scaffold.
- Pass `--visual-style academic-light` (default) or `--visual-style tech-engineering-dark` to record the selected visual skin in the manifest. Legacy/omitted values resolve to `academic-light`.

The scaffold copies the corresponding canonical runtime from `assets/react-template/`, declares local React/Vite dependencies, and produces real `dev`, `build`, `preview`, and `verify` commands. Its three units remain explicit `待填充` placeholders at `stage: "prototype"`; they are runnable structure, never research evidence or finished topic content.

Deck and report templates intentionally remain separate. The report template never imports `DeckRuntime`, Presenter View, L01–L24, or deck PDF behavior. The deck template never converts slides into a scrolling document.
