# Design, specs, tickets and handoffs

- **During design or grilling, write nothing** until the user invokes the skill that files it. Approving a design does not approve publishing it. Reads are fine, and a subagent can do them ([`delegation.md`](./delegation.md)).
- **A plan or spec includes the matching prose-file edit** in its own scope ([`prose-files.md`](./prose-files.md)).
- **When a skill offers an ADR, propose a packages/framework/docs/design.md entry** instead: a new instance (a sentence in that principle's `docs/design/` file), a parked candidate (a line plus a heading in `docs/design/candidates.md`), or, with two citations, a new principle (a line plus a reasoning file). This repo keeps no `docs/adr/` tree ([`domain.md`](./domain.md)).

## Model fit

- **After `/to-tickets` publishes**, print the tickets as one flat list in completion order, `#n Title: <Model> <effort> (reason)`. Chat only: never in a ticket, comment or parent issue.
- **After `/to-spec` publishes**, say in one chat line which pair fits the spec, in the same form, and why. Say nothing if the developer has explicitly agreed in the conversation that it becomes tickets. The developer switches with `/model` and `/effort`; never dispatch an implementer.
- **Pick from seven pairs only:** Sonnet medium, Sonnet high, Opus low, Opus medium, Opus high, Grok medium, Grok high. Criteria for each and their evidence: [`model-fit.md`](./model-fit.md).
- **Tie-break: the cheapest pair likely to pass review on the first try.** Cost is the Claude Code weekly limit; Grok in Cursor is free at the margin.
- **A Claude pick adds `· near limit: Grok <effort>`** when the ticket also passes Grok's rule, and nothing when it doesn't.
- **Grok only when `tsc`, tests or lint check the whole diff**, adding names only as stated word for word, and no prose, comment, doc, class shape or test restructure. A mixed ticket goes to Claude. The reason names what checks the diff and reminds the developer to have Grok read both style docs first.

## Handoffs

Write a handoff when a diagnosis finishes in a session that got a context-size nudge, and do it before implementing. It holds the conclusion, the files and line ranges to open, and the hypotheses already ruled out. Post it as a comment on the issue, or save it as a file if there is no issue, then recommend a fresh session. A small diagnosis in a lean session needs no handoff.
