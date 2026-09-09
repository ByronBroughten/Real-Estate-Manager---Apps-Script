# Design philosophy

Why this codebase is shaped the way it is — the reasoning that generalizes past the decision that produced it.

The other prose files each answer a different question: README.md is the map (*what exists and where*), STYLE.md is code shape (*what a class or a name looks like*), CONTEXT.md is the glossary (*what the words mean*), CLAUDE.md is the operating rules (*what an agent must not get wrong*). This file is the arguments underneath all four.

**Every principle here cites the decisions that produced it.** A principle with no citation is a platitude and should be cut; a principle that can only cite one decision is probably premature — write the decision down and wait for the second instance. Candidates that haven't earned promotion yet are parked at the bottom.

Decisions are cited by issue where one exists and by commit otherwise. There is no separate ADR tree: specs are published as GitHub issues, and a second filing system would only drift from them.

## Principles

### Make disagreement structurally impossible rather than validating against it

When two pieces of state can contradict each other, the fix is a shape where the contradiction is unrepresentable — not a check that catches it after the fact. Validation runs at one moment and reports; structure holds at every moment and can't be forgotten.

This is the most-repeated argument in the codebase, and it's what most often distinguishes the design that was kept from the one that was rejected.

*Instances:* an endpoint entry is keyed by a **column full name that carries its own sheet**, so `SheetNameOf<FN>` narrows the three columns it may declare to that sheet's, each filtered to the value type it needs — a cross-sheet or wrongly-typed column is unrepresentable rather than checked for (#5). An endpoint's **run state** pairs its message and its colour in one record, so no path can show one state's colour beside another's message (#4, `ac7a795`). The endpoint map takes a plain `: Endpoints` annotation rather than `makeStructuredConfig`, which infers the literal and silently accepts an unknown key whenever a valid key sits beside it — that hole is how a nonexistent column reached the endpoint map and still type-checked (STYLE.md, "Type modeling"). Every class exposes its schema under the single name `schema`, so two accessors can't disagree about which schema a class has (`ab75c09`).

*Corollary:* prefer narrowing a type until the bad case is unrepresentable over encoding an explanation into a fallback value. A branded-string fallback reads as friendlier but collapses back to `never` in constraint position, so it buys nothing where it matters.

*Corollary:* this is about states that cannot be **represented**, not names that are ambiguous to a reader. Two accessors sharing a name and returning different, fully-checked types are not an instance of it — nothing is unrepresentable and the type-checker catches a mis-wiring either way, which is why `sheet.column(cn)` and `sheetMeta.column(cn)` are allowed to share a name (#6). The `makeStructuredConfig` case above is a hole in *checking*, which is a different failure. Citing this principle against a shared name is over-application; reach for it when a bad state can exist, not when a reader might be confused.

### Model state at the granularity the concept actually has

Store and expose a fact at the level it's *about*, not the level it happens to arrive at. The wire format's granularity is not the domain's granularity, and neither is the storage medium's.

*Instances:* `isFormula` and `numberFormatType` are column-wide traits that live on the column, even though they can only be observed by sampling the top data cell — the API delivers them cell-by-cell, but they aren't cell facts (STYLE.md keeps that one as a worked example, since it turns on where a member is declared). An endpoint is one concept, so it's addressed by one key — the column whose checkbox fires it is the same fact as the column that identifies it, rather than a name plus a separate registration (#5). A run's outcome is one fact, so it lives in one cell's background colour rather than a separate boolean column that could fall out of step with the timestamp beside it (#4, `ac7a795`).

*Corollary:* when a container method takes an index or id that every caller already holds as its own state, the query belongs on the instance. The parameter disappearing is what turns it into a getter.

### Give the model room for the states that actually occur

A state model that can't express a real condition doesn't omit it — it *misreports* it as one of the states it does have. Before settling a model, ask which real-world conditions have nowhere to go.

*Instances:* a run killed mid-flight — an Apps Script timeout, a quota kill — runs no `finally`. Under the old boolean, it displayed the *previous* run's `TRUE`: a state with no representation became a confident lie. The colour model leaves that run yellow, which says "started, never reported back" (#4, `ac7a795`). Every cell's value type includes `""`, because an untouched cell is empty rather than defaulted — a `boolean` column reads `boolean | ""`, and code that branches on it has to say what empty means instead of assuming the base type (README.md, "Naming vocabulary").

### Funnel the expensive thing through one place

Design so the costly operation has exactly one chokepoint. Then instrumenting it measures everything, optimizing it optimizes everything, and a new call site can't quietly add cost behind your back.

*Instances:* every Sheets read goes through `fetchAllGathered` and every write through `_sendUpdateRequests` — instrument those two and the whole system is measured (README.md, "Round trips are the cost"). Writes don't hit the API at all until a flush: `update`/`append`/`delete` mutate local state and register a coordinate, and one `batchUpdate` ships the lot (README.md, "Queued writes and shared state"). Because that chokepoint already existed, adding background-colour writes cost no new round trip — the colour merges into the update already queued for that cell (`b3eb76d`).

*Corollary:* the chokepoint is also where shared state bites. One `rawState` threaded by reference means a flush commits everything queued anywhere in the run — which is why a failure path must discard before it writes status, or the `finally` ships a half-finished run alongside its own error report.

### Make the claim falsifiable before believing it

Intuition about cost and intuition about types are both unreliable here, and both have a cheap check available. Run the check, then record the number or the assertion so the next person doesn't re-litigate it.

*Instances, performance:* `SpreadsheetApp` "should" be cheaper inside a trigger that already has the sheet open. Measured, it is slower — each call is its own round trip (README.md, "Round trips are the cost"). Grouping every value name up front "should" beat re-deriving per use; measured, eager cost ~390k instantiations against ~48k per lazy use (README.md, "Type-check cost").

*Instances, types:* an assignment proves nothing about a mapped or conditional type — it passes against `any` and against `never` alike. Identity-based `IsExactly`/`assertType` is the only probe that means anything, and a probe that needed an `any` to compile has proved nothing at all: intersecting to satisfy an indexer resolves to `any` and makes every downstream assertion vacuously true (CLAUDE.md; STYLE.md, "Type modeling").

*Corollary:* record the measurement next to the conclusion. "`SpreadsheetApp` is slower" is re-proposable; "measured ~494ms against ~350ms on this date" is not.

### Record a deliberate absence as deliberate

The riskiest gap in an AI-assisted codebase is the one that looks like an oversight. An unexplained absence reads as a to-do and gets helpfully filled in; a *documented* absence carries its reason and survives.

*Instances:* there is no type-level bridge from relative `<SN, CN>` addressing to an absolute `ColumnFullName` — building one enumerates the full sheet × column cross product and takes type-checking from ~1.2s to ~7s with a `TS2590`. That absence is documented as deliberate, with the measurement attached (README.md, "Two ways to address a column"). There is no base class for the primary column alone; the column chain is deliberately not shaped like the sheet, row and cell chains (README.md, "The sheet and column class chains"). The Raw tier's `SheetCommonRaw` sits between the tier base class and the two concrete sheet classes rather than being folded into it, because the row and column base classes hang off that base and two of its members would be illegal overrides there (#6; README.md, "The sheet and column class chains"). The config-sheet floor is fixed rather than regenerable, and is flagged so nobody "fixes" it by regenerating it away (README.md, "Generated data"). `IF` does not default to `false` on `ColumnFullName`, because that would silently shrink the union endpoint dispatch is keyed on.

*Corollary:* the same applies to commented-out code, which is why STYLE.md's delete-dead-scaffolding rule carves out an exception for it. Absence of an explanation is not evidence of absence of a reason — ask.

## Not yet promoted

Candidates with one citation. Leave them here until a second decision makes the same argument; delete them if the first one gets reversed.

- **A human-facing signal need not be machine-readable.** A run's outcome is a cell background colour, which the read path never fetches — so no code can ever read a run's outcome back. That was acceptable because nothing did, and because the audience is a person looking at a sheet. *Cited by:* #4, `ac7a795`.
- **Prefer the cheaper thing lazily over the complete thing eagerly**, when the complete version's cost scales with a union you don't control. *Cited by:* the lazy mapped-filter measurement in README.md's "Type-check cost".
- **Give the common case the unmarked name.** A census of call sites showed roughly twice as many reaching for a sheet's or column's data view as for its metadata view, yet the metadata view held the unmarked name and every data chain paid a `.data` hop. Swapping primacy made the common case free and the rare case one word. *Cited by:* #6.
