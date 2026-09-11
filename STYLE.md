# Coding style

Distilled from the user's own refactors of AI-generated code, plus a survey of the rest of `src/` for consistent, repeated patterns. Apply these on top of README.md's naming vocabulary and CLAUDE.md's architecture rules — this file is about code *shape*, not where things live.

Known not-yet-representative code (still AI-shaped, not mined for any rule below): `src/02_SpreadsheetRaw/toIntegrate.ts` and `*.test.ts` files generally.

## Class shape

### Coordinators are classes, not function modules

When code coordinates other stateful objects (other Operators, a Spreadsheet), write it as a class extending the tier's Base class (matching `SheetConfigOperator`), not a module of exported free functions.

This was mined from the framework tiers. It does **not** govern business endpoints: an endpoint is a plain entry with module-private helpers, matching the endpoints already in the registry. Reach for a class only once a file is unwieldy or its logic finds a second caller.

- `static init(): Self` is the only public construction path; the real constructor just takes a `props` object.
- Collaborators (`ss`, `sheetConfigOperator`, `schema`, etc.) are lazy getters built from shared props on `this` — never constructor-injected instances, never threaded through as a returned object.

AI tends to reach for a function module that builds collaborators once and returns them in a bag so the caller can pick apart internal state:

```ts
export function syncAndFlushConfigSheets() {
  const columnConfigOperator = ColumnConfigOperator.init();
  const sheetConfigOperator = columnConfigOperator.sheetConfigOperator;
  sheetConfigOperator.fetchAndUpdateAll();
  columnConfigOperator.fetchAndUpdateColumnConfig();
  columnConfigOperator.ss.batchUpdateGSheets();
  return { sheetConfigOperator, columnConfigOperator };
}
```

Prefer a class exposing the same state as getters, with the method itself returning nothing:

```ts
export class ConfigOrchestrator extends SpreadsheetNamedBase {
  static init(): ConfigOrchestrator {
    return new ConfigOrchestrator(ConfigOrchestrator.initSpreadsheetNamedProps());
  }
  get sheetConfigOperator() {
    return new SheetConfigOperator(this.spreadsheetNamedProps);
  }
  get columnConfigOperator() {
    return new ColumnConfigOperator(this.spreadsheetNamedProps);
  }
  syncAndFlushConfigSheets() {
    this.sheetConfigOperator.fetchAndUpdateAll();
    this.columnConfigOperator.fetchAndUpdateColumnConfig();
    this.ss.batchUpdateGSheets();
  }
}
```

Callers reach into `orchestrator.sheetConfigOperator` directly instead of destructuring a method's return value.

### An Operator extends a `*NamedBase` and reaches its subject through a getter

Whatever an Operator operates on — a sheet, a column — it extends that thing's `*NamedBase` class and adds methods suited to that data structure. It does **not** extend the concrete class it works through, and it doesn't take one as a constructor argument: the subject is a lazy collaborator getter built from the props already on `this`, named for what it is (`ss`, `sheet`, `column`). `GenericSheetOperator extends SheetNamedBase<SN>` with `ss`/`sheet`/`schema` getters is the reference shape — `sheet` is the primary (data) sheet, and the metadata view is `sheet.meta`; a column-scoped operator extends `ColumnNamedBase<SN, CN>` and exposes a `column` getter the same way.

Inheriting the concrete class instead would put its whole surface on the operator, which is the opposite of what the operator is for — it exists to offer a *narrower*, more specific set of methods than the general class does.

### Push a domain query onto the object that owns it

When a coordinating class composes several calls on a collaborator to answer one domain question, that composition belongs on the collaborator as its own named method — not re-inlined at every call site. `ColumnConfigOperator` used to reach through `sheet.uniformRow("columnId").activeValueArr` and `.hasValue(columnId)` directly; that logic moved onto `SheetMetaNamed` itself as `get activeColumnIds()` and `isActiveColumnId(columnId)`, and `ColumnConfigOperator`'s own private helper now just delegates:

```ts
private _isActiveColumnId(sheetGid: number, columnId: string): boolean {
  return this.ss.raw.sheetMeta(sheetGid).isActiveColumnId(columnId);
}
```

Destructure a collaborator's getter directly when only one property is needed: `const { activeColumnIds } = this.ss.raw.sheetMeta(sheetGid);`.

A container method that takes an index/id as a parameter, but is only ever called by code that already has that exact value as its own instance state, is a sign the query belongs on the instance instead — drop the parameter along with the method. `SheetRawBase.columnValidationValues(colIndex: number)` was deleted; its one caller always already had its own `colIndex`, so the query moved to `ColumnMetaRaw` as `get valueValidationStrings()`, reading `this.activeTable.columnValidationValues.get(this.colIndex)` (`ColumnMetaRaw.ts`). The parameter disappearing is what turns it into a getter (see the getter rule below).

### Model state at the granularity the concept actually has

The principle and its other instances live in DESIGN.md; what follows is where it lands on member placement. A member that **samples the top data row to derive a column-wide fact** belongs on the Meta column — that is membership criterion 2 of the Meta/primary axis (README.md, "Naming vocabulary"), and `isFormula`/`numberFormatType` are the case that produced it. They match `ColumnSchema.isFormula`, the schema-based trait, and are read off the column's top data-row cell only because that is how the API delivers them; so they live as `activeIsFormula`/`activeNumberFormatType` on `ColumnMetaRaw`, populated once per column by `SheetRaw._integrateSheetData`, not as per-row/per-cell state on `CellRaw`/`RowRawBase`.

The criterion bites on the derived fact, not on row or cell addressing: `topCell` and `topRow` stay primary, or a Meta class would end up handing out data rows.

### Class member order

1. `static init()`
2. Plain getters for derived collaborators/state (`ss`, `schema`, `sheetConfigOperator`, ...)
3. Public behavior methods
4. Private helpers, `_`-prefixed — ordered so a helper used by only one caller sits immediately after that caller (detail follows the step that needs it); a helper reused by several later methods comes first, in the order of its first use. (`_initSheetGidsApiAccesses`/`_isSheetGidApiAccesses`, each used by multiple methods, sit first in `ColumnConfigOperator`; `_isActiveColumnId`, called only by `_pruneColumnRows`, sits directly after it.)

### Delete dead scaffolding you touch — with one exception

Editing a file is the moment to remove, not preserve, a stub nothing calls, a placeholder function (`function triggerAuth(): void { return; }`), or a variable instantiated and discarded (`const columnConfig = ColumnConfigOperator.init();` with no use of `columnConfig`). An empty function body is better than a dead unused variable or an unreferenced helper kept "in case."

**Exception: commented-out code.** Flag it and ask before deleting — don't remove it as part of a cleanup pass. It might be an intentional breadcrumb rather than leftover cruft.

**Zero callers is not proof of dead.** Some members are parked for planned work and carry no marker distinguishing them from cruft — `SheetRaw.validateRowIndexes` and `SheetRaw.requestSortGSheet` are both intentional. A grep-derived list of uncalled members is a set of candidates, not a verdict: name what you found and ask, rather than deleting on the count. A member whose only caller is a test is a third case again — deleting it deletes coverage.

### Keep "why" comments across a refactor

A comment explaining a non-obvious invariant (e.g. why two sheets must sync in one flush) carries over verbatim across a restructure — it documents the invariant, not the code shape around it.

## Naming

- **Prefer a term from TS/JS's own vocabulary over a made-up adjective, once one fits.** `PureValueName`/`PureValue`/`PureValueNamesToTypes` (`utils/Val.ts`) named the `string | number | boolean | date` family after a vague "pure" adjective; renamed to `PrimitiveValueName`/`PrimitiveValue`/`PrimitiveValueNamesToTypes` once it was clear that's exactly what the set is — no invented term needed when the language already has one.
- **Name a value after the domain type it holds, not a generic container word.** `entries`, `results`, `data` describe the shape (a container) but not what's in it; prefer the name that matches the actual type/concept, especially when that type already has a name elsewhere in the codebase. `columnEntries()` → `newColumnConfigs()` (returns what becomes `columnConfigs.ts`), its local `entries` → `columnConfigs`, and the per-sheet `sheetEntries` → `tableColumnConfigs` (matching the `TableColumnConfigs` type each value actually is).
- **A boolean is named as a third-person statement about its subject, never a bare adjective.** `is` and `has` are the usual verbs — `isActive`, `isFormula`, `hasValue`, `hasIdColumn` — but they're the common case, not the rule; reach for whatever verb states the thing plainly. An optional config flag naming a behaviour its subject *has* reads best as its own verb — `runsOnUncheck`, `retainsSelection` (#11) — because the subject is the entry the flag sits on: an endpoint *runs on uncheck*, a selector *retains selection*. `isRunOnUncheck` names a property of the flag rather than a behaviour of the endpoint. Such a flag defaults to `false`, so its absence means the ordinary behaviour and it only ever appears where it's doing something.
- **Prefix a getter `active` when it reads live/fetched sheet state that has a same-named counterpart sourced from schema/generated-config data** — disambiguates the live read from the committed one. `ColumnMetaRaw.activeIsFormula` (this run's live sheet data) vs. `ColumnSchema.isFormula` (the committed `columnConfigs.ts` trait) — same underlying concept, two different sources of truth. Matches the existing `active` vocabulary for "what's actually in the fetched state right now": `activeTable`, `activeColumnIds`, `activeSheetGids`, `activeRowIndexes`.
- **When a "compute the true/live value" helper moves from a coordinating Operator down onto the domain object it's actually about, rename it from `_actualX` to `activeX` to match that vocabulary.** `ColumnConfigOperator._actualValueTitle`/`_actualValidationValueName`/`_actualPrimitiveValueName` — named from the coordinator's point of view, contrasting a *live* value against the *stored config* value — became `ColumnMetaRaw.activeValueTitle()`/`.activeValidationValueTitle()`/`._actualPrimitiveValueName()` once they moved onto the column itself: from that object's own point of view it's just its current state, matching sibling getters like `activeHeader`/`activeIsFormula` on the same class. (The innermost helper, `_actualPrimitiveValueName`, kept its old name and stayed `private` — it has no live/committed counterpart to disambiguate, so `active` wouldn't fit; see the `_`-prefix note below for why it's still underscored while its siblings aren't.)
- **`column` abbreviates to `col` by default — it's referenced constantly, so shortening it earns its keep (`colIndex`) — except when it's paired with an already-short suffix, where spelling it out keeps the identifier legible** (`columnId`, not `colId`: `Id` alone is too short to pair with `col` without the result reading as a cryptic blob). Whichever form fits, use it consistently within one scope: `activeColIds` next to `existingColumnIds` in the same method reads as a typo, not a style choice; it became `activeColumnIds` to match.
- **A name has to read to someone who has never opened this codebase.** A flag named after the mechanism that sets it becomes jargon at every call site that isn't that mechanism. Prefer the word a newcomer would guess: a row held even though it looks empty is `isReserved`, not `claimed` (#10).
- **A method that deletes more than one row takes a `SHOUTING_SNAKE_CASE` name** (`SheetIndexed.DELETE_ALL_DATA_ROWS` and the `SheetNamed` method that delegates to it). Nothing else in the codebase is spelled that way, so the shout is the warning: a caller can't reach one by reflex. It stays shouty even once a guard makes the operation safe — the point is that the reader stops, not that the operation is unguarded.
- **Method names draw from one controlled verb vocabulary**, each with a distinct meaning — don't invent a new verb for a meaning already on this list:
  - `fetch` — actually hits the live Sheets API
  - `prep`/`gather` — queue state locally before a fetch (`prepFetchX` queues only; `gatherFetchX` queues *and* fetches)
  - `update` — writes a local/queued change, not yet flushed
  - `append` — adds a new row
  - `ensure` — idempotent guard: make this true, no-op if it already is
  - `validate` — asserts an invariant, throws on failure
  - `init` — factory setup
  - `sync`/`flush` — coordinate multiple operators / send a batched write
  - `discard` — drop queued changes without sending them; the counterpart to `flush`
- **Getters are only for cheap, no-arg, side-effect-free derived values that might need re-deriving from updated state** (`get ss`, `get schema`, `get sheetConfigOperator` — each rebuilds from `this.spreadsheetNamedProps`, which can reflect state mutated since construction). Anything that takes an argument or has a side effect is a method, never a getter. And a value that's genuinely fixed for the object's whole lifetime (e.g. a file path built once from `import.meta.url`) is a plain field computed once, not a getter recomputed on every read.
  - No-arg and side-effect-free isn't sufficient on its own — a getter is reserved for a one-line pass-through/delegation to another value. `ColumnRaw.get topCell()` (`return this.cell(this.schema.topDataRowIdx)`) and `ColumnMetaRaw.get valueValidationStrings()` (`return this.activeTable.columnValidationValues.get(this.colIndex) ?? []`) are getters for exactly this reason — one expression, no branching. A no-arg method that loops or branches to *compute* its answer — `ColumnMetaRaw.activeValidationValueTitle()` (loops over validation strings, regex-matching each), `.activeValueTitle()` (branches on the header), `._actualPrimitiveValueName()` (branches on typeof/format) — stays a called method with `()`. The parens are the reader's signal that real work happens inside, not just a field read.
- **`_` prefix means "narrow-purpose, not general API," and shows up in two shapes:**
  1. A true private helper, decomposing a public method — pair it with the `private` keyword.
  2. A method that a coordinating/encapsulating class must call as one step of a specific flow, but that isn't meant as general-purpose API on its own class. It *can't* be marked `private` (TS blocks cross-class access even from a coordinator), so the leading `_` is the only signal a future caller gets that this isn't for general use. Real example: `SheetMetaIndexed._gatherDataPrerequisites` is called by `SpreadsheetIndexed.fetchAllPrepped` as one step sandwiched between two ordinary public methods (`gatherFetchDataPrepped`, `finalizeFetchedData`) — it's underscored precisely because it only makes sense inside that one flow.
  - This case-2 underscore is about the method's *concept* being orchestration-only, not about how many callers it happens to have today. A method that instead reads as ordinary domain vocabulary for the class it's on — because it matches an existing naming family already used for sibling members — stays unprefixed even with exactly one current caller. `ColumnMetaRaw.activeValueTitle()` and `.activeValidationValueTitle()` are each called only from `ColumnConfigOperator._updateProgrammaticValues` today (and say so in a trailing comment, kept for context per "Keep 'why' comments across a refactor" below), but they're plain public methods, not `_activeValueTitle` — they fit the same `active*` family as `activeHeader`/`activeIsFormula` on the same classes, so they read as legitimate queries on the column itself rather than glue steps of someone else's flow.
- **Param style: destructure into a named type when the params already justify grouping; otherwise stay positional.** Destructure + a type (existing or newly introduced) when there are 3+ params, or 2+ params of the same type, or a named type for the bag already exists elsewhere. Otherwise keep params positional. Example (`SpreadsheetNamed._prepFetchStandardProps` / `._prepFetchRowSpecifier`):
  ```ts
  private _prepFetchStandardProps({ rowSpecifier, sheetColumnNames }: FetchPropsStandardNamed): void
  ```
  destructures because `FetchPropsStandardNamed` already exists as a named type — the method just unpacks an existing concept. Compare a case that stays positional because nothing ties the params together as one concept — three unrelated single-use values, no shared type:
  ```ts
  private _prepFetchRowSpecifier(sheet: SheetIndexed, rowSpecifier: RowSpecifierName, columnId: string): void
  ```
- **The one argument every implementation will use is hoisted out of the bag and passed first, positionally.** The grouping rule above is about params that travel together; it doesn't apply to a collaborator that essentially every implementation of a signature needs. An endpoint's action takes the spreadsheet first and its remaining inputs as a second destructured object, because every action needs the spreadsheet and only some need the rest — burying it in the bag would make every implementation destructure to reach the thing it always wants.
- **The same grouping judgment applies to fields, not just method params.** Two or more naturally-paired values (e.g. a pair of output file paths) get grouped into one object property rather than kept as separate top-level members. `scripts/generateConfigFiles.mjs` groups its two output paths as `path: { sheetConfigs, columnConfigs }` rather than two separate `sheetConfigsPath`/`columnConfigsPath` members.

## Comments

- **Prefer decomposing into small, descriptively-named methods over a large comment.** When a chunk of code would otherwise need a comment explaining what it does (as opposed to a comment explaining a non-obvious *why*), that's usually a sign it should be pulled into its own small private method whose name says what the block does — see `SheetConfigOperator._updateAll` → `_deleteStaleSheetConfigs`/`_appendMissingSheetConfigs`/`_updateProgrammaticValues`. The method name replaces the comment.
- **Default to no comments.** Most files in this codebase have zero — code and types carry the meaning.
- **When one does appear, it's one line, trailing the line it explains (or immediately above), and it explains a "why not the obvious thing"** — never restating what the line already says. E.g. `action: "boolean", // Should perhaps be "boolean" | "string"`; `// intentionally not cell named, because named cells only work for data...`.
- **Never a multi-line comment block.** If the "why" doesn't fit on one short line, cut it rather than expand it — a multi-sentence comment is a sign the explanation belongs in a commit message or PR description, not the file.
- **Trim method names to what the return type doesn't already say** — a method returning a string of file source doesn't also need "Sources" in its name on top of "Files": `generateConfigFilesSources` → `generateConfigFiles`.

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
  - **Measure before adopting a mapped type over the config unions**, with `npx tsc --noEmit --extendedDiagnostics`. See README's "Type-check cost" for the baseline and the one known cliff.
- **Prefer improving type specificity over branded-string fallbacks** — narrow the domain until the empty case can't arise rather than encoding the explanation into a fallback string literal. A branded fallback also silently stops working in constraint position, where the intersection that satisfies the parent's constraint collapses it back to `never`. See DESIGN.md, "Make disagreement structurally impossible rather than validating against it."
- **`as` casts are for type-level narrowing on data that's already runtime-safe, never a substitute for validation.** Three accepted idioms in production code:
  - Seed a fully-typed empty accumulator up front, then fill it: `{} as SheetColumnNamesStandard<SN>`, not a cast at the point of use.
  - `as any` / `as unknown as X` as an escape hatch, but only inside low-level structural utilities (`utils/Obj.ts`, `utils/Arr.ts` and similar) doing generic structural-typing gymnastics — not general license elsewhere.
  - `as unknown as X` in ordinary code, but **only to buy back type-check time, and only when a test already proves the same thing more cheaply.** Both halves are required. The cost half: the cast must be removing real, measured work — run `npx tsc --noEmit --extendedDiagnostics` before and after, and if the saving isn't in the tens of thousands of instantiations, don't do it. The proof half: somewhere else, a test must already check the exact shape the cast is claiming, written against one named sheet rather than a type parameter. That is what keeps the cast from being a hole. `SheetNamed.appendRowWithAllVals` is the only place in the repo that qualifies (#14) — see README's "Type-check cost" for the numbers and for the profile that found no second candidate.
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

- **A named setup/fixture-builder function over a comment explaining a seeded row.** Instead of a comment like `// Pre-existing row for the "test" sheet, with API access so its column IDs get gathered` beside a literal, pull it into a small function whose name states the scenario — `seedActiveSheetWithApiAccess()` — so the scenario is legible from the call site, not a comment.
- **One behavior per `it()`, named as a sentence describing the behavior, not the mechanism** — e.g. `"flushes Sheet Config and Column Config changes in a single batchUpdate call"`.
- **`describe` blocks named after the real method/class under test**, not an invented suite label — e.g. `describe("syncAndFlushConfigSheets", ...)`, `describe("ColumnConfigOperator.columnEntries / toFileSource", ...)`.
- **Real, already-committed schema data over invented literals** where the code under test resolves identifiers through the actual schema (column IDs via `columnConfigs.sheetConfig.x.columnId`, real sheet gids) — guards against a test quietly passing against a shape that doesn't exist in production.
- **Precise assertions over loose ones** — assert the exact resulting value/shape, not presence or truthiness.
