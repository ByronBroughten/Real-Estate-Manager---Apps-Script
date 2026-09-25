# Coding style

Distilled from the user's own refactors of AI-generated code, plus a survey of `src/` for consistent, repeated patterns. This file covers code _shape_; where things live is [`packages/framework/src/AGENTS.md`](../packages/framework/src/AGENTS.md) and [`docs/vocabulary.md`](../packages/framework/docs/vocabulary.md).

One line per rule. The reasoning and worked examples are one file away. Open a reasoning file only when you're changing the rule, or the rule's line doesn't decide your case.

## Reasoning files

| When | File |
| --- | --- |
| Writing a coordinator or an Operator, placing a member or a class | [`docs/style/class-shape.md`](./style/class-shape.md) |
| Naming a value, method, flag, getter or param bag | [`docs/style/naming.md`](./style/naming.md) |
| A cast, a type-level assertion, a registry literal | [`docs/style/type-modeling.md`](./style/type-modeling.md) |
| A guard, a blank-tolerant read, a `catch`, a skip-and-log | [`docs/style/error-handling.md`](./style/error-handling.md) |
| Writing or changing a test | [`docs/style/tests.md`](./style/tests.md) |
| A comment, or a file-level navigation block | [`docs/style/comments.md`](./style/comments.md) |
| `reduce`, a chaining mutator, a combined option | [`docs/style/idioms.md`](./style/idioms.md) |
| Imports, barrels, file names | [`docs/style/file-organization.md`](./style/file-organization.md) |

## Class shape

- **Coordinating other stateful objects means a coordinator class extending the tier's Base class.** Callers build one with `init`; it builds its collaborators with `new` from props on `this`, as lazy getters. Endpoints are exempt until a body turns unwieldy.
- **An Operator extends its subject's `*BaseNamed` and reaches the subject through a getter**, never by extending the concrete class or taking one as a constructor argument.
- **What an Operator holds as props is its identity; a per-run value is an argument to the method that needs it.**
- **Split a coordinator into collaborators when its private helpers fall into groups that share nothing with each other**, not when it passes a method count. The coordinator keeps its public methods as one-line delegations, and the collaborators go in a subfolder named after it.
  - **Collaborators get no tests of their own** and reach the coordinator's shared surface through a getter. A base class stays in `ClassBases/`.
- **A composition of collaborator calls that answers one domain question belongs on the collaborator**, under its own name. A parameter that its only caller already holds as its own state means the query belongs on the instance.
- **Extract the shared piece when you can name the second caller**, not when it arrives.
- **A member that samples the top data row for a column-wide fact belongs on the Meta column.** `topCell`/`topRow` stay primary.
- **Member order:** `static init()`, then collaborator getters, then public behavior methods, then `_`-prefixed private helpers — a single-caller helper sits right after its caller.
  - **A private helper that never reads `this` is an unexported module function below the class, not a `_` method**, ordered by first use. A helper that reads `this` only to reach a collaborator stays a method.
  - **A helper whose arguments are one collaborator and its state belongs on that collaborator.** A public method that doesn't read `this` stays put; a helper that only renames a function in scope is deleted.
  - **Helpers sharing a subject and passing nothing between them become an object bundle; helpers passing one value around become a helper class** in its own file.
- **Delete dead scaffolding in a file you touch**, but **ask before deleting commented-out code.** Zero callers is a list of candidates, not a verdict.
- **A "why" comment carries over verbatim across a restructure.**
- **One class per file, custom `Error` subclasses included.** Lint backs it.

## Naming

- **Prefer a term from TS/JS's own vocabulary over a made-up adjective.**
- **Name a value after the domain type it holds, not a generic container word.**
- **A boolean is a third-person statement about its subject, never a bare adjective.** It defaults to `false`, so it appears only where it changes something.
  - **A flag in a config literal is the exception: it is an imperative directive to whatever reads the literal**, one mood per literal.
- **Prefix a getter `active` when it reads live sheet state that has a same-named schema/config counterpart.** A helper that moves down onto the object it's about renames `_actualX` → `activeX`.
- **`column` abbreviates to `col` by default, and is spelled out beside an already-short suffix**, one form per scope.
- **A sheet takes the unmarked name and a row is marked with a spelled-out `Row` suffix.**
- **A plural method name promises more of the same return, not a different container.**
- **Trim a method name to what the return type doesn't already say.**
- **A name has to read to someone who has never opened this codebase** — never jargon named after the mechanism that sets it.
- **Google's API names stay at the wire; framework names follow the glossary.**
- **A method that deletes more than one row takes a `SHOUTING_SNAKE_CASE` name**, and keeps it once a guard makes the operation safe.
- **A constant is camelCase; two or more in one file that serve one purpose become one `as const` object named for that purpose.** Lint backs the camelCase half.
- **A collaborator is named `<Subject><Role><Tier>`, the role the agent noun of a verb on the list below.** A job with no verb on the list gets a plain descriptive noun, never "Handler" or "Manager".
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
  - **The list governs framework methods.** A business operator's public method takes its verb from the app's `packages/real-estate/CONTEXT.md` instead.
- **A getter is a cheap, no-arg, side-effect-free, one-expression pass-through.** Anything that takes an argument, has a side effect, or loops/branches to compute its answer is a called method. A value fixed for the object's whole lifetime is a plain field, not a getter.
- **`_` prefix means "narrow-purpose, not general API"**: a true `private` helper, or a step a coordinating class must call that TS won't let you mark `private`.
- **Destructure params into a named type at 3+ params, 2+ params of one type, or when a named type for the bag already exists**; otherwise stay positional. The one argument every implementation will use is hoisted out of the bag and passed first. The same grouping judgment applies to fields.

## Comments

- **Default to no comments.** When a block would need a comment saying _what_ it does, pull it into a small private method whose name says it.
- **A comment is one line, trailing or immediately above its line, and explains a "why not the obvious thing"**, never restating the line. A why that doesn't fit on one short line goes in the commit message or PR description.
- **The one multi-line exception is a file-level navigation block**, 5–10 lines above the exported class stating the file's job and where neighbouring work lives. `docs/style/comments.md` lists the set.

## Error handling & validation

- **`Val.assert(value, "label")` for "this shouldn't be missing" guards**, never a bare `!`; lint rejects `!`.
- **Read and validate in one step; reach for a marked read (`valueOrEmpty`, `valueNotEmpty`) only where the call site's requirement differs from its column's** Empty value allowed declaration.
- **A phrase that names the same thing in several messages or labels comes from one function.**
- **Default to a plain `throw new Error("specific message")`.** Mint a custom `Error` subclass only when callers need to catch the failure _category_ by type.
- **Guard-clause throws, never nested conditionals.** The one accepted exception is an exhaustiveness check, which ends in a trailing `else { throw new Error(...) }`.
- **`try`/`catch` has no established convention yet**; don't generalize from its one use.
- **`value`/`valueOrEmpty` throw on a row never fetched**, so a decision that branches on a cell queues its fetch in the same cycle, or says at the call site what an unfetched row means.
- **Trace whether a "shouldn't happen" condition is actually reachable before defaulting to skip-and-log**; if upstream already guarantees it can't happen, throw.

## Type modeling

- **`type` for everything computed from other types.** A plain object shape is an `interface`; lint enforces it.
- **Generic params get two-letter domain abbreviations with a constraint**; bare `T`/`K`/`V`/`O` are only for domain-free utilities (`utils/`, `appUtils/`) and tests; lint checks the two letters, not the constraint.
- **Verify a type-level claim with `IsExactly` / `assertType` / `assertNotType` from `src/testSupport/typeAssertions.ts`, never an assignment.** Measure a mapped type over the config unions before adopting it.
- **`undefined` is the one "absent" value; `null` appears only where Google's types or JSON carry it.**
- **Narrow a type until the empty case can't arise, rather than a branded-string fallback.**
- **`as` casts narrow data that's already runtime-safe; they never substitute for validation.** External values go through `Val.validate.*`/`Val.is.*`. The three accepted cast idioms are in the reasoning file.
- **A registry keyed by a finite name union takes a plain `: Type` annotation, not `makeStructuredConfig`**, which stays for the generated config files.
- **A per-kind lookup table is keyed by the finite union its producer returns, never a `switch` with a `default` over a wider type.**
- **An optional parameter that switches a function to a second job means it should be a second function.** Don't add an overload to loosen a constraint for one caller.
- **Use the named type that already exists instead of an inline shape**, for a field or return type as well as a param bag.
- **Custom generic utility types live in `utils/Obj.ts`**, PascalCase, one clear transform per name.

## Functional vs. imperative idioms

- **`forEach` only for side effects, `map` only for pure transforms — never mixed.**
- **`forEach` by default; `for…of` only when the body exits early (`break`, `continue`, `return`) or destructures `Map` entries; `for…in` only in `utils/`.**
- **`reduce` is fully accepted** for building a new object/record, rather than a manual loop with a declared accumulator: seed a fresh `{}`, `new Map()` or `[]`, mutate it and return it.
- **`flatMap` returning `[]` or `[x]` filters and maps in one pass** when the map needs the narrowed value.
- **Mutator methods return `this` for chaining.**
- **A helper returns what it produces; no output parameters.**
- **Standalone units are `function`/`export function` declarations.** Arrow functions appear only as inline callbacks; lint backs it outside tests.
- **An option that combines other options is built from them, not from copies of their bodies.**
- **`if`/`else` over a ternary for anything beyond a single trivial value pick** with no side effects; a ternary inside `${}` must also fit on one line, or it becomes a named local.
- **Encode state as a named variable and an explicit `if`, not a wrapper object or a compact operator whose meaning the reader has to reconstruct.** `??=` is for filling in a default, not for "computed yet?" tracking.

## Tests

- **A test sits beside what it tests (`Foo.test.ts`) and imports only from its own tier and below.**
- **Test an endpoint through `EndpointRun`, never by calling its action**, and assert the batch-update requests the run emits. No test reaches for a private helper.
- **A type-level test names an exemplar column whose value name can't churn under `gen:configs`.**

## Tooling

- **The hooks, the framework's `scripts/` and the tool configs follow this file too**, all but the tier class-shape rules (coordinators, Operators, collaborators, Meta columns) and the Sheets verb list.
- **The framework's `scripts/` may use `Val`; the hooks and the `config` package never import from `packages/`** and write plain guards instead.

## Imports & file organization

- **No barrel/index files** but the framework's two public entries, `src/framework.ts` and `src/frameworkTesting.ts`; `src/index.ts` is the Apps Script entry point, not a barrel.
- **File naming:**
  - PascalCase mirroring the exported class name.
  - A short PascalCase abbreviation for a file exporting one static-bundle object of related functions (`Str`, `Obj`, `Arr`, `Tim`, `Val`); `SerialDate` is the exception, named for its type because it's the one utility the framework exports to business code, which has its own copy of `Arr`. A fat bundle's pieces split into a same-named subfolder and are re-assembled in the parent file.
  - camelCase for plain data/config or entry-point files.
  - A long module's helpers split by subject into a same-named subfolder of camelCase files, each exporting camelCase bundles written with method shorthand.
- **Tier subfolders**: `ClassBases/` for base and Common classes + their prop interfaces; `Types/`/`ClassTypes/` for supporting state/shape types consumed by that tier's classes.
