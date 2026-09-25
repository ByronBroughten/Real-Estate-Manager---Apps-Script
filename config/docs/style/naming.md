# Naming

Style fragment. The one-line rules live in [`docs/style.md`](../style.md); this file holds the reasoning and the worked examples.

One heading per naming rule, in docs/style.md's order: grep `^## ` for the rule you're applying and read that section.

## Prefer TS/JS vocabulary over a made-up adjective

**Prefer a term from TS/JS's own vocabulary over a made-up adjective, once one fits.** `PureValueName`/`PureValue`/`PureValueNamesToTypes` (`utils/Val.ts`) named the `string | number | boolean | date` family after a vague "pure" adjective; renamed to `PrimitiveValueName`/`PrimitiveValue`/`PrimitiveValueNamesToTypes` once it was clear that's exactly what the set is — no invented term needed when the language already has one.

## Name a value after the domain type it holds

**Name a value after the domain type it holds, not a generic container word.** `entries`, `results`, `data` describe the shape (a container) but not what's in it; prefer the name that matches the actual type/concept, especially when that type already has a name elsewhere in the codebase. `columnEntries()` → `newColumnConfigs()` (returns what becomes `columnConfigs.ts`), its local `entries` → `columnConfigs`, and the per-sheet `sheetEntries` → `tableColumnConfigs` (matching the `TableColumnConfigs` type each value actually is).

## A boolean is a third-person statement

**A boolean is named as a third-person statement about its subject, never a bare adjective.** `is` and `has` are the usual verbs — `isActive`, `isFormula`, `hasValue`, `hasIdColumn` — but they're the common case, not the rule; reach for whatever verb states the thing plainly. `isRunOnUncheck` names a property of the flag rather than a behaviour of its subject, and is wrong for that reason. Such a flag defaults to `false`, so its absence means the ordinary behaviour and it only ever appears where it's doing something.

### A config-literal flag is an imperative directive

**An optional flag in a config literal is the exception: it is an imperative directive to whatever reads the literal, not a statement about the thing it sits on.** An endpoint entry's flags are `retainSelection`, `requireOneRow`, `runOnUncheck` — retain the selection, require one row, run on uncheck (#18). They read as third-person statements first (`retainsSelection`, `runsOnUncheck`, #11), which was defensible one flag at a time and stopped being so once a flag arrived — `requireOneRow` — that commands something the framework does rather than describing something the entry is. Mixing the two moods in one literal makes a reader work out which flags command and which describe, so the whole set takes the imperative.

## A plural method name promises more of the same

**A plural method name promises more of the same return, not a different container.** `rowByValue` finds one row by a value, so `rowsByValue` could only mean every row matching a value. When the plural would change the shape rather than the count, it needs its own name.

## Trim a method name to what its return type doesn't say

**Trim a method name to what the return type doesn't already say.** `generateConfigFilesSources` became `generateConfigFiles`: the return type already says they are sources.

## A name reads to a newcomer

**A name has to read to someone who has never opened this codebase.** A flag named after the mechanism that sets it becomes jargon at every call site that isn't that mechanism. Prefer the word a newcomer would guess: a row held even though it looks empty is `isReserved`, not `claimed` (#10).

## Constants are camelCase and grouped

**A constant is camelCase, and two or more in one file that serve one purpose become one `as const` object named for that purpose** (#61). SCREAMING constants spent the shout on values that need no warning, so the multi-row delete's name stopped standing out; camelCase leaves the shout to that one method. Grouping names the purpose once instead of repeating it as a suffix on every sibling: `SHEET_PROPERTIES_FIELDS`, `CONDITIONAL_FORMAT_FIELDS` and the rest became `fieldMasks.sheetProperties` and friends in the Google Sheets adapter, and the summary's four widths and caps became `layoutLimits`. A constant with no sibling stays a plain `const` (`sheetsApiBase`). Google's own enum strings (`"CUSTOM_FORMULA"`, `"NUMBER_EQ"`) are values, not names, and keep Google's spelling. `@typescript-eslint/naming-convention` holds variables to camelCase or PascalCase and rejects an all-caps word, and leaves method names free so the delete's shout still passes.

## Getters are one-expression pass-throughs

**Getters are only for cheap, no-arg, side-effect-free derived values that might need re-deriving from updated state** (`get ss`, `get schema`, `get sheetConfigOperator` — each rebuilds from `this.spreadsheetNamedProps`, which can reflect state mutated since construction). Anything that takes an argument or has a side effect is a method, never a getter. And a value that's genuinely fixed for the object's whole lifetime (e.g. a file path built once from `import.meta.url`) is a plain field computed once, not a getter recomputed on every read.

No-arg and side-effect-free isn't sufficient on its own — a getter is reserved for a one-line pass-through/delegation to another value. `ColumnRaw.get topCell()` (`return this.cell(this.schema.topDataRowIdx)`) and `ColumnMetaRaw.get valueValidationStrings()` (`return this._tableColumnState()?.validationValues ?? []`) are getters for exactly this reason — one expression, no branching. A no-arg method that loops or branches to *compute* its answer — `ColumnMetaRaw.activeValidationValueTitle()` (loops over validation strings, regex-matching each), `.activeValueTitle()` (branches on the header), `._actualPrimitiveValueName()` (branches on typeof/format) — stays a called method with `()`. The parens are the reader's signal that real work happens inside, not just a field read.

## The `_` prefix: narrow-purpose, not general API

**`_` prefix means "narrow-purpose, not general API," and shows up in two shapes:**
1. A true private helper, decomposing a public method — pair it with the `private` keyword.
2. A method that a coordinating/encapsulating class must call as one step of a specific flow, but that isn't meant as general-purpose API on its own class. It *can't* be marked `private` (TS blocks cross-class access even from a coordinator), so the leading `_` is the only signal a future caller gets that this isn't for general use. Real example: `SheetMetaIdentified._gatherDataPrerequisites` is called by `SpreadsheetIdentified.fetchAllPrepped` as one step sandwiched between two ordinary public methods (`gatherFetchDataPrepped`, `finalizeFetchedData`) — it's underscored precisely because it only makes sense inside that one flow.

This case-2 underscore is about the method's *concept* being orchestration-only, not about how many callers it happens to have today. A method that instead reads as ordinary domain vocabulary for the class it's on — because it matches an existing naming family already used for sibling members — stays unprefixed even with exactly one current caller. `ColumnMetaRaw.activeValueTitle()` and `.activeValidationValueTitle()` are called from Column Config emit, the value-title list Value Config catalogs, and untyped-column recording, but they're plain public methods, not `_activeValueTitle` — they fit the same `active*` family as `activeHeader`/`activeIsFormula` on the same classes, so they read as legitimate queries on the column itself rather than glue steps of someone else's flow.

## Destructure params or stay positional

**Param style: destructure into a named type when the params already justify grouping; otherwise stay positional.** Destructure + a type (existing or newly introduced) when there are 3+ params, or 2+ params of the same type, or a named type for the bag already exists elsewhere. Otherwise keep params positional. Example (`SpreadsheetNamed._prepFetchStandardProps` and the module function `prepFetchRowSpecifier` below it):
```ts
private _prepFetchStandardProps({ rowSpecifier, sheetColumnNames }: FetchPropsStandardNamed): void
```
destructures because `FetchPropsStandardNamed` already exists as a named type — the method just unpacks an existing concept. Compare a case that stays positional because nothing ties the params together as one concept — three unrelated single-use values, no shared type:
```ts
function prepFetchRowSpecifier(sheet: SheetIdentified, rowSpecifier: RowSpecifierName, columnId: string): void
```

## Hoist the argument every implementation uses

**The one argument every implementation will use is hoisted out of the bag and passed first, positionally.** The grouping rule above is about params that travel together; it doesn't apply to a collaborator that essentially every implementation of a signature needs. An endpoint's action takes the spreadsheet first and its remaining inputs as a second destructured object, because every action needs the spreadsheet and only some need the rest — burying it in the bag would make every implementation destructure to reach the thing it always wants.

## Group paired fields the same way

**The same grouping judgment applies to fields, not just method params.** Two or more naturally-paired values (e.g. a pair of output file paths) get grouped into one object property rather than kept as separate top-level members. The framework's `scripts/genConfigs.ts` groups its three output paths as `path: { sheetConfigs, columnConfigs, valueConfigs }` rather than three separate `sheetConfigsPath`/`columnConfigsPath`/`valueConfigsPath` members.
