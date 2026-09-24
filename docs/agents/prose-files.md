# Which prose file a fact belongs in

Every file has one job, and each fact lives in exactly one of them. Everywhere else, point to it. The one exception is a behavior-changing rule, repeated on purpose where it gets followed. Why the scheme is shaped this way: [`docs/agent-behavior-design.md`](../agent-behavior-design.md).

## Terms

- **Rules file**: an index file under `docs/` or `packages/*/docs/` of bolded one-line rules (docs/style.md, and the framework's `docs/vocabulary.md` and `docs/design.md`), with one-sentence scope, the fixed sentence on when to open reasoning, and a "When | File" table under `## Reasoning files` into its reasoning folder. A rule line carries only the rule: the bolded rule plus at most a short clause of scope or its one exception. It must be both brief and clear, and no length cap stands in for either. Examples, instances, citations and the why go in its reasoning file.
- **Reasoning file**: a file under a rules file's `docs/<name>/` folder holding the why, examples, instances and history. It is never auto-loaded. A rules-file section with anything beyond its rules gets one.
- **Router**: the Read-by-task table in the root AGENTS.md. It is the only one.
- **Nested AGENTS.md**: a folder's own rules, loaded when an agent works there, paired with a one-line `CLAUDE.md` holding `@AGENTS.md`.
- **Mechanics doc**: a reference file under `docs/` or `packages/*/docs/` read by heading. It opens with a lead of 5 lines and 800 bytes or fewer, and any such file over 4 KB must have `##` headings (lint checks both; a shorter doc with no heading is read whole). Its headings are specific enough to grep, and a rule found in it moves up to a rules file or nested AGENTS.md, leaving a pointer. One that covers subjects sharing nothing is split and indexed.
- **Enforcement ladder**: lint > path-triggered (nested AGENTS.md, a hook) > router pointer > prose.
- **Derived view**: a file that restates facts whose home is elsewhere, for another audience. README.md is one.

## Map

### Root

| File | Holds |
| --- | --- |
| `AGENTS.md` | Only what changes an agent's behavior on every task: commands, gates, git rules, the README line, the router. Loaded every turn, under 5 KB. |
| `CLAUDE.md` | `@AGENTS.md` plus pointers to Claude Code-only mechanics (subagents, hooks). |
| `CONTEXT.md` | The app's operator-facing words (units, the occupancy ledger), after a pointer to the framework glossary. |
| `docs/style.md` | Code shape for both packages, one line per rule, rule only. Reasoning, examples and instances go under `docs/style/`. |
| `docs/agent-behavior-design.md` | Why the agent tooling (hooks, gates, delegation, this doc scheme) is shaped as it is. It never goes in the framework's `docs/design.md`. |
| `docs/targets-and-gates.md` | The `dev`/`app` targets, what needs a yes first, and the gsheets MCP write rules. |
| `docs/claude-code-guardrails.md` | The Claude Code hooks and project agent. |
| `docs/occupancy-ledger.md` | How the occupancy ledger is built, beyond CONTEXT.md's words for it. |
| `docs/agents/*.md` | Agent workflow: git, planning, delegation, issues. |
| `packages/real-estate/CLAUDE.md` | Only the restart-at-root notice for a session started inside the app package. |
| `packages/real-estate/src/businessEndpoints/AGENTS.md` | That folder's rules, 10 lines or fewer (lint), with a `CLAUDE.md` beside it. |
| `README.md` | A derived view for people on GitHub. Nothing routes agents to it. Update it when a fact it mirrors changes (table below). |

### Framework (`packages/framework/`)

Its `docs/`, `CONTEXT.md` and `README.md` ship with the package, so they link only inside it (lint). Its `AGENTS.md` and `CLAUDE.md` files are for contributors here and may point at root.

| File | Holds |
| --- | --- |
| `CLAUDE.md` | Only the restart-at-root notice for a session started inside the package. |
| `src/AGENTS.md` | Rules an agent can only break by touching `src/`: the tiers, downward dependencies, the boundary question, host and platform neutrality, generated data. 15 lines or fewer (lint). |
| `src/chores/`, `src/00_Source/GoogleSheets/`, `src/01_SpreadsheetSchema/`, `src/02_SpreadsheetRaw/`, `src/06_API/` and `scripts/` `AGENTS.md` | That folder's rules, 10 lines or fewer (lint), each with a `CLAUDE.md` beside it. |
| `CONTEXT.md` | Operator-facing words every app on the framework shares: sheet layout, endpoints, columns. Each term is a definition of what it is, its relationships and its avoid-aliases; what the app does with it goes in the mechanics doc that owns that behavior. |
| `docs/vocabulary.md` | The architecture words, one line per term. |
| `docs/vocabulary/*.md` | Each term's elaboration, split by subject, indexed by `docs/vocabulary.md`'s "When \| File" table. |
| `docs/design.md` | Why the codebase is shaped as it is, including deliberate absences, one line per principle. Covers the codebase only. |
| `docs/design/*.md` | Each principle's argument and instances, one file per principle, plus `candidates.md` for the parked ones. |
| `docs/architecture/*.md` | Mechanics, one file per heading, indexed by `docs/architecture.md`. |
| `docs/how-it-runs.md` | The two hosts, the rollup preset, the `sheets-framework` bin, the dev project, the chore dry run, auth failure, the probe, what the gsheets MCP can see. |
| `docs/generated-data.md`, `docs/generated-data/*.md` | The generated configs: the index and regen path, then one file per constant, the config sync and the floor. |
| `docs/testing.md` | The fakes, the seams and the exemplar columns. |
| `README.md` | The consumer's face: install, the public entry, the bin. A derived view like the root one (table below). |

## What README.md mirrors

`grep '^#' README.md` shows its shape without reading it.

| README section | Mirrors |
| --- | --- |
| Opening paragraph | What the project manages: CONTEXT.md |
| Two layers, one codebase | Framework vs business boundary: `packages/framework/src/AGENTS.md` |
| Architecture: the numbered tiers | The tier list: `packages/framework/src/AGENTS.md`; the words: the framework's `docs/vocabulary.md` |
| Generated data — do not hand-edit | [`generated-data.md`](../../packages/framework/docs/generated-data.md) |
| Testing | [`testing.md`](../../packages/framework/docs/testing.md) |
| Known rough edges | The properties-probe blind spot: [`round-trips.md`](../../packages/framework/docs/architecture/round-trips.md) and `SpreadsheetRaw`'s placement reporter |

### The framework's README.md

| README section | Mirrors |
| --- | --- |
| Opening paragraph | What the package is: its `package.json` description |
| Install | `peerDependencies` and `exports` in its `package.json` |
| The public entry | `src/framework.ts` and `src/frameworkTesting.ts` |
| The bin | The bin's usage text (`scripts/sheets-framework.mjs`) and [`how-it-runs.md`](../../packages/framework/docs/how-it-runs.md#the-sheets-framework-bin) |
| Docs | The framework's `docs/` indexes and `CONTEXT.md` |

A fact the environment already states, whether in `package.json`, a config file or `--help`, stays there; a doc restating it is a cache that goes stale. `npm run lint` checks the links and the size limits above (`scripts/lintDocs.mjs`). It also holds the framework's published docs (its `docs/`, `CONTEXT.md` and `README.md`) to links inside `packages/framework`; its `AGENTS.md` and `CLAUDE.md` files may point at root.
