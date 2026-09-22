# Which prose file a fact belongs in

Every file has one job, and each fact lives in exactly one of them. Everywhere else, point to it. The one exception is a behavior-changing rule, repeated on purpose where it gets followed. Why the scheme is shaped this way: [`docs/agent-behavior-design.md`](../agent-behavior-design.md).

## Terms

- **Rules file**: a root file of bolded one-line rules (STYLE.md, VOCABULARY.md, DESIGN.md), with one-sentence scope, a "When | File" table into its reasoning folder, and the fixed sentence on when to open reasoning.
- **Reasoning file**: a file under a rules file's `docs/<name>/` folder holding the why, examples and history. It is never auto-loaded.
- **Router**: the Read-by-task table in the root AGENTS.md. It is the only one.
- **Nested AGENTS.md**: a folder's own rules, loaded when an agent works there, paired with a one-line `CLAUDE.md` holding `@AGENTS.md`.
- **Mechanics doc**: a reference file under `docs/` read by heading. It opens with a lead of 5 lines or fewer (lint checks every `docs/` file that has a `##` heading), its headings are specific enough to grep, and a rule found in it moves up to a rules file or nested AGENTS.md, leaving a pointer. One that covers subjects sharing nothing is split and indexed.
- **Enforcement ladder**: lint > path-triggered (nested AGENTS.md, a hook) > router pointer > prose.
- **Derived view**: a file that restates facts whose home is elsewhere, for another audience. README.md is one.

## Map

| File | Holds |
| --- | --- |
| `AGENTS.md` | Only what changes an agent's behavior on every task: commands, gates, git rules, the README line, the router. Loaded every turn, under 5 KB. |
| `CLAUDE.md` | `@AGENTS.md` plus pointers to Claude Code-only mechanics (subagents, hooks). |
| `src/AGENTS.md` | Rules an agent can only break by touching `src/`: the tiers, downward dependencies, the boundary question, host and platform neutrality, generated data. 15 lines or fewer (lint). |
| `src/businessEndpoints/`, `src/chores/`, `src/00_Source/GoogleSheets/`, `src/01_SpreadsheetSchema/`, `src/02_SpreadsheetRaw/`, `src/06_API/`, `scripts/` `AGENTS.md` | That folder's rules, 10 lines or fewer (lint), each with a `CLAUDE.md` beside it. |
| `STYLE.md` | Code shape, one line per rule. Reasoning and worked examples go under `docs/style/`. |
| `VOCABULARY.md` | The architecture words, one line per term. |
| `docs/vocabulary/*.md` | Each term's elaboration, split by subject, indexed by VOCABULARY.md's "When \| File" table. |
| `CONTEXT.md` | Operator-facing words: the glossary. Each term is a definition of what it is, its relationships and its avoid-aliases; what the app does with it goes in the mechanics doc that owns that behavior. |
| `DESIGN.md` | Why the codebase is shaped as it is, including deliberate absences, one line per principle. Covers the codebase only. |
| `docs/design/*.md` | Each principle's argument and instances, one file per principle, plus `candidates.md` for the parked ones. |
| `docs/agent-behavior-design.md` | Why the agent tooling (hooks, gates, delegation, this doc scheme) is shaped as it is. It never goes in DESIGN.md. |
| `docs/architecture/*.md` | Mechanics, one file per heading, indexed by `docs/architecture.md`. |
| `docs/how-it-runs.md` | Hosts, live-sheet commands and their gates, the probe, MCP. |
| `docs/claude-code-guardrails.md` | The Claude Code hooks and project agent. |
| `docs/generated-data.md`, `docs/generated-data/*.md` | The generated configs: the index and regen path, then one file per constant, the config sync and the floor. |
| `docs/testing.md` | The fakes, the seams and the exemplar columns. |
| `docs/occupancy-ledger.md` | How the occupancy ledger is built, beyond CONTEXT.md's words for it. |
| `docs/agents/*.md` | Agent workflow: git, planning, delegation, issues. |
| `README.md` | A derived view for people on GitHub. Nothing routes agents to it. Update it when a fact it mirrors changes (table below). |

## What README.md mirrors

`grep '^#' README.md` shows its shape without reading it.

| README section | Mirrors |
| --- | --- |
| Opening paragraph | What the project manages: CONTEXT.md |
| Two layers, one codebase | Framework vs business boundary: `src/AGENTS.md` |
| Architecture: the numbered tiers | The tier list: `src/AGENTS.md`; the words: VOCABULARY.md |
| Generated data — do not hand-edit | [`docs/generated-data.md`](../generated-data.md) |
| Testing | [`docs/testing.md`](../testing.md) |
| Known rough edges | The properties-probe blind spot: [`docs/architecture/round-trips.md`](../architecture/round-trips.md) and `SpreadsheetRaw`'s placement reporter |

A fact the environment already states, whether in `package.json`, a config file or `--help`, stays there; a doc restating it is a cache that goes stale. `npm run lint` checks the links and the size limits above (`scripts/lintDocs.mjs`).
