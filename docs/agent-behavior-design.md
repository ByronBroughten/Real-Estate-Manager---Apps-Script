# Agent-behavior design

Why the agent tooling around this repo is shaped the way it is: the hooks, gates, delegation rules and helper commands that decide how agents work here. [DESIGN.md](../DESIGN.md) holds the arguments for the codebase itself; this file holds the arguments for how agents work on it. The mechanics live in [`docs/how-it-runs.md`](./how-it-runs.md) ("Claude Code guardrails") and the rules in [AGENTS.md](../AGENTS.md) and [`docs/agents/`](./agents/).

The citation rule is the same as DESIGN.md's. Every principle cites the decisions that produced it, by issue where one exists and by commit otherwise. A candidate with only one citation is parked at the bottom until a second decision makes the same argument.

## Principles

### Block narrowly, and name the way through; nudge everything else

A block that starves the agent of information costs more than it saves: the agent retries, works around it, or stalls. So a hard block is kept for a pattern that is both narrow and never right, and its message names the route that is allowed. Anything that is only usually wrong gets a reminder instead. Every guard fails open, so a bug in a hook can't stop unrelated work.

_Instances:_ the `Read` deny on `columnConfigs.ts` comes paired with the route through it, which is to grep the sheet key and read that one object (`a7810dd`). The Bash-read guard blocks exactly two patterns, each deny message names the alternative, and a command it can't parse is allowed. The per-turn read count and the context-size warnings only remind, and they never cut off a turn (#53). An edit inside the generated folder is usually wrong but not never, since the config-sheet floor is hand-edited, so it draws a warning rather than a block (#71).

### Keep the payload on disk and the summary in context

Whatever enters the context is paid for on every later turn. A full payload, printed once, rides along through unrelated work. Show a summary that is enough to decide the next step, and keep the complete record somewhere a ranged read can reach it, so the summary never hides needed detail.

_Instances:_ a chore dry run prints one rendered line per request, and `-- --json` is the escape hatch for when a line looks wrong (`docs/how-it-runs.md`, "The chore and its dry run"). `npm run probe` prints keys, counts and sheet titles, and writes the full response to `.probe/last.json` for a ranged `Read` (#53).

### Delegate the reading, not the judgment

A dispatched agent starts cold and sees only what it is handed, so it is good at finding things and poor at deciding what they mean. Send out work that reads a lot and returns a little. Keep the diagnosis, and any action that needs the operator's yes, in the session that holds the task context.

_Instances:_ dispatched agents report the command they would run rather than running a gate, and must return `file:line` with verbatim quotes ([`docs/agents/delegation.md`](./agents/delegation.md), `d6b8ae3`). `repo-explorer` runs on Sonnet with read-only tools, and it locates code without diagnosing (#53). A `ready-for-agent` ticket keeps the design forks and flush shapes with its writer, and the implementer carries them out: #80 left its flush and naming rules to be inferred, and #89 had to restate them (#91).

### Approval covers what was named, and nothing next to it

A yes is scoped to the specific thing the operator saw. A general go-ahead, or approval of a neighbouring step, is not consent to an action whose effects they didn't see named.

_Instances:_ a `--send` needs a yes that names that chore, and a gsheets write needs an exact sheet, range and values (AGENTS.md, "Commands"). During design or grilling, nothing is written until the operator invokes the skill that files it: approving a design is not approving its publication (`5d5c77c`).

## Not yet promoted

- **End a fat session with a written handoff, not a longer turn.** Past a size threshold, a finished diagnosis is written down (the conclusion, the files and ranges to open, the hypotheses ruled out) and a fresh session starts from it. A small diagnosis in a lean session skips this. _Cited by:_ #53.
- **A spec whose premise fails is escalated, not worked around.** When a ticket's placement can only be met with plumbing that exists to get around it, the conflict goes to the developer before the code is written, not into a departure note afterward. _Cited by:_ #84.
