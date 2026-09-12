# Coding style

Distilled from the user's own refactors of AI-generated code, plus a survey of the rest of `src/` for consistent, repeated patterns. Apply these on top of README.md's naming vocabulary and the files under `docs/architecture/` — this file is about code *shape*, not where things live.

Known not-yet-representative code (still AI-shaped, not mined for any rule below): `src/02_SpreadsheetRaw/toIntegrate.ts` and `*.test.ts` files generally.

One line per rule. The reasoning and the worked examples behind the first two sections are one file away:

| When | File |
| --- | --- |
| Writing a coordinator or an Operator, placing a member | [`docs/style/class-shape.md`](./docs/style/class-shape.md) |
| Naming a value, method, flag, getter or param bag | [`docs/style/naming.md`](./docs/style/naming.md) |

## Class shape

- **Coordinating other stateful objects means a coordinator class extending the tier's Base class.** `init` is how an outside caller builds one; `new` is how a class builds its own collaborators from props already on `this`; collaborators are lazy getters. Endpoints are exempt — a plain entry with module-private helpers, until a body turns unwieldy: 303 lines and eighteen free functions threading a collaborator through crossed that line and moved onto a business operator (#22).
- **An Operator extends its subject's `*NamedBase` and reaches the subject through a getter** (`ss`, `sheet`, `column`), never by extending the concrete class or taking one as a constructor argument.
- **What an Operator holds as props is its identity; a per-run value is an argument to the method that needs it** — `OccupancyLedgerOperator` holds the spreadsheet, and `build` takes the occupancy row index.
- **A composition of collaborator calls that answers one domain question belongs on the collaborator**, under its own name. A parameter that its only caller already holds as its own state means the query belongs on the instance.
- **Extract the shared piece when you can name the second caller**, not when it arrives.
- **A member that samples the top data row for a column-wide fact belongs on the Meta column.** `topCell`/`topRow` stay primary.
- **Member order:** `static init()`, then collaborator getters, then public behavior methods, then `_`-prefixed private helpers — a single-caller helper sits right after its caller.
- **Delete dead scaffolding in a file you touch** — a stub nothing calls, a placeholder, a variable instantiated and discarded. **Ask before deleting commented-out code.** Zero callers is a list of candidates, not a verdict.
- **A "why" comment carries over verbatim across a restructure.**

## Naming

- **Prefer a term from TS/JS's own vocabulary over a made-up adjective** — `Primitive`, not `Pure`.
- **Name a value after the domain type it holds, not a generic container word** — `columnConfigs`, not `entries`.
- **A boolean is a third-person statement about its subject, never a bare adjective.** `is`/`has` are the common case, not the rule.
  - **A flag in a config literal is the exception: it is an imperative directive to whatever reads the literal** — `retainSelection`, `requireOneRow`, `runOnUncheck`. One mood per literal.
- **Prefix a getter `active` when it reads live sheet state that has a same-named schema/config counterpart** — `ColumnMetaRaw.activeIsFormula` vs `ColumnSchema.isFormula`. A helper that moves down onto the object it's about renames `_actualX` → `activeX`.
- **`column` abbreviates to `col` by default, and is spelled out beside an already-short suffix** — `colIndex`, but `columnId`. One form per scope.
- **A sheet takes the unmarked name and a row is marked with a spelled-out `Row` suffix** — `occupancy` is the sheet, `occupancyRow` the row.
- **A plural method name promises more of the same return, not a different container.**
- **A name has to read to someone who has never opened this codebase** — never jargon named after the mechanism that sets it.
- **A method that deletes more than one row takes a `SHOUTING_SNAKE_CASE` name**, and keeps it once a guard makes the operation safe.
- **Method names draw from one controlled verb vocabulary** — don't invent a new verb for a meaning already on this list:
  - `fetch` — actually hits the live Sheets API
  - `prep`/`gather` — queue state locally before a fetch (`prepFetchX` queues only; `gatherFetchX` queues *and* fetches)
  - `update` — writes a local/queued change, not yet flushed
  - `append` — adds a new row
  - `ensure` — idempotent guard: make this true, no-op if it already is
  - `validate` — asserts an invariant, throws on failure
  - `init` — factory setup
  - `sync`/`flush` — coordinate multiple operators / send a batched write
  - `discard` — drop queued changes without sending them; the counterpart to `flush`
  - **The list governs framework methods.** A business operator's public method takes its verb from `CONTEXT.md` instead, so the code and the operator-facing vocabulary agree: the glossary says a ledger is _built_, so the method is `build`.
- **A getter is a cheap, no-arg, side-effect-free, one-expression pass-through.** Anything that takes an argument, has a side effect, or loops/branches to compute its answer is a called method — the parens signal that real work happens inside. A value fixed for the object's whole lifetime is a plain field, not a getter.
- **`_` prefix means "narrow-purpose, not general API"**: a true `private` helper, or a step a coordinating class must call that TS won't let you mark `private`. It marks the concept as orchestration-only, not today's caller count.
- **Destructure params into a named type at 3+ params, 2+ params of one type, or when a named type for the bag already exists**; otherwise stay positional. The one argument every implementation will use is hoisted out of the bag and passed first. The same grouping judgment applies to fields.

## Comments

- **Prefer decomposing into small, descriptively-named methods over a large comment.** When a chunk of code would otherwise need a comment explaining what it does (as opposed to a comment explaining a non-obvious *why*), that's usually a sign it should be pulled into its own small private method whose name says what the block does — see `SheetConfigOperator._updateAll` → `_deleteStaleSheetConfigs`/`_appendMissingSheetConfigs`/`_updateProgrammaticValues`. The method name replaces the comment.
- **Default to no comments.** Most files in this codebase have zero — code and types carry the meaning.
- **When one does appear, it's one line, trailing the line it explains (or immediately above), and it explains a "why not the obvious thing"** — never restating what the line already says. E.g. `action: "boolean", // Should perhaps be "boolean" | "string"`; `// intentionally not cell named, because named cells only work for data...`.
- **Never a multi-line comment block** — with one exception. If the "why" doesn't fit on one short line, cut it rather than expand it: a multi-sentence comment is a sign the explanation belongs in a commit message or PR description, not the file.
- **Exception — a file-level navigation block** immediately above the exported class, 5–10 lines, stating this file's job and where neighbouring work lives so an agent opens the right sibling instead of the whole tier. `SpreadsheetRaw`, `EndpointRun`, `SheetNamed`, and `ConfigOrchestrator` are the current set. Not a licence for multi-line comments elsewhere.
- **Trim method names to what the return type doesn't already say** — a method returning the generated files' source doesn't also need "Sources" in its name on top of "Files": `generateConfigFilesSources` → `generateConfigFiles`.

## Error handling & validation

- **`Val.assert(value, "label")` over a bare `!` for "this shouldn't be missing" guards.** `!` is compile-time only — it silences the type-checker but performs no runtime check, so a real `null`/`undefined` just crashes later, further from the actual mistake. `Val.assert` checks at runtime and throws immediately with a clear, labeled message (`` `${label} not found.` ``). Bare `!` is acceptable only right after an explicit `if (...) throw` has *already* proven the value present a couple lines earlier — there, `!` is just satisfying the type-checker about something already runtime-verified, not standing in for verification.
- **Reach for a marked read only where the call site's requirement differs from its column's.** The unmarked accessors carry the column's own **Empty value allowed** declaration to the read line: on an unticked column `value`/`valueArr` exclude `""` and throw naming the blank cell, and on a ticked one they hand the blank back for the caller to interpret (#13). Choosing `valueOrEmpty`/`valueArrOrEmpty` on an unticked column claims this call site has decided what a blank means — a drift check where the blank *is* the drift, say; choosing `valueNotEmpty`/`valueArrNotEmpty` on a ticked one claims this call site is stricter than its column. Don't read through a blank-tolerant form and defer the check to a manual guard closer to where the value gets used; reading-and-validating in one step means a value can never be used unvalidated in between, and keeps every field in an object literal validated the same way. `ColumnConfigOperator.newColumnConfigs()` reads `columnId`/`sheetGid`/`isFormula`/`header`/`valueTitle`/`emptyValueAllowed` all via `col.x.value(rowIndex)` for exactly that reason, while the drift comparisons a few methods up read `valueOrEmpty` because a blank config cell is what they exist to catch.
- **Default to a plain `throw new Error("specific message")`.** Only mint a custom `Error` subclass (`ValidationError`, `SheetRawNotFoundError`) when the failure *category itself* is something a caller might need to catch or distinguish by type — not per call site.
- **Guard-clause throws, never nested conditionals.** The one accepted exception is an exhaustiveness check, which ends in a trailing `else { throw new Error(...) }`.
- **`try`/`catch` has no established convention yet** — `EndpointRun.run` is the only use in the codebase, and it's there because an endpoint's failure has to reach the sheet as a run status rather than kill the trigger. Don't generalize from it; note the question as open if it comes up elsewhere.
- **Trace whether a "shouldn't happen" condition is actually reachable before defaulting to skip-and-log.** A defensive skip only earns its place when the condition can genuinely occur in valid, expected state; if upstream code already guarantees it can't (a prior step corrects/prunes exactly this), skip-and-log just buries a real failure in a log line instead of surfacing it — throw instead. Real example: `ColumnConfigOperator.columnEntries()` used to skip rows missing `header`/`valueName`/an unresolvable `sheetGid`, but `_updateProgrammaticValues` corrects `header`/`valueName` for every active row and `_pruneColumnRows` guarantees every surviving row's `sheetGid` resolves — so a row still failing one of those checks means the sync didn't actually complete, and that now throws.

## Type modeling

- **`interface` for object shapes that get constructed or extended; `type` for everything computed from other types.** Constructor/props/state bags that chain via `extends` (`SpreadsheetNamedProps extends SpreadsheetIndexedProps`) are `interface`s. Unions, `keyof`, mapped/utility types (`CellValueName = keyof CellValueNameToValue`) are `type`s.
- **Generic params get short domain abbreviations with a constraint, not bare letters** — `SN` (SheetName), `VN` (ValueName), `CN` (ColumnName), `UN` (UniformRowName), `IF` (IsFormula), `TN`, each usually `extends <DomainType>`. Two letters, not one, even where one would be unambiguous: a lone `F` or `I` reads as a bare letter rather than an abbreviation. Bare `T`/`K`/`V`/`O` are reserved for domain-free structural utilities (`utils/Obj.ts`, `utils/Arr.ts`) that have no domain concept to abbreviate.
- **Verify a type-level claim with an identity check, never an assignment.** `const x: Expected = valueOfNewType` proves nothing about a mapped or conditional type: it passes against `any` and against `never`. Use the identity-based `IsExactly`/`assertType` pair already in `SpreadsheetSchema.test.ts`, and `assertNotType` for the claim that two types are *not* identical — the only way to state that a branded type like `DateSerial` is not just `number` (#15). Two corollaries, both learned the hard way:
  - **A probe that needed an `any` to compile has proved nothing.** Intersecting to satisfy an indexer (`(T & Record<K, any>)[K]`) resolves to `any`, so every assertion downstream of it passes vacuously. If a type won't index without that workaround, fix the type — carry the data inside the entry so the key is provably present — rather than casting past it.
  - **Measure before adopting a mapped type over the config unions**, with `npx tsc --noEmit --extendedDiagnostics`. See `docs/architecture/type-check-cost.md` for the baseline and the one known cliff.
- **Prefer improving type specificity over branded-string fallbacks** — narrow the domain until the empty case can't arise rather than encoding the explanation into a fallback string literal. A branded fallback also silently stops working in constraint position, where the intersection that satisfies the parent's constraint collapses it back to `never`. See DESIGN.md, "Make disagreement structurally impossible rather than validating against it."
- **`as` casts are for type-level narrowing on data that's already runtime-safe, never a substitute for validation.** Three accepted idioms in production code:
  - Seed a fully-typed empty accumulator up front, then fill it: `{} as SheetColumnNamesStandard<SN>`, not a cast at the point of use.
  - `as any` / `as unknown as X` as an escape hatch, but only inside low-level structural utilities (`utils/Obj.ts`, `utils/Arr.ts` and similar) doing generic structural-typing gymnastics — not general license elsewhere.
  - `as unknown as X` in ordinary code, but **only to buy back type-check time, and only when a test already proves the same thing more cheaply.** Both halves are required. The cost half: the cast must be removing real, measured work — run `npx tsc --noEmit --extendedDiagnostics` before and after, and if the saving isn't in the tens of thousands of instantiations, don't do it. The proof half: somewhere else, a test must already check the exact shape the cast is claiming, written against one named sheet rather than a type parameter. That is what keeps the cast from being a hole. `SheetNamed.appendRowWithAllVals` is the only place in the repo that qualifies (#14) — see `docs/architecture/type-check-cost.md` for the numbers and for the profile that found no second candidate.
  Actual validation of real external/unknown values (Sheets cell data) always routes through `Val.validate.*`/`Val.is.*`, never a bare cast. (Test files are separately mid-migration off `as` via the `migrate-to-shoehorn` skill — that's in-progress project state, not a contradicting rule.)
- **A registry keyed by a finite name union takes a plain `: Type` annotation, not `makeStructuredConfig`.** `makeStructuredConfig` infers the literal into a type parameter, and that inference silently accepts an unknown key whenever at least one *valid* key sits beside it in the same literal — a bogus key on its own does error, which is exactly what makes the hole easy to miss. That's how `occupancy_buildLedgerRunTimeLastRan` (no such column) reached the endpoint map and still passed `npm run tsc`. `export const businessEndpoints: Endpoints = { ... }` restores excess-property checking and reports the typo with a "did you mean". Keep `makeStructuredConfig` for the generated config files, where the keys come from the generator rather than a hand-typed literal.
- **Custom generic utility types live in `utils/Obj.ts`**, PascalCase, one clear transform per name (`StrictOmit`, `DistributiveOmit`, `StrictPick`, `PickStartsWith`) — colocated rather than scattered per-file. One deliberate exception: `NotEmpty<V>` sits in `00_base/base.ts` beside the wire value types, because the blank it removes is the cell blank those types define rather than a general structural transform (#12).

## Functional vs. imperative idioms

- **`forEach` only for side effects, `map` only for pure transforms — never mixed.** Every `forEach` drives a mutation/side effect (`row.delete()`, `.updateValue(...)`); every `map` returns a new array with no mutation inside the callback.
- **`reduce` is fully accepted** for building a new object/record via an accumulator (`(acc, item) => ({...acc, ...})`), not avoided in favor of a manual loop with a declared accumulator variable.
- **Mutator methods return `this` for chaining** (`fetchAndUpdateAll(): this { ...; return this; }`) — the single most consistent pattern in the codebase across all tiers.
- **No top-level arrow-function consts.** Standalone units are always `function`/`export function` declarations; arrow functions appear only as inline callbacks passed to `forEach`/`map`/`reduce`.
- **`if`/`else` over a ternary for anything beyond a single trivial value pick.** A runtime ternary is fine for a one-line "pick A or B" with no side effects and no branch body; anything more goes to `if`/`else`.

## Imports & file organization

- **Imports sorted alphabetically by path** — a manual habit (no import-order lint plugin is configured), so keep doing it by hand.
- **`import type` for a type-only import line; inline the `type` modifier only when a value and its types share one module** (`import { vsc, type ValueSchemaBase } from "./valueSchema"`) — don't split one module's import into two lines just to separate value from type.
- **No barrel/index files.** `src/index.ts` is the actual Apps Script entry point, not a re-export barrel — every other file is imported directly by path.
- **File naming:**
  - PascalCase mirroring the exported class name (`SheetConfigOperator.ts`, `ConfigOrchestrator.ts`).
  - A short PascalCase abbreviation for a file exporting one static-bundle object of related functions rather than a class (`Str.ts` → `Str`, `Obj.ts` → `Obj`, `Arr.ts` → `Arr`, `Dat.ts` → `Dat`, `Tim.ts` → `Tim`, `Val.ts` → `Val`). A fat bundle's internal pieces split into a same-named subfolder (`utils/Obj/merge.ts`, `utils/Obj/spread.ts`) and get re-assembled in the parent file.
  - camelCase for plain data/config or entry-point files, not type constructors (`columnConfigs.ts`, `businessEndpoints.ts`, `index.ts`).
- **Tier subfolders**: `ClassBases/` for base classes + their prop interfaces; `Types/`/`ClassTypes/` for supporting state/shape types consumed by that tier's classes.

## Tests

**Draft, not settled like the rest of this file.** Every other section here was mined from a file the user actually refactored themselves; test files haven't had that pass yet (`*.test.ts` is still on the not-yet-representative list). These are proposed extensions of the same spirit above — revisit once a real test file has gone through the user's own refactor, the way `ConfigOrchestrator.ts` did for production code.

Everything above still applies as-is to test code: boolean `is`/`has` prefixes, the controlled verb vocabulary, no-comments-by-default with decomposition preferred over a comment explaining what something does, guard clauses, delete-dead-scaffolding-but-ask-before-deleting-commented-out-code, top-level units as `function` declarations rather than arrow consts.

Proposed test-specific extensions of that same spirit:

- **Understand a class from its implementation.** Open the sibling `Foo.test.ts` when changing tests.
- **A named setup/fixture-builder function over a comment explaining a seeded row.** Instead of a comment like `// Pre-existing row for the "test" sheet, with API access so its column IDs get gathered` beside a literal, pull it into a small function whose name states the scenario — `seedActiveSheetWithApiAccess()` — so the scenario is legible from the call site, not a comment.
- **One behavior per `it()`, named as a sentence describing the behavior, not the mechanism** — e.g. `"flushes Sheet Config and Column Config changes in a single batchUpdate call"`.
- **`describe` blocks named after the real method/class under test**, not an invented suite label — e.g. `describe("syncAndFlushConfigSheets", ...)`, `describe("ColumnConfigOperator.columnEntries / toFileSource", ...)`.
- **Real, already-committed schema data over invented literals** where the code under test resolves identifiers through the actual schema (column IDs via `columnConfigs.sheetConfig.x.columnId`, real sheet gids) — guards against a test quietly passing against a shape that doesn't exist in production.
- **Precise assertions over loose ones** — assert the exact resulting value/shape, not presence or truthiness.
