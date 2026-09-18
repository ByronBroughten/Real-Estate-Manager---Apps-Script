# Design, specs and handoffs

- **During design or grilling, write nothing** until the user invokes the skill that files it. Approving a design does not approve publishing it. Reads are fine, and a subagent can do them ([`delegation.md`](./delegation.md)).
- **A plan or spec includes the matching prose-file edit** in its own scope ([`prose-files.md`](./prose-files.md)).
- **When a skill offers an ADR, propose a DESIGN.md entry** instead: either a new instance of an existing principle, or a parked candidate. This repo keeps no `docs/adr/` tree ([`domain.md`](./domain.md)).

## Handoffs

Write a handoff when a diagnosis finishes in a session that got a context-size nudge, and do it before implementing. It holds the conclusion, the files and line ranges to open, and the hypotheses already ruled out. Post it as a comment on the issue, or save it as a file if there is no issue, then recommend a fresh session. A small diagnosis in a lean session needs no handoff.
