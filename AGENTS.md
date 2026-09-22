# Agent instructions for this repo

A TypeScript framework for typed apps on Google Sheets + Apps Script (pushed with `clasp`), and the real-estate endpoints built on it, with a live spreadsheet serving as both database and UI.

Open only the section or disclosed doc the task needs.

## Commands

- `npm run tsc`, `npm test` and `npm run lint`: always safe. Run all three before calling a change done, and treat a new type error as yours unless a clean checkout has it too.
- `npm run chore <name>`: a dry run, always safe. The Node host adapter suppresses its writes. `npm run chore <name> -- --send` applies it and needs a yes **naming that chore**.
- `npm run probe`: read-only raw Sheets JSON. Stdout gets a summary and the full response goes to `.probe/last.json`; read a line range of it, never print a full body into the chat. Ask before any other script that opens the `clasp` credential.
- `npm run gen:configs` writes to the live config sheets. **Before running it, check the four standing-permission conditions** in [`docs/how-it-runs.md`](./docs/how-it-runs.md#before-touching-the-live-spreadsheet-or-deployment).
- Ask first for `npm run build`, `clasp push` / `run` / `deploy`, and any gsheets MCP write (give the exact sheet, range and values). `share_spreadsheet` needs its own yes, naming who and at what permission. Reading the live sheet needs no yes.

## Every task

- **README.md is for humans.** Nothing in it is needed for a task here; open it only to keep it accurate ([`docs/agents/prose-files.md`](./docs/agents/prose-files.md)).
- **Working in a folder with its own `AGENTS.md`**, read it first: `src/` and several folders below it, and `scripts/`, each have one.
- **Commit or push only when asked. Implement a spec on its `issue-<n>-<slug>` branch**, even when a skill says to commit to the current branch. Branch rules: [`docs/agents/git-workflow.md`](./docs/agents/git-workflow.md).

## Read by task

| When | Open |
| --- | --- |
| Placing a file, import, or member; naming an accessor; Meta vs primary; Raw, Identified or Named | [`src/AGENTS.md`](./src/AGENTS.md) + [`docs/vocabulary.md`](./docs/vocabulary.md) |
| Writing or refactoring TypeScript, tests included | [`docs/style.md`](./docs/style.md) |
| Operator-facing words: endpoint, selector, run state, blank row | [`CONTEXT.md`](./CONTEXT.md) |
| Arguing that a gap is deliberate, or proposing a design principle | [`docs/design.md`](./docs/design.md) |
| Architecture mechanics: dispatch, schema classes, class chains, queued writes, round trips, type-check cost | [`docs/architecture.md`](./docs/architecture.md) index, then one file |
| Adding a deletion path | [`docs/architecture/blank-row.md`](./docs/architecture/blank-row.md) |
| A one-off job against the live sheet | [`docs/architecture/chores.md`](./docs/architecture/chores.md) |
| Hosts, chore dry run, Sheets probe, gsheets MCP | [`docs/how-it-runs.md`](./docs/how-it-runs.md) |
| Claude Code hooks and the project agent | [`docs/claude-code-guardrails.md`](./docs/claude-code-guardrails.md) |
| Tests and fakes | [`docs/testing.md`](./docs/testing.md) |
| Regen `tsc` fails, or hand-written sheet/column keys disagree with generated configs | [retarget-after-gen-configs](./.claude/skills/retarget-after-gen-configs/SKILL.md) |
| Branches, landing a spec, closing an issue, `backup/*` branches | [`docs/agents/git-workflow.md`](./docs/agents/git-workflow.md) |
| Design, grilling, specs, an offered ADR, a long session's handoff | [`docs/agents/planning.md`](./docs/agents/planning.md) |
| Editing a prose doc: which file a fact belongs in | [`docs/agents/prose-files.md`](./docs/agents/prose-files.md) |
| Issues and labels | [`docs/agents/issue-tracker.md`](./docs/agents/issue-tracker.md), [`docs/agents/triage-labels.md`](./docs/agents/triage-labels.md) |
| Domain vs architecture vocabulary | [`docs/agents/domain.md`](./docs/agents/domain.md) |
| A slash-named skill not in the listing | `.claude/skills/<name>/SKILL.md` (this repo's own), else the `mattpocock-skills` plugin (`mattpocock-skills:<name>`). Never a similarly-named substitute. `grill-with-docs` means grilling + domain-modeling. |
