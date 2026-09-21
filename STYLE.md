# Coding style

Distilled from the user's own refactors of AI-generated code, plus a survey of `src/` for consistent, repeated patterns. This file covers code _shape_; where things live is README.md's tier table and naming vocabulary.

One line per rule. The reasoning and worked examples are one file away:

| When | File |
| --- | --- |
| Writing a coordinator or an Operator, placing a member or a class | [`docs/style/class-shape.md`](./docs/style/class-shape.md) |
| Naming a value, method, flag, getter or param bag | [`docs/style/naming.md`](./docs/style/naming.md) |
| A cast, a type-level assertion, a registry literal | [`docs/style/type-modeling.md`](./docs/style/type-modeling.md) |
| A guard, a blank-tolerant read, a `catch`, a skip-and-log | [`docs/style/error-handling.md`](./docs/style/error-handling.md) |
| Writing or changing a test | [`docs/style/tests.md`](./docs/style/tests.md) |

## Class shape

- **Coordinating other stateful objects means a coordinator class extending the tier's Base class.** `init` is how an outside caller builds one; `new` is how a class builds its own collaborators from props already on `this`; collaborators are lazy getters. Endpoints are exempt — a plain entry with module-private helpers, until a body turns unwieldy: 303 lines and eighteen free functions threading a collaborator through crossed that line and moved onto a business operator (#22).
- **An Operator extends its subject's `*BaseNamed` and reaches the subject through a getter** (`ss`, `sheet`, `column`), never by extending the concrete class or taking one as a constructor argument.
- **What an Operator holds as props is its identity; a per-run value is an argument to the method that needs it** — `OccupancyLedgerOperator` holds the spreadsheet, and `build` takes the occupancy row index.
- **Split a coordinator into collaborators when its private helpers fall into groups that share nothing with each other**, not when it passes a method count. The coordinator keeps its public methods as one-line delegations, and the collaborators go in a subfolder named after it (`SpreadsheetRaw/`).
- **A composition of collaborator calls that answers one domain question belongs on the collaborator**, under its own name. A parameter that its only caller already holds as its own state means the query belongs on the instance.
- **Extract the shared piece when you can name the second caller**, not when it arrives.
- **A member that samples the top data row for a column-wide fact belongs on the Meta column.** `topCell`/`topRow` stay primary.
- **Member order:** `static init()`, then collaborator getters, then public behavior methods, then `_`-prefixed private helpers — a single-caller helper sits right after its caller.
  - **A private helper that never reads `this` is an unexported module function below the class, not a `_` method**, ordered by first use. A helper that reads `this` only to reach a collaborator stays a method.
- **Delete dead scaffolding in a file you touch** — a stub nothing calls, a placeholder, a variable instantiated and discarded. **Ask before deleting commented-out code.** Zero callers is a list of candidates, not a verdict.
- **A "why" comment carries over verbatim across a restructure.**
- **One class per file, custom `Error` subclasses included.** Lint enforces it.

## Naming

- **Prefer a term from TS/JS's own vocabulary over a made-up adjective** — `Primitive`, not `Pure`.
- **Name a value after the domain type it holds, not a generic container word** — `columnConfigs`, not `entries`.
- **A boolean is a third-person statement about its subject, never a bare adjective.** `is`/`has` are the common case, not the rule.
  - **A flag in a config literal is the exception: it is an imperative directive to whatever reads the literal** — `retainSelection`, `requireOneRow`, `runOnUncheck`. One mood per literal.
- **Prefix a getter `active` when it reads live sheet state that has a same-named schema/config counterpart** — `ColumnMetaRaw.activeIsFormula` vs `ColumnSchema.isFormula`. A helper that moves down onto the object it's about renames `_actualX` → `activeX`.
- **`column` abbreviates to `col` by default, and is spelled out beside an already-short suffix** — `colIndex`, but `columnId`. One form per scope.
- **A sheet takes the unmarked name and a row is marked with a spelled-out `Row` suffix** — `occupancy` is the sheet, `occupancyRow` the row.
- **A plural method name promises more of the same return, not a different container.**
- **Trim a method name to what the return type doesn't already say** — `generateConfigFilesSources` → `generateConfigFiles`.
- **A name has to read to someone who has never opened this codebase** — never jargon named after the mechanism that sets it.
- **Google's API names stay at the wire; framework names follow the glossary** — Google's `ProtectedRange` and `addProtectedRange`, but the framework's `EditProtection` and `editProtections()`.
- **A method that deletes more than one row takes a `SHOUTING_SNAKE_CASE` name**, and keeps it once a guard makes the operation safe.
- **A constant is camelCase; two or more in one file that serve one purpose become one `as const` object named for that purpose** (`fieldMasks`, `layoutLimits`). Lint enforces the casing.
- **A collaborator is named `<Subject><Role><Tier>`, the role the agent noun of a verb on the list below** (`SpreadsheetFlusherRaw`, `SpreadsheetTableValidatorRaw`). A job with no verb on the list gets a plain descriptive noun, never "Handler" or "Manager".
- **Method names draw from one controlled verb vocabulary** — don't invent a new verb for a meaning already on this list:
  - `fetch` — actually hits the live Sheets API
  - `integrate` — merges a fetched snapshot into local state; no API call
  - `prep`/`gather` — queue state locally before a fetch (`prepFetchX` queues only; `gatherFetchX` queues _and_ fetches)
  - `update` — writes a local/queued change, not yet flushed
  - `append` — adds a new row
  - `ensure` — idempotent guard: make this true, no-op if it already is
  - `validate` — asserts an invariant, throws on failure
  - `init` — factory setup
  - `sync`/`flush` — coordinate multiple operators / send a batched write
  - `discard` — drop queued changes without sending them; the counterpart to `flush`
  - **The list governs framework methods.** A business operator's public method takes its verb from `CONTEXT.md` instead, so the code and the operator-facing vocabulary agree: the glossary says a ledger is _built_, so the method is `build`.
- **A getter is a cheap, no-arg, side-effect-free, one-expression pass-through.** Anything that takes an argument, has a side effect, or loops/branches to compute its answer is a called method. A value fixed for the object's whole lifetime is a plain field, not a getter.
- **`_` prefix means "narrow-purpose, not general API"**: a true `private` helper, or a step a coordinating class must call that TS won't let you mark `private`. It marks the concept as orchestration-only, not today's caller count.
- **Destructure params into a named type at 3+ params, 2+ params of one type, or when a named type for the bag already exists**; otherwise stay positional. The one argument every implementation will use is hoisted out of the bag and passed first. The same grouping judgment applies to fields.

## Comments

- **Default to no comments.** When a block would need a comment saying _what_ it does, pull it into a small private method whose name says it — `SheetConfigOperator._updateAll` → `_deleteStaleSheetConfigs`/`_appendMissingSheetConfigs`/`_updateProgrammaticValues`.
- **A comment is one line, trailing or immediately above its line, and explains a "why not the obvious thing"**, never restating what the line already says — `action: "boolean", // Should perhaps be "boolean" | "string"`. If the why doesn't fit on one short line, cut it; it belongs in a commit message or PR description.
- **The one multi-line exception is a file-level navigation block**: 5–10 lines immediately above the exported class, stating this file's job and where neighbouring work lives, so an agent opens the right sibling instead of the whole tier. `SpreadsheetRaw`, `SheetRaw`, `EndpointRun`, `SheetNamed`, `ConfigOrchestrator` and `ConfigSheetFloorEditWarnings` are the current set.

## Error handling & validation

- **`Val.assert(value, "label")` over a bare `!` for "this shouldn't be missing" guards.** Bare `!` only right after an explicit `if (...) throw` already proved the value present.
- **Read and validate in one step; reach for a marked read (`valueOrEmpty`, `valueNotEmpty`) only where the call site's requirement differs from its column's** Empty value allowed declaration.
- **A phrase that names the same thing in several messages or labels comes from one function** (`spreadsheetConfigColumnLabel`), so the wording can't drift between them.
- **Default to a plain `throw new Error("specific message")`.** Mint a custom `Error` subclass only when callers need to catch the failure _category_ by type.
- **Guard-clause throws, never nested conditionals.** The one accepted exception is an exhaustiveness check, which ends in a trailing `else { throw new Error(...) }`.
- **`try`/`catch` has no established convention yet** — don't generalize from `EndpointRun.run`, its one use.
- **Trace whether a "shouldn't happen" condition is actually reachable before defaulting to skip-and-log**; if upstream already guarantees it can't happen, throw.

## Type modeling

- **`interface` for object shapes that get constructed or extended; `type` for everything computed from other types.** Props/state bags that chain via `extends` are `interface`s; unions, `keyof`, mapped and utility types are `type`s.
- **Generic params get two-letter domain abbreviations with a constraint** — `SN` (SheetName), `VN` (ValueName), `CN` (ColumnName), `UN` (UniformRowName), `IF` (IsFormula), `TN`, usually `extends <DomainType>`. Bare `T`/`K`/`V`/`O` are only for domain-free structural utilities (`utils/Obj.ts`, `utils/Arr.ts`).
- **Verify a type-level claim with `IsExactly` / `assertType` / `assertNotType` from `src/testSupport/typeAssertions.ts`, never an assignment.** A probe that needed an `any` to compile has proved nothing. Measure a mapped type over the config unions before adopting it.
- **Narrow a type until the empty case can't arise, rather than a branded-string fallback.**
- **`as` casts narrow data that's already runtime-safe; they never substitute for validation.** External values (Sheets cell data) go through `Val.validate.*`/`Val.is.*`. The three accepted cast idioms are in the reasoning file.
- **A registry keyed by a finite name union takes a plain `: Type` annotation, not `makeStructuredConfig`**, which lets an unknown key through beside a valid one. Keep `makeStructuredConfig` for the generated config files.
- **A per-kind lookup table is keyed by the finite union its producer returns, never a `switch` with a `default` over a wider type.** A `default` over an optional-keyed type (Google's `Request`) compiles with any case missing.
- **Use the named type that already exists instead of an inline shape**, for a field or return type as well as a param bag: `TableIdentityRaw`, not `{ tableId: string; name: string }`.
- **Custom generic utility types live in `utils/Obj.ts`**, PascalCase, one clear transform per name (`StrictOmit`, `DistributiveOmit`, `StrictPick`, `PickStartsWith`).

## Functional vs. imperative idioms

- **`forEach` only for side effects, `map` only for pure transforms — never mixed.**
- **`reduce` is fully accepted** for building a new object/record via an accumulator (`(acc, item) => ({...acc, ...})`), rather than a manual loop with a declared accumulator.
- **Mutator methods return `this` for chaining** (`fetchAndUpdateAll(): this { ...; return this; }`).
- **Standalone units are `function`/`export function` declarations.** Arrow functions appear only as inline callbacks.
- **An option that combines other options is built from them, not from copies of their bodies** — `prepFetchRowSpecifier`'s `"all"` case calls itself for `"headers"`, `"actions"`, `"columnIds"` and `"data"`.
- **`if`/`else` over a ternary for anything beyond a single trivial value pick** with no side effects.

## Imports & file organization

- **Imports sorted alphabetically by path**, by hand (no import-order lint plugin is configured).
- **`import type` for a type-only import line; inline the `type` modifier only when a value and its types share one module** (`import { vsc, type ValueSchemaBase } from "./valueSchema"`) — don't split one module's import into two lines just to separate value from type.
- **No barrel/index files.** `src/index.ts` is the Apps Script entry point, not a re-export barrel — every other file is imported directly by path.
- **File naming:**
  - PascalCase mirroring the exported class name (`SheetConfigOperator.ts`, `ConfigOrchestrator.ts`).
  - A short PascalCase abbreviation for a file exporting one static-bundle object of related functions (`Str.ts` → `Str`, `Obj`, `Arr`, `Dat`, `Tim`, `Val`). A fat bundle's pieces split into a same-named subfolder (`utils/Obj/merge.ts`) and are re-assembled in the parent file.
  - camelCase for plain data/config or entry-point files (`columnConfigs.ts`, `businessEndpoints.ts`, `index.ts`).
  - A long module's helpers split by subject into a same-named subfolder of camelCase files, each exporting camelCase bundles written with method shorthand (`GoogleSheets/GoogleSheetsAPI/cellData.ts` → `cellDataRequests`).
- **Tier subfolders**: `ClassBases/` for base and Common classes + their prop interfaces; `Types/`/`ClassTypes/` for supporting state/shape types consumed by that tier's classes.
