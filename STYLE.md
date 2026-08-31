# Coding style

Distilled from the user's own refactors of AI-generated code, plus a survey of the rest of `src/` for consistent, repeated patterns. Apply these on top of README.md's naming vocabulary and CLAUDE.md's architecture rules — this file is about code *shape*, not where things live.

Known not-yet-representative code (still AI-shaped, not mined for any rule below): `src/02_SpreadsheetRaw/toIntegrate.ts`, `src/businessEndpointHandlers/`, and `*.test.ts` files generally.

## Class shape

### Coordinators are classes, not function modules

When code coordinates other stateful objects (other Operators, a Spreadsheet), write it as a class extending the tier's Base class (matching `SheetConfigOperator`), not a module of exported free functions.

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

### Push a domain query onto the object that owns it

When a coordinating class composes several calls on a collaborator to answer one domain question, that composition belongs on the collaborator as its own named method — not re-inlined at every call site. `ColumnConfigOperator` used to reach through `sheet.uniformRow("columnId").activeValueArr` and `.hasValue(columnId)` directly; that logic moved onto `SheetNamed` itself as `get activeColumnIds()` and `isActiveColumnId(columnId)` (`SheetNamed.ts:44,49`), and `ColumnConfigOperator`'s own private helper now just delegates:

```ts
private _isActiveColumnId(sheetGid: number, columnId: string): boolean {
  return this.ss.sheetByGid(sheetGid).isActiveColumnId(columnId);
}
```

Destructure a collaborator's getter directly when only one property is needed: `const { activeColumnIds } = this.ss.sheetByGid(sheetGid);`.

A container method that takes an index/id as a parameter, but is only ever called by code that already has that exact value as its own instance state, is a sign the query belongs on the instance instead — drop the parameter along with the method. `SheetRawBase.columnValidationValues(colIndex: number)` was deleted; its one caller always already had its own `colIndex`, so the query moved to `DataColumnRaw` as `get valueValidationStrings()`, reading `this.activeTable.columnValidationValues.get(this.colIndex)` (`DataColumnRaw.ts`). The parameter disappearing is what turns it into a getter (see the getter rule below).

### Model state at the granularity the concept actually has

When a fact is conceptually about a whole column/row/sheet but can only be *observed* by sampling one representative row/cell, store and expose it at that higher granularity — not on the low-level object that happens to carry the raw sample. `isFormula`/`numberFormatType` are column-wide traits (matching `ColumnSchemaCommon`'s schema-based `isFormula`, `ColumnSchemaCommon.ts:27`), even though they're only ever read off the column's top data-row cell — so they live as `activeIsFormula`/`activeNumberFormatType` on `DataColumnRaw` (`DataColumnRaw.ts:37,40`), populated once per column by `SheetRaw._integrateSheetData` (`SheetRaw.ts:132`), not as per-row/per-cell state on `CellRaw`/`RowRawBase` just because the API happens to deliver the data cell-by-cell. The wire format's granularity isn't the domain's granularity.

### Class member order

1. `static init()`
2. Plain getters for derived collaborators/state (`ss`, `schema`, `sheetConfigOperator`, ...)
3. Public behavior methods
4. Private helpers, `_`-prefixed — ordered so a helper used by only one caller sits immediately after that caller (detail follows the step that needs it); a helper reused by several later methods comes first, in the order of its first use. (`_initSheetGidsApiAccesses`/`_isSheetGidApiAccesses`, each used by multiple methods, sit first in `ColumnConfigOperator`; `_isActiveColumnId`, called only by `_pruneColumnRows`, sits directly after it.)

### Delete dead scaffolding you touch — with one exception

Editing a file is the moment to remove, not preserve, a stub nothing calls, a placeholder function (`function triggerAuth(): void { return; }`), or a variable instantiated and discarded (`const columnConfig = ColumnConfigOperator.init();` with no use of `columnConfig`). An empty function body is better than a dead unused variable or an unreferenced helper kept "in case."

**Exception: commented-out code.** Flag it and ask before deleting — don't remove it as part of a cleanup pass. It might be an intentional breadcrumb rather than leftover cruft.

### Keep "why" comments across a refactor

A comment explaining a non-obvious invariant (e.g. why two sheets must sync in one flush) carries over verbatim across a restructure — it documents the invariant, not the code shape around it.

## Naming

- **Prefer a term from TS/JS's own vocabulary over a made-up adjective, once one fits.** `PureValueName`/`PureValue`/`PureValueNamesToTypes` (`utils/Val.ts`) named the `string | number | boolean | date` family after a vague "pure" adjective; renamed to `PrimitiveValueName`/`PrimitiveValue`/`PrimitiveValueNamesToTypes` once it was clear that's exactly what the set is — no invented term needed when the language already has one.
- **Name a value after the domain type it holds, not a generic container word.** `entries`, `results`, `data` describe the shape (a container) but not what's in it; prefer the name that matches the actual type/concept, especially when that type already has a name elsewhere in the codebase. `columnEntries()` → `newColumnConfigs()` (returns what becomes `columnConfigs.ts`), its local `entries` → `columnConfigs`, and the per-sheet `sheetEntries` → `tableColumnConfigs` (matching the `TableColumnConfigs` type each value actually is).
- **Booleans are always prefixed `is`/`has`, never a bare adjective** — `isActive`, `isFormula`, `hasValue`, `hasIdColumn`.
- **Prefix a getter `active` when it reads live/fetched sheet state that has a same-named counterpart sourced from schema/generated-config data** — disambiguates the live read from the committed one. `DataColumnRaw.activeIsFormula` (this run's live sheet data, `DataColumnRaw.ts:37`) vs. `ColumnSchemaCommon.isFormula` (the committed `columnConfigs.ts` trait, `ColumnSchemaCommon.ts:27`) — same underlying concept, two different sources of truth. Matches the existing `active` vocabulary for "what's actually in the fetched state right now": `activeTable`, `activeColumnIds`, `activeSheetGids`, `activeRowIndexes`.
- **When a "compute the true/live value" helper moves from a coordinating Operator down onto the domain object it's actually about, rename it from `_actualX` to `activeX` to match that vocabulary.** `ColumnConfigOperator._actualValueTitle`/`_actualValidationValueName`/`_actualPrimitiveValueName` — named from the coordinator's point of view, contrasting a *live* value against the *stored config* value — became `ColumnRaw.activeValueTitle()`/`DataColumnRaw.activeValidationValueTitle()`/`ColumnRaw._actualPrimitiveValueName()` once they moved onto the column itself: from that object's own point of view it's just its current state, matching sibling getters like `activeHeader`/`activeIsFormula` on the same class. (The innermost helper, `_actualPrimitiveValueName`, kept its old name and stayed `private` — it has no live/committed counterpart to disambiguate, so `active` wouldn't fit; see the `_`-prefix note below for why it's still underscored while its siblings aren't.)
- **`column` abbreviates to `col` by default — it's referenced constantly, so shortening it earns its keep (`colIndex`) — except when it's paired with an already-short suffix, where spelling it out keeps the identifier legible** (`columnId`, not `colId`: `Id` alone is too short to pair with `col` without the result reading as a cryptic blob). Whichever form fits, use it consistently within one scope: `activeColIds` next to `existingColumnIds` in the same method reads as a typo, not a style choice; it became `activeColumnIds` to match.
- **Method names draw from one controlled verb vocabulary**, each with a distinct meaning — don't invent a new verb for a meaning already on this list:
  - `fetch` — actually hits the live Sheets API
  - `prep`/`gather` — queue state locally before a fetch (`prepFetchX` queues only; `gatherFetchX` queues *and* fetches)
  - `update` — writes a local/queued change, not yet flushed
  - `append` — adds a new row
  - `ensure` — idempotent guard: make this true, no-op if it already is
  - `validate` — asserts an invariant, throws on failure
  - `init` — factory setup
  - `sync`/`flush` — coordinate multiple operators / send a batched write
- **Getters are only for cheap, no-arg, side-effect-free derived values that might need re-deriving from updated state** (`get ss`, `get schema`, `get sheetConfigOperator` — each rebuilds from `this.spreadsheetNamedProps`, which can reflect state mutated since construction). Anything that takes an argument or has a side effect is a method, never a getter. And a value that's genuinely fixed for the object's whole lifetime (e.g. a file path built once from `import.meta.url`) is a plain field computed once, not a getter recomputed on every read.
  - No-arg and side-effect-free isn't sufficient on its own — a getter is reserved for a one-line pass-through/delegation to another value. `DataColumnRaw.get topCell()` (`return this.cell(this.baseSchema.topDataRowIdx)`) and `.get valueValidationStrings()` (`return this.activeTable.columnValidationValues.get(this.colIndex) ?? []`) are getters for exactly this reason — one expression, no branching. A no-arg method that loops or branches to *compute* its answer — `DataColumnRaw.activeValidationValueTitle()` (loops over validation strings, regex-matching each), `ColumnRaw.activeValueTitle()` (branches on the header), `ColumnRaw._actualPrimitiveValueName()` (branches on typeof/format) — stays a called method with `()`. The parens are the reader's signal that real work happens inside, not just a field read.
- **`_` prefix means "narrow-purpose, not general API," and shows up in two shapes:**
  1. A true private helper, decomposing a public method — pair it with the `private` keyword.
  2. A method that a coordinating/encapsulating class must call as one step of a specific flow, but that isn't meant as general-purpose API on its own class. It *can't* be marked `private` (TS blocks cross-class access even from a coordinator), so the leading `_` is the only signal a future caller gets that this isn't for general use. Real example: `SheetIndexed._gatherDataPrerequisites` (`SheetIndexed.ts:58`) is called by `SpreadsheetIndexed.fetchAllPrepped` (`SpreadsheetIndexed.ts:37`) as one step sandwiched between two ordinary public methods (`gatherFetchDataPrepped`, `finalizeFetchedData`) — it's underscored precisely because it only makes sense inside that one flow.
  - This case-2 underscore is about the method's *concept* being orchestration-only, not about how many callers it happens to have today. A method that instead reads as ordinary domain vocabulary for the class it's on — because it matches an existing naming family already used for sibling members — stays unprefixed even with exactly one current caller. `ColumnRaw.activeValueTitle()` and `DataColumnRaw.activeValidationValueTitle()` are each called only from `ColumnConfigOperator._updateProgrammaticValues` today (and say so in a trailing comment, kept for context per "Keep 'why' comments across a refactor" below), but they're plain public methods, not `_activeValueTitle` — they fit the same `active*` family as `activeHeader`/`activeIsFormula` on the same classes, so they read as legitimate queries on the column itself rather than glue steps of someone else's flow.
- **Param style: destructure into a named type when the params already justify grouping; otherwise stay positional.** Destructure + a type (existing or newly introduced) when there are 3+ params, or 2+ params of the same type, or a named type for the bag already exists elsewhere. Otherwise keep params positional. Example (`SpreadsheetNamed.ts:125,146`):
  ```ts
  private _prepFetchStandardProps({ rowSpecifier, sheetColumnNames }: FetchPropsStandardNamed): void
  ```
  destructures because `FetchPropsStandardNamed` already exists as a named type — the method just unpacks an existing concept. Compare a case that stays positional because nothing ties the params together as one concept — three unrelated single-use values, no shared type:
  ```ts
  private _prepFetchRowSpecifier(sheet: SheetIndexed, rowSpecifier: RowSpecifierName, columnId: string): void
  ```
- **The same grouping judgment applies to fields, not just method params.** Two or more naturally-paired values (e.g. a pair of output file paths) get grouped into one object property rather than kept as separate top-level members. `scripts/generateConfigFiles.mjs` groups its two output paths as `path: { sheetConfigs, columnConfigs }` rather than two separate `sheetConfigsPath`/`columnConfigsPath` members.

## Comments

- **Prefer decomposing into small, descriptively-named methods over a large comment.** When a chunk of code would otherwise need a comment explaining what it does (as opposed to a comment explaining a non-obvious *why*), that's usually a sign it should be pulled into its own small private method whose name says what the block does — see `SheetConfigOperator._updateAll` → `_deleteStaleSheetConfigs`/`_appendMissingSheetConfigs`/`_updateProgrammaticValues`. The method name replaces the comment.
- **Default to no comments.** Most files in this codebase have zero — code and types carry the meaning.
- **When one does appear, it's one line, trailing the line it explains (or immediately above), and it explains a "why not the obvious thing"** — never restating what the line already says. E.g. `action: "boolean", // Should perhaps be "boolean" | "string"`; `// intentionally not cell named, because named cells only work for data...`.
- **Never a multi-line comment block.** If the "why" doesn't fit on one short line, cut it rather than expand it — a multi-sentence comment is a sign the explanation belongs in a commit message or PR description, not the file.
- **Trim method names to what the return type doesn't already say** — a method returning a string of file source doesn't also need "Sources" in its name on top of "Files": `generateConfigFilesSources` → `generateConfigFiles`.

## Error handling & validation

- **`Val.assert(value, "label")` over a bare `!` for "this shouldn't be missing" guards.** `!` is compile-time only — it silences the type-checker but performs no runtime check, so a real `null`/`undefined` just crashes later, further from the actual mistake. `Val.assert` checks at runtime and throws immediately with a clear, labeled message (`` `${label} not found.` ``). Bare `!` is acceptable only right after an explicit `if (...) throw` has *already* proven the value present a couple lines earlier — there, `!` is just satisfying the type-checker about something already runtime-verified, not standing in for verification. `Val.assertStringNotEmpty` is the same idiom extended to reject `""` too, for a value that isn't sourced from a `col.x` accessor (see next bullet for the case where it is).
- **Validate at the point of read, not the point of use.** When a value comes off a `col.x` accessor that already has a `.valueNotEmpty(rowIndex)` variant, call that at the read line — don't read via `.value(rowIndex)` and defer the check to a later `Val.assertStringNotEmpty`/manual guard closer to where the value gets used. Reading-and-validating in one step means a value can never be used unvalidated in between, and keeps every field in an object literal validated the same way instead of some going through `.valueNotEmpty` and others through a separate assert. `ColumnConfigOperator.newColumnConfigs()` reads `columnId`/`sheetGid`/`isFormula`/`header`/`valueName` all via `col.x.valueNotEmpty(rowIndex)` for exactly this reason.
- **Default to a plain `throw new Error("specific message")`.** Only mint a custom `Error` subclass (`ValidationError`, `SheetRawNotFoundError`) when the failure *category itself* is something a caller might need to catch or distinguish by type — not per call site.
- **Guard-clause throws, never nested conditionals.** The one accepted exception is an exhaustiveness check, which ends in a trailing `else { throw new Error(...) }`.
- **`try`/`catch` has no established convention yet** — it's effectively unused in this codebase. Don't invent a policy; note it as open if it comes up.
- **Trace whether a "shouldn't happen" condition is actually reachable before defaulting to skip-and-log.** A defensive skip only earns its place when the condition can genuinely occur in valid, expected state; if upstream code already guarantees it can't (a prior step corrects/prunes exactly this), skip-and-log just buries a real failure in a log line instead of surfacing it — throw instead. Real example: `ColumnConfigOperator.columnEntries()` used to skip rows missing `header`/`valueName`/an unresolvable `sheetGid`, but `_updateProgrammaticValues` corrects `header`/`valueName` for every active row and `_pruneColumnRows` guarantees every surviving row's `sheetGid` resolves — so a row still failing one of those checks means the sync didn't actually complete, and that now throws.

## Type modeling

- **`interface` for object shapes that get constructed or extended; `type` for everything computed from other types.** Constructor/props/state bags that chain via `extends` (`SpreadsheetNamedProps extends SpreadsheetIndexedProps`) are `interface`s. Unions, `keyof`, mapped/utility types (`CellValueName = keyof CellValueNameToValue`) are `type`s.
- **Generic params get short domain abbreviations with a constraint, not bare letters** — `SN` (SheetName), `VN` (ValueName), `CN` (ColumnName), `UN` (UniformRowName), `TN`, each usually `extends <DomainType>`. Bare `T`/`K`/`V`/`O` are reserved for domain-free structural utilities (`utils/Obj.ts`, `utils/Arr.ts`) that have no domain concept to abbreviate.
- **`as` casts are for type-level narrowing on data that's already runtime-safe, never a substitute for validation.** Two accepted idioms in production code:
  - Seed a fully-typed empty accumulator up front, then fill it: `{} as Record<ApiEndpointName, () => void>`, not a cast at the point of use.
  - `as any` / `as unknown as X` as an escape hatch, but only inside low-level structural utilities (`utils/Obj.ts`, `utils/Arr.ts` and similar) doing generic structural-typing gymnastics — not general license elsewhere.
  Actual validation of real external/unknown values (Sheets cell data) always routes through `Val.validate.*`/`Val.is.*`, never a bare cast. (Test files are separately mid-migration off `as` via the `migrate-to-shoehorn` skill — that's in-progress project state, not a contradicting rule.)
- **Custom generic utility types live in `utils/Obj.ts`**, PascalCase, one clear transform per name (`StrictOmit`, `DistributiveOmit`, `StrictPick`, `PickStartsWith`) — colocated rather than scattered per-file.

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
