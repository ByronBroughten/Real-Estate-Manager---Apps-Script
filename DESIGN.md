# Design philosophy

Why this codebase is shaped the way it is — the reasoning that generalizes past the decision that produced it.

The other prose files each answer a different question: README.md is the map (*what exists and where*; architecture mechanics in `docs/architecture/`, hosts in `docs/how-it-runs.md`, generated data in `docs/generated-data.md`, testing in `docs/testing.md`), STYLE.md is code shape (*what a class or a name looks like*), CONTEXT.md is the glossary (*what the words mean*), CLAUDE.md is the operating rules (*what an agent must not get wrong*). This file is the arguments underneath all four.

**Every principle here cites the decisions that produced it.** A principle with no citation is a platitude and should be cut; a principle that can only cite one decision is probably premature — write the decision down and wait for the second instance. Candidates that haven't earned promotion yet are parked at the bottom.

Decisions are cited by issue where one exists and by commit otherwise. There is no separate ADR tree: specs are published as GitHub issues, and a second filing system would only drift from them.

## Principles

### Make disagreement structurally impossible rather than validating against it

When two pieces of state can contradict each other, the fix is a shape where the contradiction is unrepresentable — not a check that catches it after the fact. Validation runs at one moment and reports; structure holds at every moment and can't be forgotten.

This is the most-repeated argument in the codebase, and it's what most often distinguishes the design that was kept from the one that was rejected.

*Instances:* an endpoint entry is keyed by a **column full name that carries its own sheet**, so `SheetNameOf<FN>` narrows every column it may declare to that sheet's, each filtered to the value type it needs — a cross-sheet or wrongly-typed column is unrepresentable rather than checked for (#5). Bundling `retainSelection` and `requireOneRow` inside the selector they modify is the same move one level down: an endpoint with no selector has nowhere to write either, so a silent no-op is unrepresentable rather than ignored (#11, #18). An endpoint's **run state** pairs its message and its colour in one record, so no path can show one state's colour beside another's message (#4, `ac7a795`). The endpoint map takes a plain `: Endpoints` annotation rather than `makeStructuredConfig`, which infers the literal and silently accepts an unknown key whenever a valid key sits beside it — that hole is how a nonexistent column reached the endpoint map and still type-checked (STYLE.md, "Type modeling"). Every class exposes its schema under the single name `schema`, so two accessors can't disagree about which schema a class has (`ab75c09`). A dropdown column's value type is the **literal union its Value Config declares**, so code that routes on one routes exhaustively and a member added to the sheet is a compile error at the switch rather than a line that renders wrong (#18) — which is only true because `makeValueConfigs` takes a `const` type parameter; dropping it widens every member to `string` and the exhaustiveness evaporates with no error anywhere.

*Corollary:* structure only holds where **both** sides of the contradiction live inside the type system. A Google Table's range lives in a spreadsheet a person edits by hand, so no type reaches it and no shape can make a misplaced Table unrepresentable — the runtime check in `SpreadsheetRaw`'s post-fetch step is not the second-best instrument there, it is the only one. Don't cite this principle against it (#9).

*Corollary:* prefer narrowing a type until the bad case is unrepresentable over encoding an explanation into a fallback value. A branded-string fallback reads as friendlier but collapses back to `never` in constraint position, so it buys nothing where it matters.

*Corollary:* this is about states that cannot be **represented**, not names that are ambiguous to a reader. Two accessors sharing a name and returning different, fully-checked types are not an instance of it — nothing is unrepresentable and the type-checker catches a mis-wiring either way, which is why `sheet.column(cn)` and `sheetMeta.column(cn)` are allowed to share a name (#6). The `makeStructuredConfig` case above is a hole in *checking*, which is a different failure. Citing this principle against a shared name is over-application; reach for it when a bad state can exist, not when a reader might be confused.

### Model state at the granularity the concept actually has

Store and expose a fact at the level it's *about*, not the level it happens to arrive at. The wire format's granularity is not the domain's granularity, and neither is the storage medium's.

*Instances:* `isFormula` and `numberFormatType` are column-wide traits that live on the column, even though they can only be observed by sampling the top data cell — the API delivers them cell-by-cell, but they aren't cell facts (`docs/style/class-shape.md` keeps that one as a worked example, since it turns on where a member is declared). An endpoint is one concept, so it's addressed by one key — the column whose checkbox fires it is the same fact as the column that identifies it, rather than a name plus a separate registration (#5). A run's outcome is one fact, so it lives in one cell's background colour rather than a separate boolean column that could fall out of step with the timestamp beside it (#4, `ac7a795`). Checkbox-ness is a fact about a *type*, not about each column that has it, so "an untouched cell counts as unchecked" lives on the `checkbox` value name once rather than as a per-column trait repeated on every checkbox column (#12).

*Corollary:* when a container method takes an index or id that every caller already holds as its own state, the query belongs on the instance. The parameter disappearing is what turns it into a getter.

### Give the model room for the states that actually occur

A state model that can't express a real condition doesn't omit it — it *misreports* it as one of the states it does have. Before settling a model, ask which real-world conditions have nowhere to go.

*Instances:* a run killed mid-flight — an Apps Script timeout, a quota kill — runs no `finally`. Under the old boolean, it displayed the *previous* run's `TRUE`: a state with no representation became a confident lie. The colour model leaves that run yellow, which says "started, never reported back" (#4, `ac7a795`). Every cell's value type includes `""`, because an untouched cell is empty rather than defaulted — a `boolean` column reads `boolean | ""`, and code that branches on it has to say what empty means instead of assuming the base type (README.md, "Naming vocabulary").

### The payload is not the grid

A response describes what the remote system chose to send, not what exists. Code that treats an absence in the payload as an absence in the world misreports the empty case as the impossible one, and the failure surfaces far from the assumption that caused it. Where a wire format elides the empty case, repair it once at the boundary rather than teaching every consumer to tell the two apart.

*Instances:* Sheets returns a row inside the table with no `rowData` when no cell in it holds a value, a formula or a number format, so a sheet left in its designed blank-row state crashed the config sync with a message naming a gid and a column index — the second debugging session that gap has cost. The fix put the missing facts inside the finalize pass that already backfills omitted cells, so "fetched and empty" and "never fetched" stay distinguishable in exactly one place and nowhere else (#17). The same pass already existed because the API omits empty *cells* from rows it does return; the row-shaped and column-shaped versions of that omission are the same fact one axis over.

*Corollary:* the repair has to be narrowed by something authoritative, or it replaces one wrong answer with another. The payload describes every grid column, which on the reported sheet was 23 against a 12-column table, so the table's own range is what says which columns a fact may be about.

### Funnel the expensive thing through one place

Design so the costly operation has exactly one chokepoint. Then instrumenting it measures everything, optimizing it optimizes everything, and a new call site can't quietly add cost behind your back.

*Instances:* every Sheets read goes through `fetchAllGathered` and every write through `_sendUpdateRequests` — instrument those two and the whole system is measured (`docs/architecture/round-trips.md`). Writes don't hit the API at all until a flush: `update`/`append`/`delete` mutate local state and register a coordinate, and one `batchUpdate` ships the lot (`docs/architecture/queued-writes.md`). Because that chokepoint already existed, adding background-colour writes cost no new round trip — the colour merges into the update already queued for that cell (`b3eb76d`). The same gather is why N appended rows become one `appendCells` request per table rather than N: Sheets' table-aware append targets the same first free row for every request in the batch, so splitting them only grows the table by one while the per-cell updates still land beneath it. The Node host applies the same argument one level below the framework: its adapter is the single door to Google, so arming a dry run there makes a *writing* dry run unrepresentable rather than discouraged — no flush anywhere, the config orchestrator's internal one included, can reach the sheet, and no caller has to be trusted to withhold one. Narrowing a chore's spreadsheet handle to remove the flush was considered and dropped as buying nothing the funnel doesn't already give (#25).

*Corollary:* the chokepoint is also where shared state bites. One `rawState` threaded by reference means a flush commits everything queued anywhere in the run — which is why a failure path must discard before it writes status, or the `finally` ships a half-finished run alongside its own error report.

### Make the claim falsifiable before believing it

Intuition about cost and intuition about types are both unreliable here, and both have a cheap check available. Run the check, then record the number or the assertion so the next person doesn't re-litigate it.

*Instances, performance:* `SpreadsheetApp` "should" be cheaper inside a trigger that already has the sheet open. Measured, it is slower — each call is its own round trip (`docs/architecture/round-trips.md`). Grouping every value name up front "should" beat re-deriving per use; measured, eager cost ~390k instantiations against ~48k per lazy use (`docs/architecture/type-check-cost.md`).

*Instances, types:* an assignment proves nothing about a mapped or conditional type — it passes against `any` and against `never` alike. Identity-based `IsExactly`/`assertType` is the only probe that means anything, and a probe that needed an `any` to compile has proved nothing at all: intersecting to satisfy an indexer resolves to `any` and makes every downstream assertion vacuously true (CLAUDE.md; STYLE.md, "Type modeling").

*Corollary:* record the measurement next to the conclusion. "`SpreadsheetApp` is slower" is re-proposable; "measured ~494ms against ~350ms on this date" is not.

### Give the common case the unmarked name

The name a reader reaches for by reflex should be the one they want most of the time. Make the common case free and let the rare case cost exactly one word — and decide which case is common by counting call sites rather than by guessing.

*Instances:* a census showed roughly twice as many call sites reaching for a sheet's or column's data view as for its metadata view, yet the metadata view held the unmarked name and every data chain paid a `.data` hop; swapping primacy made the common case free and the rare case one word (#6). Nearly every cell read is one where a blank means the endpoint cannot do its job, yet `value` handed back `""` typed into the union and the safe read was the longer `valueNotEmpty` — inverting that made the reflexive read the correct one and left `valueOrEmpty` for the caller who has decided what blank means (#8).

*Corollary:* where "the common case" differs per subject, let the subject declare it rather than picking one meaning for all of them. `value` throwing on a blank was right for most columns and wrong for the ones that are legitimately blank, and no call site could tell which kind it was looking at — so the column's own **Empty value allowed** box now decides what its unmarked read means, and `valueNotEmpty` came back as the marked word for a call site stricter than its column (#13). That carries the principle further rather than reversing #8: the unmarked word is the reflexive correct read on every column now, instead of only on one that cannot be blank.

*Corollary:* the marked name is a record of intent, not merely a longer spelling. `valueOrEmpty` at a call site says blank was thought about, which is a fact a later reader cannot recover from the surrounding logic.

*Corollary:* a tier that shouldn't offer the common case declines the unmarked word rather than reusing it for something else. Raw exposes only `valueOrEmpty`, and Indexed gave `value` up once the word came to mean "whatever this column declared" — a declaration Indexed cannot see, since it resolves columns by generated id (#13). So `value` means one thing everywhere it exists and moving a call between tiers can't silently change its failure mode.

### Record a deliberate absence as deliberate

The riskiest gap in an AI-assisted codebase is the one that looks like an oversight. An unexplained absence reads as a to-do and gets helpfully filled in; a *documented* absence carries its reason and survives.

*Instances:* the endpoint entry's selector is an anonymous nested object rather than a named `EndpointSelector<SN>`, and the run takes a structural copy of the entry rather than `Endpoint<SheetNameSimple>` — two references to one named generic type are compared by its measured variance, which the column filter leaves unmeasurable, so naming either shape breaks the dispatch boundary's widening in a file the editor never opened (#11; `docs/architecture/endpoint-dispatch.md`). There is no type-level bridge from relative `<SN, CN>` addressing to an absolute `ColumnFullName` — building one enumerates the full sheet × column cross product and takes type-checking from ~1.2s to ~7s with a `TS2590`. That absence is documented as deliberate, with the measurement attached (`docs/architecture/column-addressing.md`). There is no base class for the primary column alone; the column chain is deliberately not shaped like the sheet, row and cell chains (`docs/architecture/class-chains.md`). The Raw tier's `SheetCommonRaw` sits between the tier base class and the two concrete sheet classes rather than being folded into it, because the row and column base classes hang off that base and two of its members would be illegal overrides there (#6; `docs/architecture/class-chains.md`). The config-sheet floor is fixed rather than regenerable, and is flagged so nobody "fixes" it by regenerating it away (`docs/generated-data.md`). `IF` does not default to `false` on `ColumnFullName`, because that would silently shrink the union endpoint dispatch is keyed on. The Node host reaches Sheets and nothing else — no triggers, no Gmail, no Docs — and `ScriptApp`/`SpreadsheetApp` are left uninstalled so a chore reaching for one fails by name instead of half-working; the boundary is recorded as a boundary precisely so nobody reads the missing globals as an unfinished adapter (#25). Chores carry no tests, and the reason is written down next to the rule: a test for a one-off would be a second statement of the same thing, written by the same hand in the same hour, and its real check is the preview read before saying send (#25).

*Corollary:* the same applies to commented-out code, which is why STYLE.md's delete-dead-scaffolding rule carves out an exception for it. Absence of an explanation is not evidence of absence of a reason — ask.

## Not yet promoted

Candidates with one citation. Leave them here until a second decision makes the same argument; delete them if the first one gets reversed.

- **A human-facing signal need not be machine-readable.** A run's outcome is a cell background colour, which the read path never fetches — so no code can ever read a run's outcome back. That was acceptable because nothing did, and because the audience is a person looking at a sheet. *Cited by:* #4, `ac7a795`.
- **Prefer the cheaper thing lazily over the complete thing eagerly**, when the complete version's cost scales with a union you don't control. *Cited by:* the lazy mapped-filter measurement in `docs/architecture/type-check-cost.md`.
