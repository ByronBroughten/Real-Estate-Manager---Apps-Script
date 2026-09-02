# Real Estate Manager — Apps Script

A Google Apps Script project (TypeScript, compiled and pushed via `clasp`) for managing real estate operations — properties, units, households, leases, subsidies, charges, and payments — on top of a Google Sheets spreadsheet that acts as the database and the UI.

## Two layers, one codebase

This repo is really two things stacked on top of each other:

- **`src/00_*` through `src/06_API/` are a project-agnostic framework** for building typed, structured apps on top of Google Sheets + Apps Script. The Raw tier talks to the Sheets Advanced API purely in terms of raw row/column indexes and sheet properties; the Indexed and Named tiers resolve the typed schema on top of that by index/name. A dedicated Operators tier (`05_Operators`) sits above Named and owns generating/updating `01_generatedConfigs` from the live "Sheet Config"/"Column Config"/"Value Config" sheets — maintaining generated data is neither Raw's nor Named's job. `06_API` sits on top as a generic endpoint-dispatch layer (`Api`, `EndpointHandler`/`EndpointHandlerBase`) that routes sheet-edit events to registered endpoints by column name. Nothing in these folders should reference real-estate concepts (properties, leases, tenants, etc.). If you're adding something reusable that any Sheets-backed app would want, it belongs here.
- **`src/businessEndpoints.ts` and `src/businessEndpointHandlers/` are this specific project** — together the only place real-estate domain logic (charges, leases, subsidies, payments, ledgers) should live: `businessEndpoints.ts` holds the `endpoints` record passed into `06_API`'s `Api` class, and `businessEndpointHandlers/` holds the domain classes it dispatches to. Everything here is built on top of the framework layers below it.

Keep that boundary in mind before adding a file: "would this make sense in a completely different Sheets-backed app?" If yes, it belongs in 00–06, generically named. If no, it belongs in `businessEndpoints/`.

## How it runs

This is **not** a Node app at runtime. `src/` is TypeScript compiled by `rollup` (via `@rollup/plugin-typescript`) into a single `dist/bundle.js`, which `clasp` pushes to a Google Apps Script project. The code then executes server-side inside Apps Script against the Sheets Advanced Service (`Sheets.Spreadsheets...`), not the `SpreadsheetApp` UI-bound API. Node/DOM APIs are not available at runtime — only in the local build tooling (`rollup`, `tsc`, `scripts/*.mjs`).

Entry points are the top-level functions exported from `src/index.ts` (e.g. `triggerOnEdit`, `generateConfigFiles`). Apps Script calls into these by name — via installed triggers, `clasp run <functionName>`, or (once wired up) spreadsheet menu items.

## ⚠️ Before touching the live spreadsheet or deployment

**Never run these without asking the user first** — they affect a live Apps Script deployment and/or read the user's real Google Sheet:

- `npm run build` (runs `clasp push`)
- `clasp push`, `clasp run <anything>`, `clasp deploy`
- `npm run gen:configs` (runs `clasp run` under the hood — see below). Unlike a plain read, this also **writes** to the live Sheet Config/Column Config sheets and to business sheets' header rows (adding missing column IDs) as part of syncing before it regenerates the local files.

`npm run tsc` (type-checking only) is always safe to run freely.

### The `gsheets` MCP tools

This project also has a `gsheets` MCP server available, which can read and write the user's real Google Sheet directly — separately from `clasp`/Apps Script.

- **Read-only tools are always fine to use freely**: `list_spreadsheets`, `list_sheets`, `get_sheet_data`.
- **Any tool that writes — `create_spreadsheet`, `create_sheet`, `update_cells`, `batch_update_cells` — requires stating a specific plan and getting explicit permission before calling it.** "Can I edit the sheet?" is not enough; state the exact sheet, range, and values (or the exact new sheet/spreadsheet being created) and wait for a yes.
- **`share_spreadsheet` needs its own, separate confirmation** — it grants a third party access, not just data. State exactly who it's being shared with and at what permission level, and get explicit sign-off on that, distinct from any data-write approval.

## Architecture: the numbered tiers

Each top-level folder under `src/` is a dependency tier. **Rule: dependencies only point downward.** A file in tier `N` must never import from a tier numbered higher than `N`. When adding a file, put it in the lowest tier that satisfies what it actually needs — don't reach for a higher tier out of convenience.

| Folder                  | Tier role                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | May import from  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `00_base`               | Zero-dependency primitives: `CellValue`/`CellValueName` types, base (non-config-dependent) value schemas, raw Apps Script service wrappers (`AppsScript.ts`), ambient GAS types.                                                                                                                                                                                                                                                                                                                                                                                                                                        | `utils/` only    |
| `01_generatedConfigs`   | The config data describing the spreadsheet's own structure — which sheets exist, their columns (by `columnId`, no longer by index), value-name enums, and the hand-authored layout constants (`spreadsheetConfig`) — plus the schema types built from that data. Includes a small hardcoded/bootstrap subset for the Sheet Config/Column Config sheets themselves. See "Generated data" below.                                                                                                                                                                                                                          | `00`             |
| `02_SpreadsheetRaw`     | Low-level, **config-independent** wrapper around the Sheets Advanced API: fetch/update whole rows and cells by sheet GID + row/column index, and fetch sheet properties. Includes `UniformRowRaw`, a structural row (header/columnId/footer) addressed by role name rather than by any generated schema. The Raw *classes* never resolve a column by name or column ID — see 03/04. The folder also owns the schema module (`SpreadsheetSchema`/`SheetSchema`/`ColumnSchema`), which must live below both tiers that consume it; `SheetSchema`/`ColumnSchema` do resolve columns, so Raw classes are held to `SpreadsheetSchema` by convention rather than by the import graph (see "The schema classes"). | `00`, `01`       |
| `03_SpreadsheetIndexed` | Config-**dependent** classes that address sheets/columns by GID/index rather than by name (`SheetIndexed`, `ColumnIndexed`, `DataRowIndexed`, etc.). A column's index is resolved here at runtime — by looking up its `columnId` (from `01_generatedConfigs`) against the live "columnId" row fetched via `02`'s `UniformRowRaw` — rather than being stored in config data.                                                                                                                                                                                                                                       | `00`, `01`, `02` |
| `04_SpreadsheetNamed`   | Config-dependent, **name**-based API — the one most application code should use (`SheetNamed`, `ColumnNamed`, `DataRowNamed`, `CellNamed`).                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `00`–`03`        |
| `05_Operators`          | Config-maintenance operators: `SheetConfigOperator`/`ColumnConfigOperator`/`ValueConfigOperator` each read one real Config sheet ("Sheet Config"/"Column Config"/"Value Config") by name and regenerate the matching tier-01 file; `ConfigOrchestrator` coordinates all three into one atomic sync-then-regenerate flow; `GenericSheetOperator` is their shared base. Depends on `04_SpreadsheetNamed` since it reads sheets by name.                                                                                                                                                                              | `00`–`04`        |
| `06_API`                | Generic, config-independent-of-domain endpoint dispatch: `Api` decodes a sheet-edit event into a column's full name and calls the matching registered endpoint, choosing by name suffix between a *runner* and a *selector* (see "Endpoint dispatch" below); `EndpointHandler`/`EndpointHandlerBase` are scaffolding for endpoints that need to report run/success status back to the sheet. Still project-agnostic — takes its endpoint map as a generic parameter, so it has no real-estate knowledge itself.                                                                                                                                                                                                      | `00`–`05`        |

`src/businessEndpoints.ts` and `src/businessEndpointHandlers/` sit outside the numbering (like `utils/`) as the real-estate domain logic for _this_ project — the only place allowed to know about properties, leases, tenants, etc. `businessEndpoints.ts` builds the endpoint map passed into `06_API`'s `Api` class; `businessEndpointHandlers/` holds the domain classes it dispatches to. Both may import from any tier. `src/index.ts` sits outside the numbering as the entry-point file Apps Script calls into.

### Queued writes and shared state

`update`/`append`/`delete` don't hit the API — they mutate local cell state and register the coordinate in `rawState.changesToSave`. Nothing reaches the spreadsheet until `batchUpdateGSheets()` gathers those into one `batchUpdate` call.

Most writes queue per cell and flush as one `updateCells` request each. A whole-column write (`DataColumnIndexed.allCellsToValue`) instead queues one sheet-level *fill* that flushes as a single `repeatCell`, so filling a column costs one request rather than one per row. Two consequences are invisible at the call site: fills are ordered **before** per-cell updates within a flush, so a per-cell write on a filled column wins regardless of which was queued first; and a fill's last row is snapshotted when queued, so it never reaches a row appended after it. State is still mirrored row by row — only the request collapses.

That `rawState` is threaded **by reference** through `spreadsheetNamedProps` into every collaborator getter, so an endpoint, its `ConfigOrchestrator`, and every operator beneath it all share one queue. A flush therefore commits everything queued anywhere in the run, not just what the calling object queued — which is why a failure path must `discardQueuedChanges()` before writing status, or the `finally` flush ships a half-finished sync. Discarding leaves local state reflecting writes that never happened, so it's a terminal step only.

### Endpoint dispatch

An action-row checkbox is wired to an endpoint by its **column name suffix**, declared in `spreadsheetConfig`:

- **Runner** (`runnerEndpointSuffix`, `TimeLastRan`) — a run button. Fires only when the box is checked; the endpoint receives just the spreadsheet props.
- **Selector** (`selectorEndpointSuffix`, `Select`) — the checkbox *is* the input, not a button. Fires on check **and** uncheck, and receives `isSelected`.

`Endpoints` is the intersection of two `Partial<Record<…>>`s keyed by those suffix-filtered unions, so the two families have different signatures and a key that is not a real `ColumnFullNameSimple` is a compile error. Register endpoints with a plain `: Endpoints` annotation — **not** `makeStructuredConfig`, which lets an unknown key through (see STYLE.md, "Type modeling").

Two things to know:

- **Endpoints are constructed from `Api`'s `SpreadsheetNamedProps`** (`static init(props)`), never from a no-arg `init()` that mints fresh `rawState`. `Api` has already fetched the sheet's properties and columnId row by the time it dispatches; minting fresh state re-fetches all of it. The idempotence guards (`hasFetchedProperties`/`hasFetchedColumnIds`) make a second `ensureColumnIdsAreFetched()` free when the state is already there.
- **The suffix match is case-sensitive.** A header of bare `"Select"` camelCases to `select`, which matches neither the type nor the runtime check, so such a column silently is not an endpoint. Several sheets have one today; that's fine as long as it's deliberate.

### Round trips are the cost

Every call to the Sheets API funnels through exactly two methods — `SpreadsheetRaw.fetchAllGathered` (reads) and `SpreadsheetRaw._sendUpdateRequests` (writes). Instrument those two and you have measured everything.

Measured against the live spreadsheet (Sept 2026): a round trip costs **~250–450ms**, while the framework's own CPU for a whole trigger is **~20–60ms**. Making the code faster does not move the number; removing a round trip is the only thing that does. The `triggerOnEdit` path is down to two — one read for the column indexes and table bounds, one write — which is the floor, since neither can be derived without asking the API.

**`SpreadsheetApp` is not a cheaper alternative, despite the intuition that a trigger already has the sheet open.** Measured the same day: `getLastRow()` + `getLastColumn()` + `getRange().getValues()` cost ~494ms against ~350ms for the single `getByDataFilter` they would have replaced. Each `SpreadsheetApp` call is its own round trip. This was tested and rejected — don't re-propose it without new measurements.

### Type-check cost

The generated config describes ~574 columns across ~28 sheets, and a lot of this codebase's typing is mapped/conditional types over those unions. That work is cheap until it isn't, so measure rather than guess: `npx tsc --noEmit --extendedDiagnostics` is always safe to run and reports instantiations and check time.

Baseline (Sept 2026): **~286k instantiations, ~1.2s check time.** A mapped filter over the flat column map (`{ [K in ColumnFullNameSimple]: … }`) costs **~48k instantiations per distinct instantiation** — cheap, and cheaper *lazily* than precomputed: eagerly grouping every value name up front cost ~390k, while filtering per use costs ~48k each and only for the value names actually used.

**The known cliff is a widened template literal over both names.** Building `` `${SN}${NameDelimiter}${CN}` `` when both are unions enumerates the full ~28 × ~574 cross product before any intersection can prune it, which produces `TS2590: Expression produces a union type that is too complex to represent` and takes check time to **~7s**. Going the other way — from a full name to its parts, by indexed access on the flat map — costs nothing. That asymmetry is why there is no type-level bridge from `<SN, CN>` to a column full name.

### The schema classes

`src/02_SpreadsheetRaw/SpreadsheetSchema.ts` holds all three, in one module because they form an import cycle — `extends` is evaluated at module init, so under the bundler a split would risk a "cannot access before initialization" crash in Apps Script that neither `tsc` nor the tests would catch.

| Class                 | Answers                                                             | Reached from                               |
| --------------------- | ------------------------------------------------------------------- | ------------------------------------------ |
| `SpreadsheetSchema`   | Uniform-row indexes, ID encode/decode, layout constants, sheet list | Spreadsheet-level and every Raw-tier class |
| `SheetSchema<SN>`     | A sheet's traits, its column IDs and names                          | Sheet-level and row-level classes          |
| `ColumnSchema<SN,CN>` | A column's value name, validation, default, full name               | Column-level and cell-level classes        |

`SheetSchema` and `ColumnSchema` are **siblings**, both extending `SpreadsheetSchema`. `ColumnSchema` does *not* extend `SheetSchema` — it reaches its sheet through a `sheet` accessor. That's forced: one accessor named `schema` declared at the Raw root means every narrowing override must be assignable to what the root declares, and the consuming class tree branches (the sheet class, the row base and the column base are siblings under a shared sheet-scoped base), so the two need only be assignable to `SpreadsheetSchema`, never to each other.

**One accessor.** Every class that has a schema exposes it as `schema`, narrowed to its level. There is no `baseSchema`, `ssSchema`, `columnSchema` or `sheetSchema` — if you find one, it's a leftover.

**Two addressing modes, one class.** Both are entry points rather than separate hierarchies, and each resolves all of its coordinates eagerly at construction so later lookups use whichever index is cheapest:

| Built from | Entry point                                | Types                                              |
| ---------- | ------------------------------------------ | -------------------------------------------------- |
| Sheet name | `SheetSchema.fromSheetName(sheetName)`     | Full literal precision — column names autocomplete |
| Sheet GID  | `SheetSchema.fromSheetGid(sheetGid)`       | Widened defaults, as Indexed-tier callers expect   |
| Both names | `ColumnSchema.fromColumnName(sn, cn)`      | Value name resolves to its exact literal           |
| GID + ID   | `ColumnSchema.fromColumnId(gid, columnId)` | Value name is the full union                       |

The statics are named distinctly per class because static members are inherited, so same-named helpers of different arities would collide. Navigation avoids the bare name `sheet` for the same reason it's reserved on `ColumnSchema`: `SpreadsheetSchema.sheetByName`/`.sheetByGid`, `SheetSchema.columnByName`/`.columnById`.

### The column class chain is not shaped like the others

Sheets, rows and cells each get a `ClassBases/` base class in their tier. **Columns don't** — `ColumnNamedBase` sits directly in the tier folder and *is* the base, with an abstract `ColumnCommonNamed` between it and the two concrete classes:

```
ColumnNamedBase<SN, CN>          // the base: columnName, schema, columnNamedProps
  └─ ColumnCommonNamed<SN, CN>   // abstract; adds columnId, sheet
       ├─ ColumnNamed<SN, CN>
       └─ DataColumnNamed<SN, CN>
```

There is no `DataColumnNamedBase`. A class that wants to sit beside `DataColumnNamed` rather than under it extends `ColumnNamedBase` and reaches the data column through a getter — which is what `GenericSheetOperator` does one level up (`extends SheetNamedBase`), and what the column-scoped endpoint classes in `06_API` already do.

**The widened instantiation must never collapse to `never` — and today it doesn't.** The hazard is real but guarded: indexing a union of sheets by a union of column names naively requires the column name to key *every* sheet, which would yield `never`, so `ColumnValueName` (in `columnConfigsTypes.ts`) is deliberately written to distribute over the sheet name instead. That is why it looks the way it does; it is not a description of a current defect. Type assertions in `SpreadsheetSchema.test.ts` pin both ends — exact literal on the named path, full union and specifically not `never` on the widened one — and fail `npm run tsc` if either degrades. `tsc` passing is not by itself evidence that precision survived, which is why those assertions are not optional. Neither is an assignment — see STYLE.md's "Verify a type-level claim with an identity check."

## Naming vocabulary

These words are used precisely and consistently — don't use them loosely:

- **Raw** — depends on nothing generated from the spreadsheet's config sheets except `spreadsheetConfig` and sheet GIDs. If a *class* resolves a column by name or `columnId`, it is not "Raw," regardless of what folder it's in. Raw's job is raw-index Sheets API access only — fetching whole rows/columns and sheet properties. The schema module is the one thing in `02` that resolves columns, and only because it has to sit below its consumers; Raw classes get `SpreadsheetSchema` and nothing more.
- **Indexed** — config-dependent, addresses things by sheet GID / column index (not by name). A column's index isn't stored in config data; Indexed resolves it live from the column's `columnId` against the live "columnId" row.
- **Named** — config-dependent, addresses things by sheet name / column name.
- **Operator** — config-dependent, reads a real Config sheet by name and regenerates the matching tier-01 config file from it (`SheetConfigOperator`/`ColumnConfigOperator`/`ValueConfigOperator`), or coordinates several Operators into one flow (`ConfigOrchestrator`). Maintaining generated data is an Operator-tier job, not Named's.
- **Config** — the data describing the spreadsheet's own structure, generated (or eventually generated) from the real spreadsheet rather than freely made up. Lives in `01_generatedConfigs`. Naming has three tiers, from a full collection down to a single fact:
  - **`xConfigs`** (plural, e.g. `sheetConfigs`) — the whole map, one entry per sheet/column/value-name.
  - **`XConfig`** (singular, e.g. `SheetConfig`, `ColumnConfig`) — one entry's full record.
  - **trait** — one property picked out of a single config record (e.g. a sheet's `sheetGid`), via accessors like `getSheetTraitByGid`/`getColumnTraitByIndex`. The same word is reused one layer up for picking a single property out of a `ValueSchema` (`getValTrait`) — "trait" always means "one property of a multi-field record," never a collection.
  - `spreadsheetConfig` is the one exception to the plural/singular split: there's only one spreadsheet, so it's a single record with no separate `spreadsheetConfigs` collection.
  - `sheetConfigs`/`columnConfigs`'s own entries for the four config-describing sheets — `sheetConfig`, `columnConfig`, `spreadsheetConfig`, and `valueConfig` — are guaranteed to always come out the same on regeneration, forming a fixed floor underneath the generation process itself (it needs a fixed way to find those sheets and their own columns before it can generate anything else). Treat that floor as guaranteed, not as data to "fix" by trying to regenerate it away.
- **Schema** — type/validation logic layered on top of Config data. Two unrelated families share the word: the spreadsheet schema (`SpreadsheetSchema`/`SheetSchema`/`ColumnSchema`, see "The schema classes") and the value schema (`ValueSchema`, for validating a single cell's value). **Every cell is tri-state: `Value<VN>` always includes `""`** — a `boolean` column reads `boolean | ""`, a `number` column `number | ""` — because an untouched cell is empty, not defaulted. Code that branches on a column's value has to say what empty means rather than assuming the base type.

If you're renaming or relocating something and unsure which word applies, ask rather than guess — these distinctions were deliberately hashed out and folder placement depends on them.

## Generated data — do not hand-edit

`src/01_generatedConfigs/` holds four config constants, each split across two files: an `xConfigs.ts` file with the literal data plus a `makeXConfigs` validating constructor, and a sibling `xConfigsTypes.ts` file with the derived types and accessor functions built on top of it (`spreadsheetConfig`/`spreadsheetConfigTypes`, `sheetConfigs`/`sheetConfigsTypes`, `columnConfigs`/`columnConfigsTypes`, `valueConfigs`/`valueConfigsTypes`). `sheetConfigs` and `columnConfigs` additionally have a `sheetConfigBuilder.ts`/`columnConfigBuilder.ts` file holding their per-entry record type and constructor (`SheetConfig`/`msc`, `ColumnConfig`/`mcc`) — split out from the main pair specifically to avoid a circular import between the data file (which needs the per-entry constructor to build itself) and the types file (which needs the finished data to derive things like the by-GID lookup map).

All four are (or are meant to be) mechanically generated from the real spreadsheet, not hand-authored:

- **`sheetConfigs`** (`01_generatedConfigs/sheetConfigs.ts`) — generated by `SheetConfigOperator` (`05_Operators`), reading the real "Sheet Config" sheet by name.
- **`columnConfigs`** (`01_generatedConfigs/columnConfigs.ts`) — generated by `ColumnConfigOperator` (`05_Operators`) from the "Column Config" sheet. No longer stores a column's index (`colIndex`) — `03_SpreadsheetIndexed` resolves that live from `columnId` instead, since a stored index would go stale as columns are added/removed/reordered. Per column, only `columnId`/`valueName`/`header`/`isFormula` are generated; `emptyAllowed`/`customDefaultValue` are always emitted at their defaults for now, and `isActionControl` isn't part of the generated shape at all. **`isFormula` is *sampled* — read off the column's top data-row cell during generation, not declared** — so it can flip between regenerations if someone edits that cell. Fine as data; treat it with care as a *type* axis, since a routine `gen:configs` run can then change which columns satisfy a constraint, and the resulting error surfaces far from the spreadsheet edit that caused it.
- **`valueConfigs`** (`01_generatedConfigs/valueConfigs.ts`) — generated by `ValueConfigOperator` (`05_Operators`) from the live "Value Config" sheet, once `columnConfigs` is already synced (it reads each active column's header data across business sheets to build the value-name → allowed-values map).
- **`spreadsheetConfig`** (`01_generatedConfigs/spreadsheetConfig.ts`) — the constraints every sheet in the spreadsheet must be written to satisfy: uniform-row indexes, the ID delimiter, the Config sheets' own GIDs, and the endpoint-name suffixes (`selectorEndpointSuffix`/`runnerEndpointSuffix`). The test for what belongs here is *scope, not kind* — a constant governing how any sheet must be authored belongs here even if only one tier reads it; a constant governing one tier's internal behavior does not. Still genuinely hand-authored; no generator exists yet.

**`sheetConfigs`, `columnConfigs`, and `valueConfigs` must always be regenerated together, in the same run — never a subset of them.** Sheet names live as keys in `sheetConfigs.ts`, and `columnConfigs.ts` is keyed by those same names; `valueConfigs.ts` in turn depends on `columnConfigs` already being current to know which columns' headers to read. Regenerating a subset after a sheet/column was renamed/added/removed leaves the others referencing stale names, which breaks `npm run tsc` in places that look unrelated (the generated files themselves, plus any hand-written code — like `SheetNameGroups.ts` — that references a sheet name by string literal). Regenerate all three with `npm run gen:configs` (requires `clasp run` — see the deploy-safety note above), which calls a single Apps Script entry point (`generateConfigFiles`, in `src/index.ts`) that delegates to `ConfigOrchestrator` (`05_Operators`): it syncs the live Sheet Config sheet, then the live Column Config sheet (including adding any missing column IDs to business sheets), flushes all of that in one write, then reads the live Value Config sheet, and only then emits source for all three files. The npm script writes all three files or none, and runs `npm run tsc` itself afterward so a stale hand-written reference surfaces immediately.

`ConfigOrchestrator.syncAndFlushConfigSheets()` syncs the live Sheet Config/Column Config sheets without regenerating the local files, but it isn't wired to a callable entry point yet. Unlike `generateConfigFiles`, it's planned to be exposed as a `06_API` endpoint rather than a `clasp run`-able function, so it isn't available ad hoc today.

Do not hand-edit (or AI-edit) the literal data inside `sheetConfigs`/`columnConfigs`/`valueConfigs` once they have real generators — always regenerate from the spreadsheet instead. Structural/type changes around them (not the data itself) are fine.

**Exception — the config-sheet floor.** `sheetConfigs`/`columnConfigs` entries describing the four config-describing sheets themselves — `sheetConfig`, `columnConfig`, `spreadsheetConfig`, and `valueConfig` — are guaranteed to always be as they are, regardless of what a regeneration run produces. `SheetConfigOperator`/`ColumnConfigOperator` need _some_ fixed way to find those sheets and their own columns before they can generate anything else, so these entries form a floor underneath the rest of the generated data rather than being freely regenerable. This guarantee is planned but not yet enforced in code. Don't "fix" these entries by trying to regenerate them away.

## Testing

Tests run on [Vitest](https://vitest.dev): `npm test` (single run), `npm run test:watch`, or `npm run test:coverage`. None of it touches the live spreadsheet or Apps Script — it's plain Node against fakes — so it's always safe to run freely, same as `npm run tsc`.

- **Layout**: a test is co-located with what it tests — `Foo.ts` → `Foo.test.ts` in the same folder. This obeys the same downward-only tier-import rule as production code: a test only imports from its own tier and below.
- **Mocking the GAS globals**: this is not a Node app at runtime (see "How it runs" above), so nothing defines `SpreadsheetApp`/`Sheets`/`PropertiesService`/`ScriptApp` when tests run under Node — any test exercising code that touches them needs those globals stubbed first. `src/testSupport/` holds shared fakes for that, sitting outside the numbered tiers (like `utils/`) so any tier's tests can import it:
  - `fakeSheetsService.ts` — a `stubSheetsService()` fake for the `Sheets` Advanced Service. `Spreadsheets.get`/`getByDataFilter` are backed by a real in-memory fixture and typed against the actual `GoogleAppsScript.Sheets.Schema` types, so a fixture that drifts from the real response shape is a compile error. `batchUpdate` is currently a spy only — it records the exact requests sent but doesn't replay them onto the fixture; the Sheets request grammar (`appendCells`/`updateCells`/`insertDimension`/`sortRange`/...) is large, so extend this as tests come to need particular request kinds applied back.
  - `fakeAppsScriptGlobals.ts` — `stubPropertiesService()` (in-memory script properties) and `stubScriptAndSpreadsheetApp()` (a fluent trigger builder covering `AppsScript.trigger`'s usage).
- **Scope so far**: `00_base`–`03_SpreadsheetIndexed` are almost entirely GAS-independent pure TS (schema/config resolution, ID encode/decode) and need no mocking at all — that's the highest-value, easiest place to add coverage. The GAS-touching surface is narrow: `00_base/AppsScript.ts` and `02_SpreadsheetRaw/SpreadsheetRaw.ts` are the only production files that reference the ambient globals directly. `src/businessEndpointHandlers/` is out of scope until it's reimplemented (see "Known rough edges" below).
- **Live-sheet verification**: there's no standing integration-test tier against a real spreadsheet. When Claude is asked to extend this test infrastructure, it may use the `gsheets` MCP ad hoc (per the read/write rules above) to sanity-check that a fake's behavior actually matches the real API — that stays a manual verification step, never part of `npm test`/CI.
- **CI**: `.github/workflows/test.yml` runs `npm run tsc` and `npm run test:coverage` on push/PR to `master`. Coverage is reported, not gated — no failure threshold yet.

`npm run tsc` remains the whole *type*-verification story — run it (and the tests) before considering any change complete, and treat any new type error as something you introduced unless you've confirmed otherwise (check whether the same error exists on a clean checkout, or ask).

## Known rough edges

- **Most of `src/businessEndpointHandlers/*.ts` is currently commented out.** `businessEndpoints.ts` itself is live (it's the endpoint map wired into `Api` via `triggerOnEdit`), but the domain classes it will eventually call — `ChargeMgmt`, `ExpenseMgmt`, `LeaseMgmt`, `LedgerMgmt`, `PaymentMgmt`, `SubsidyMgmt` (in `src/businessEndpointHandlers/`) — predate the 00–06 reorganization and are kept fully commented out as reference for reimplementing on the current architecture, one file at a time.
