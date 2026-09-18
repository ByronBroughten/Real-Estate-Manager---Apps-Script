# Agent instructions for this repo

A TypeScript framework for typed apps on Google Sheets + Apps Script (pushed with `clasp`), and the real-estate endpoints built on it, with a live spreadsheet serving as both database and UI.

Open only the section or disclosed doc the task needs.

## Commands

- `npm run tsc`, `npm test` and `npm run lint`: always safe. Run all three before calling a change done.
- `npm run chore <name>`: a dry run, always safe. The Node host adapter suppresses its writes. `npm run chore <name> -- --send` applies it and needs a yes **naming that chore**.
- `npm run probe`: read-only raw Sheets JSON. Stdout gets a summary and the full response goes to `.probe/last.json`.
- `npm run gen:configs` writes to the live config sheets. **Before running it, check the four standing-permission conditions** in [`docs/how-it-runs.md`](./docs/how-it-runs.md#before-touching-the-live-spreadsheet-or-deployment).
- Ask first for `npm run build`, `clasp push` / `run` / `deploy`, and any gsheets MCP write (give the exact sheet, range and values). `share_spreadsheet` needs its own yes, naming who and at what permission. Reading the live sheet needs no yes.

## Every task

- **Regenerate, never hand-edit,** the data in `src/01_generatedConfigs/`. Fix a sheet-shape bug on the sheet, then regenerate. The one exception is the config-sheet floor: [`docs/generated-data.md`](./docs/generated-data.md).
- **Read the block, not the file.** Grep `columnConfigs.ts` for the sheet key (`"occupancy":`) and read that one object. `sheetConfigs.ts` is the sheet list. A long test file works the same way: open only the `describe` block you are changing.
- **`src/` is host-neutral TypeScript**, `nodeHost/` included, with no Node or DOM APIs. The Node-specific half lives in `scripts/*.mjs`.
- **Commit or push only when asked. Implement a spec on its `issue-<n>-<slug>` branch**, even when a skill says to commit to the current branch. Branch rules: [`docs/agents/git-workflow.md`](./docs/agents/git-workflow.md).

## Read by task

| When | Open |
| --- | --- |
| Placing a file, import, or member | README tier table + [Naming vocabulary](./README.md#naming-vocabulary) |
| Writing or refactoring TypeScript, tests included | [`STYLE.md`](./STYLE.md) |
| Operator-facing words: endpoint, selector, run state, blank row | [`CONTEXT.md`](./CONTEXT.md) |
| Arguing that a gap is deliberate, or proposing a design principle | [`DESIGN.md`](./DESIGN.md) |
| Architecture mechanics: dispatch, schema classes, class chains, queued writes, round trips, type-check cost | [`docs/architecture.md`](./docs/architecture.md) index, then one file |
| Adding a deletion path | [`docs/architecture/blank-row.md`](./docs/architecture/blank-row.md) |
| A one-off job against the live sheet | [`docs/architecture/chores.md`](./docs/architecture/chores.md) |
| Hosts, chore dry run, Sheets probe, gsheets MCP, agent hooks | [`docs/how-it-runs.md`](./docs/how-it-runs.md) |
| Tests and fakes | [`docs/testing.md`](./docs/testing.md) |
| Regen `tsc` fails, or hand-written sheet/column keys disagree with generated configs | [retarget-after-gen-configs](./.claude/skills/retarget-after-gen-configs/SKILL.md) |
| Branches, landing a spec, closing an issue, `backup/*` branches | [`docs/agents/git-workflow.md`](./docs/agents/git-workflow.md) |
| Design, grilling, specs, an offered ADR, a long session's handoff | [`docs/agents/planning.md`](./docs/agents/planning.md) |
| Editing a prose doc: which file a fact belongs in | [`docs/agents/prose-files.md`](./docs/agents/prose-files.md) |
| Issues and labels | [`docs/agents/issue-tracker.md`](./docs/agents/issue-tracker.md), [`docs/agents/triage-labels.md`](./docs/agents/triage-labels.md) |
| Domain vs architecture vocabulary | [`docs/agents/domain.md`](./docs/agents/domain.md) |
| A slash-named skill not in the listing | `.claude/skills/<name>/SKILL.md` (this repo's own), else the `mattpocock-skills` plugin (`mattpocock-skills:<name>`). Never a similarly-named substitute. `grill-with-docs` means grilling + domain-modeling. |
