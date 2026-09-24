# Agent-behavior design

Why the agent tooling around this repo is shaped the way it is: the hooks, gates, delegation rules and helper commands that decide how agents work here. [docs/design.md](./design.md) holds the arguments for the codebase itself; this file holds the arguments for how agents work on it. The mechanics live in [`docs/claude-code-guardrails.md`](./claude-code-guardrails.md) and the rules in [AGENTS.md](../AGENTS.md) and [`docs/agents/`](./agents/).

The citation rule is the same as docs/design.md's. Every principle cites the decisions that produced it, by issue where one exists and by commit otherwise. A candidate with only one citation is parked at the bottom until a second decision makes the same argument.

## Principles

### Block narrowly, and name the way through; nudge everything else

A block that starves the agent of information costs more than it saves: the agent retries, works around it, or stalls. So a hard block is kept for a pattern that is both narrow and never right, and its message names the route that is allowed. Anything that is only usually wrong gets a reminder instead. Every guard fails open, so a bug in a hook can't stop unrelated work.

_Instances:_ the `Read` deny on `columnConfigs.ts` comes paired with the route through it, which is to grep the sheet key and read that one object (`a7810dd`). The Bash-read guard blocks exactly two patterns, each deny message names the alternative, and a command it can't parse is allowed. The per-turn read count and the context-size warnings only remind, and they never cut off a turn (#53). An edit inside the generated folder is usually wrong but not never, since the config-sheet floor is hand-edited, so it draws a warning rather than a block (#71).

### Keep the payload on disk and the summary in context

Whatever enters the context is paid for on every later turn. A full payload, printed once, rides along through unrelated work. Show a summary that is enough to decide the next step, and keep the complete record somewhere a ranged read can reach it, so the summary never hides needed detail.

_Instances:_ a chore dry run prints one rendered line per request, and `-- --json` is the escape hatch for when a line looks wrong (`docs/how-it-runs.md`, "The chore and its dry run"). `npm run app:probe` prints keys, counts and sheet titles, and writes the full response to `.probe/last.json` for a ranged `Read` (#53).

### Delegate the reading, not the judgment

A dispatched agent starts cold and sees only what it is handed, so it is good at finding things and poor at deciding what they mean. Send out work that reads a lot and returns a little. Keep the diagnosis, and any action that needs the operator's yes, in the session that holds the task context.

_Instances:_ dispatched agents report the command they would run rather than running a gate, and must return `file:line` with verbatim quotes ([`docs/agents/delegation.md`](./agents/delegation.md), `d6b8ae3`). `repo-explorer` runs on Sonnet with read-only tools, and it locates code without diagnosing (#53). A `ready-for-agent` ticket keeps the design forks and flush shapes with its writer, and the implementer carries them out: #80 left its flush and naming rules to be inferred, and #89 had to restate them (#91).

### Approval covers what was named, and nothing next to it

A yes is scoped to the specific thing the operator saw. A general go-ahead, or approval of a neighbouring step, is not consent to an action whose effects they didn't see named.

_Instances:_ a `--send` needs a yes that names that chore, and a gsheets write needs an exact sheet, range and values (AGENTS.md, "Commands"). During design or grilling, nothing is written until the operator invokes the skill that files it: approving a design is not approving its publication (`5d5c77c`).

### Put each rule where it gets followed, and its reasoning one pointer away

What an agent loads without asking is paid for on every task, and a rule it has to go looking for is a rule it skips. So a behavior-changing rule is placed wherever it gets followed, even at the cost of repeating it, and the reasoning, examples and history are never auto-loaded: they sit exactly one pointer from the rule, behind the fixed sentence "Open a reasoning file only when you're changing the rule, or the rule's line doesn't decide your case". A rule goes on the highest rung it can reach: lint, then path-triggered (a nested `AGENTS.md`, a hook), then a router pointer, then prose. Lint needs no reader at all, and a path trigger reaches only the agents touching that folder. Hooks only reinforce, because they are Claude-only and other agents use this repo; no rule lives only in a hook. A nested `AGENTS.md` is what Codex and Cursor read, and it is paired with a one-line `CLAUDE.md` importing it because Claude Code, with a root `CLAUDE.md` present, loads a subfolder's `CLAUDE.md` on demand but not its `AGENTS.md`. README.md is a derived view for people: routing agents through a 30 KB pitch cost more than the few facts they needed from it, so those facts moved to their homes and README mirrors them. The STYLE gate denies rather than injecting docs/style.md: an injection would pay the whole file on every first edit, even when it is already in context, whereas a deny names one read and leaves the agent to take it once. It counts only a Read that covers the whole file, since a gate a five-line read unlocks is no gate.

A rules file holds only the rule: a rule line is the bolded rule plus at most a clause of scope or its one exception, and every example, instance, citation and why sits in the reasoning file. That convention replaced a 300-character cap on rule lines. The cap became a target: rules clustered just under it, padded with an example or a second clause to fill it, or squeezed to fit it, so it bought neither brevity nor clarity. Brevity and clarity are held together by the written convention and by review instead, because a number can measure only one of them. A lead is capped in bytes as well as lines, since a line count lets one long paragraph through, and a doc over 4 KB needs `##` headings, since a doc with none is one long lead read whole.

_Instances:_ docs/style.md was followed more consistently once it became one line per rule with the reasoning under `docs/style/` (`a7810dd`), and the same shape now holds docs/vocabulary.md; `src/`-only rules left the root AGENTS.md for `src/AGENTS.md`; the tier rule and the doc structure's limits moved to `npm run lint`; editing code without opening docs/style.md, the most common miss, got the gate (#108); the rule-line cap gave way to the rule-only convention, and docs/style.md's trailing examples moved to `docs/style/` (#110).

## Not yet promoted

- **End a fat session with a written handoff, not a longer turn.** Past a size threshold, a finished diagnosis is written down (the conclusion, the files and ranges to open, the hypotheses ruled out) and a fresh session starts from it. A small diagnosis in a lean session skips this. _Cited by:_ #53.
- **A spec whose premise fails is escalated, not worked around.** When a ticket's placement can only be met with plumbing that exists to get around it, the conflict goes to the developer before the code is written, not into a departure note afterward. _Cited by:_ #84.
