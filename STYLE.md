# Coding style

Distilled from the user's own refactors of AI-generated code, plus a survey of the rest of `src/` for consistent, repeated patterns. Apply these on top of README.md's naming vocabulary and CLAUDE.md's architecture rules — this file is about code *shape*, not where things live.

Known not-yet-representative code (still AI-shaped, not mined for any rule below): `src/02_SpreadsheetRaw/toIntegrate.ts`, `src/businessEndpointHandlers/`, `scripts/generateConfigFiles.mjs`, `src/04_SpreadsheetNamed/ColumnConfigOperator.ts`, the date-as-number functions in `utils/Dat.ts`/`utils/Tim.ts`, and `*.test.ts` files generally.

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

### Class member order

1. `static init()`
2. Plain getters for derived collaborators/state (`ss`, `schema`, `sheetConfigOperator`, ...)
3. Public behavior methods
4. Private helpers, `_`-prefixed

### Delete dead scaffolding you touch — with one exception

Editing a file is the moment to remove, not preserve, a stub nothing calls, a placeholder function (`function triggerAuth(): void { return; }`), or a variable instantiated and discarded (`const columnConfig = ColumnConfigOperator.init();` with no use of `columnConfig`). An empty function body is better than a dead unused variable or an unreferenced helper kept "in case."

**Exception: commented-out code.** Flag it and ask before deleting — don't remove it as part of a cleanup pass. It might be an intentional breadcrumb rather than leftover cruft.

### Keep "why" comments across a refactor

A comment explaining a non-obvious invariant (e.g. why two sheets must sync in one flush) carries over verbatim across a restructure — it documents the invariant, not the code shape around it.

## Naming

- **Booleans are always prefixed `is`/`has`, never a bare adjective** — `isActive`, `isFormula`, `hasValue`, `hasIdColumn`.
- **Method names draw from one controlled verb vocabulary**, each with a distinct meaning — don't invent a new verb for a meaning already on this list:
  - `fetch` — actually hits the live Sheets API
  - `prep`/`gather` — queue state locally before a fetch (`prepFetchX` queues only; `gatherFetchX` queues *and* fetches)
  - `update` — writes a local/queued change, not yet flushed
  - `append` — adds a new row
  - `ensure` — idempotent guard: make this true, no-op if it already is
  - `validate` — asserts an invariant, throws on failure
  - `init` — factory setup
  - `sync`/`flush` — coordinate multiple operators / send a batched write
- **Getters are only for cheap, no-arg, side-effect-free derived values** (`get ss`, `get schema`, `get sheetConfigOperator`). Anything that takes an argument or has a side effect is a method, never a getter.
- **`_` prefix means "narrow-purpose, not general API," and shows up in two shapes:**
  1. A true private helper, decomposing a public method — pair it with the `private` keyword.
  2. A method that a coordinating/encapsulating class must call as one step of a specific flow, but that isn't meant as general-purpose API on its own class. It *can't* be marked `private` (TS blocks cross-class access even from a coordinator), so the leading `_` is the only signal a future caller gets that this isn't for general use. Real example: `SheetIndexed._gatherDataPrerequisites` (`SheetIndexed.ts:58`) is called by `SpreadsheetIndexed.fetchAllPrepped` (`SpreadsheetIndexed.ts:37`) as one step sandwiched between two ordinary public methods (`gatherFetchDataPrepped`, `finalizeFetchedData`) — it's underscored precisely because it only makes sense inside that one flow.
- **Param style: destructure into a named type when the params already justify grouping; otherwise stay positional.** Destructure + a type (existing or newly introduced) when there are 3+ params, or 2+ params of the same type, or a named type for the bag already exists elsewhere. Otherwise keep params positional. Example (`SpreadsheetNamed.ts:125,146`):
  ```ts
  private _prepFetchStandardProps({ rowSpecifier, sheetColumnNames }: FetchPropsStandardNamed): void
  ```
  destructures because `FetchPropsStandardNamed` already exists as a named type — the method just unpacks an existing concept. Compare a case that stays positional because nothing ties the params together as one concept — three unrelated single-use values, no shared type:
  ```ts
  private _prepFetchRowSpecifier(sheet: SheetIndexed, rowSpecifier: RowSpecifierName, columnId: string): void
  ```

## Comments

- **Prefer decomposing into small, descriptively-named methods over a large comment.** When a chunk of code would otherwise need a comment explaining what it does (as opposed to a comment explaining a non-obvious *why*), that's usually a sign it should be pulled into its own small private method whose name says what the block does — see `SheetConfigOperator._updateAll` → `_deleteStaleSheetConfigs`/`_appendMissingSheetConfigs`/`_updateProgrammaticValues`. The method name replaces the comment.
- **Default to no comments.** Most files in this codebase have zero — code and types carry the meaning.
- **When one does appear, it's one line, trailing the line it explains (or immediately above), and it explains a "why not the obvious thing"** — never restating what the line already says. E.g. `action: "boolean", // Should perhaps be "boolean" | "string"`; `// intentionally not cell named, because named cells only work for data...`.
- **Trim method names to what the return type doesn't already say** — a method returning a string of file source doesn't also need "Sources" in its name on top of "Files": `generateConfigFilesSources` → `generateConfigFiles`.

## Error handling & validation

- **`Val.assert(value, "label")` over a bare `!` for "this shouldn't be missing" guards.** `!` is compile-time only — it silences the type-checker but performs no runtime check, so a real `null`/`undefined` just crashes later, further from the actual mistake. `Val.assert` checks at runtime and throws immediately with a clear, labeled message (`` `${label} not found.` ``). Bare `!` is acceptable only right after an explicit `if (...) throw` has *already* proven the value present a couple lines earlier — there, `!` is just satisfying the type-checker about something already runtime-verified, not standing in for verification.
- **Default to a plain `throw new Error("specific message")`.** Only mint a custom `Error` subclass (`ValidationError`, `SheetRawNotFoundError`) when the failure *category itself* is something a caller might need to catch or distinguish by type — not per call site.
- **Guard-clause throws, never nested conditionals.** The one accepted exception is an exhaustiveness check, which ends in a trailing `else { throw new Error(...) }`.
- **`try`/`catch` has no established convention yet** — it's effectively unused in this codebase. Don't invent a policy; note it as open if it comes up.

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
