# Which prose file a fact belongs in

Every file has one job, and each fact lives in exactly one of them. Everywhere else, point to it.

| File | Holds |
| --- | --- |
| `AGENTS.md` | Only what changes an agent's behavior on every task: commands, gates, the Read-by-task index. Loaded every turn, so every line has to earn its place. |
| `CLAUDE.md` | `@AGENTS.md` plus pointers to Claude Code-only mechanics (subagents, hooks). |
| `README.md` | The map: what exists and where, the tiers, and the [Naming vocabulary](../../README.md#naming-vocabulary). |
| `STYLE.md` | Code shape, one line per rule. Reasoning and worked examples go under `docs/style/`. |
| `CONTEXT.md` | Operator-facing words: the glossary. |
| `DESIGN.md` | Why the codebase is shaped as it is, including deliberate absences. Covers the codebase only. |
| `docs/agent-behavior-design.md` | Why the agent tooling (hooks, gates, delegation) is shaped as it is. It never goes in DESIGN.md. |
| `docs/architecture/*.md` | Mechanics, one file per heading, indexed by `docs/architecture.md`. |
| `docs/how-it-runs.md` | Hosts, live-sheet commands and their gates, MCP, hooks. |
| `docs/agents/*.md` | Agent workflow: git, planning, delegation, issues. |

A fact the environment already states, whether in `package.json`, a config file or `--help`, stays there; a doc restating it is a cache that goes stale.
