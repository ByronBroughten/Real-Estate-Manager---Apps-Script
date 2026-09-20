# Tickets for a cold implementer

This repo's overlay on the plugin's `/to-tickets`. It applies to every `/to-tickets` run and to any issue labelled `ready-for-agent`, hand-written ones included. The plugin still drives the process. This file adds to its steps 3 (Draft vertical slices) and 4 (Quiz the user), replaces the issue template in its step 5 (Publish), and overrides its rule against file paths and code snippets. Everything else in the plugin stands: vertical slices, expand–contract for a wide refactor, native sub-issue and blocking links, the `ready-for-agent` label, and never modifying the parent.

The reader is an implementer that has not seen the parent spec, the grilling or STYLE.md. Whatever it needs to get the slice right goes in the ticket itself.

## Breakdown rules (add to Draft vertical slices)

- **Split by constraint, not by user story.** A ticket has one seam and one new fact. It changes flush semantics only through a name table settled by grilling (below), and never more than one. A ticket that is wide but mechanical stays whole; file count is not a reason to split.
- **A new Google request kind gets its own adapter ticket, and that ticket lands first.** The ticket that uses the request never invents the write path.
- **A host capability `src/` has never called gets its wrapper's file named, and a Done-when box for the fake.** The ticket that first reaches an Apps Script global — a toast, a new trigger kind — never leaves the wrapper's home or the fake's update to the implementer.
- **A guard lands with the write it guards, or before it.** A refusal or fail-closed check never waits for a later ticket, since a live `gen:configs` run between the two tickets would write unguarded.
- **Resolve every design fork before the label goes on.** The implementer never picks between two readings. An open fork goes back to the developer as a grilling question.
- **A slice that teaches the flusher a new gather/send shape is grilled first.** Its name table — queue op, where the op is held, gather method, place in the send order — goes into the ticket. A row that doesn't apply is answered "none" and says why: a spreadsheet-level op like `addSheet` has no gather method, because the flusher gathers by walking the sheets it already has. A row that doesn't fit is never a reason to drop the table.
- **A coordinator about to grow another group of private helpers that shares nothing with the rest gets a prefactor ticket** that splits out a collaborator first (STYLE.md, "Class shape"). The implementer is never asked to volunteer the split. Every later ticket that lands a helper in that group names the collaborator's file in Copy this, so four tickets don't each put their helpers wherever their implementer felt like.
- **Do the research yourself and write down the answer**, with its source (`file:line`, a probe, an issue). No ticket says "find out X" or "read from the code".
- **Each existing behaviour the slice relies on is pinned by a named test.** Where no test pins it, a prefactor ticket writes that test first, so a bug in it turns up as a planned blocker rather than mid-slice.

## Quiz additions (add to Quiz the user)

For each proposed ticket, also show its **seams**, its **new facts** and any **flush-semantics changes**. A ticket with more than one seam or new fact, or a flush-semantics change no grilled name table settles, is oversized; say which, and propose the split.

## Issue template (replaces Publish's)

Five sections always appear; Existing tests and Live effect appear only when they apply. Leave an empty conditional section out rather than writing "None".

```markdown
## What to build

One paragraph about one seam. The API fact most likely to go wrong comes first, so the first test proves it.

## Copy this

- Method to imitate: `SheetRaw.gatherFillRequest` (or whichever is closest)
- Test to extend: `<file>`, `describe("<name>")`
- Docs to open: `<file>` "<section heading>", one line per section

## Shape

- "<rule quoted word for word from STYLE.md, CONTEXT.md or docs/architecture/>"
- (3–5 rules, each one this slice will hit, phrased as a target rather than a ban)
- **Words:** <concept> → **<glossary term>**, one per concept the slice names in state, methods or messages

## Existing tests

- `<file>`, `describe("<name>")`: relied on / must not be edited, and why

## Done when

- [ ] `<file>`, `describe("<name>")`: asserts <the requests sent / the report line / the throw and its message>
- [ ] (one box per test)
- [ ] `<prose file>` "<section>": <the edit>
- [ ] `npm run tsc`, `npm test` and `npm run lint` pass
- [ ] Close with a comment mapping each box above to the `it()` that covers it, or "not done"

## Live effect

What the first `gen:configs` or `--send` after this slice will change on the live sheet. Applying it is out of scope; it runs under the gates in AGENTS.md, "Commands".

## Neighbours

- Part of #<n>
- Blocked by #<n>: <what it provides>
- Left to #<n>: <what it takes>
```

File paths, method names and quoted rules are expected. Still set the native sub-issue and blocking links as the plugin says; Neighbours restates them for the reader.

## Self-check before publishing

- Could a cold session finish this ticket without opening the parent, STYLE.md in full, or any file Copy this doesn't name? If not, inline what it would have to go and find.
- Open every `file:line` the ticket cites and check the line says what the ticket says it says. Cite a type at its definition, never at an import or a field that uses it.
- For each Done-when box, check the named test's harness can observe what the box asserts. A box about send order doesn't go in a test that hands the API its operation array.
- Search the ticket's own prose for a synonym of each Words term ("declared type" for **column type**, say). Replace every hit.
