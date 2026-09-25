# Design, specs, tickets and handoffs

- **During design or grilling, write nothing** until the user invokes the skill that files it. Approving a design does not approve publishing it. Reads are fine, and a subagent can do them ([`delegation.md`](./delegation.md)).
- **A plan or spec includes the matching prose-file edit** in its own scope ([`prose-files.md`](./prose-files.md)).
- **When a skill offers an ADR, propose a packages/framework/docs/design.md entry** instead: a new instance (a sentence in that principle's `docs/design/` file), a parked candidate (a line plus a heading in `docs/design/candidates.md`), or, with two citations, a new principle (a line plus a reasoning file). This repo keeps no `docs/adr/` tree ([`domain.md`](./domain.md)).

## Model fit

- **After `/to-tickets` publishes**, print the tickets as one flat list in completion order, `#n Title: Sonnet|Opus|Grok (reason)`. Chat only: never in a ticket, comment or parent issue.
- **After `/to-spec` publishes**, say in one chat line whether Sonnet can handle the spec, Opus is recommended, or Grok fits, and why. Say nothing if the developer has explicitly agreed in the conversation that it becomes tickets. The developer switches models with `/model`; never dispatch an implementer.
- **Sonnet:** fully specified, an existing pattern, one package (a migrate batch needing judgment, a chore, an endpoint on existing machinery, a doc edit). **Opus:** type-level framework work, both packages or the framework's public entry, a new deletion path, an open design fork, or a wide refactor's contract or integrate-and-verify ticket.
- **Grok (medium effort):** only when `tsc`, tests or lint verify the whole diff and it adds no new name, comment, doc or class shape: a rename or move following an exact stated pattern, a batch of identical edits, a retarget after `gen:configs`. Never a ticket that writes prose or an AGENTS.md/doc edit, mints a member or method name, adds a comment, or restructures a test. A mixed ticket is Sonnet. The reason must name what verifies it.

## Handoffs

Write a handoff when a diagnosis finishes in a session that got a context-size nudge, and do it before implementing. It holds the conclusion, the files and line ranges to open, and the hypotheses already ruled out. Post it as a comment on the issue, or save it as a file if there is no issue, then recommend a fresh session. A small diagnosis in a lean session needs no handoff.
