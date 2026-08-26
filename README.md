# Real Estate Manager — Apps Script

A Google Apps Script project (TypeScript, compiled and pushed via `clasp`) for managing real estate operations — properties, units, households, leases, subsidies, charges, and payments — on top of a Google Sheets spreadsheet that acts as the database and the UI.

## Two layers, one codebase

This repo is really two things stacked on top of each other:

- **`src/00_*` through `src/05_Api/` are a project-agnostic framework** for building typed, structured apps on top of Google Sheets + Apps Script. The Raw tier talks to the Sheets Advanced API purely in terms of raw row/column indexes and sheet properties; the Indexed and Named tiers resolve and maintain the typed schema on top of that — including generating and updating `01_generatedConfigs` from the live "Sheet Config"/"Column Config" sheets, which is now a Named-tier job, not Raw's. `05_Api` sits on top as a generic endpoint-dispatch layer (`Api`, `EndpointHandler`/`EndpointHandlerBase`) that routes sheet-edit events to registered endpoints by column name. Nothing in these folders should reference real-estate concepts (properties, leases, tenants, etc.). If you're adding something reusable that any Sheets-backed app would want, it belongs here.
- **`src/businessEndpoints/` is this specific project** — it's the only place real-estate domain logic (charges, leases, subsidies, payments, ledgers) should live, and the `endpoints` record passed into `05_Api`'s `Api` class. Everything in here is built on top of the framework layers below it.

Keep that boundary in mind before adding a file: "would this make sense in a completely different Sheets-backed app?" If yes, it belongs in 00–05, generically named. If no, it belongs in `businessEndpoints/`.

## How it runs

This is **not** a Node app at runtime. `src/` is TypeScript compiled by `rollup` (via `@rollup/plugin-typescript`) into a single `dist/bundle.js`, which `clasp` pushes to a Google Apps Script project. The code then executes server-side inside Apps Script against the Sheets Advanced Service (`Sheets.Spreadsheets...`), not the `SpreadsheetApp` UI-bound API. Node/DOM APIs are not available at runtime — only in the local build tooling (`rollup`, `tsc`, `scripts/*.mjs`).

Entry points are the top-level functions exported from `src/index.ts` (e.g. `triggerOnEdit`, `generateSheetConfigFile`). Apps Script calls into these by name — via installed triggers, `clasp run <functionName>`, or (once wired up) spreadsheet menu items.

## ⚠️ Before running deploy or generation commands

**Never run these without asking the user first** — they affect a live Apps Script deployment and/or read the user's real Google Sheet:

- `npm run build` (runs `clasp push`)
- `clasp push`, `clasp run <anything>`, `clasp deploy`
- `npm run gen:sheet-config` (runs `clasp run` under the hood — see below)

`npm run tsc` (type-checking only) is always safe to run freely.

## Architecture: the numbered tiers

Each top-level folder under `src/` is a dependency tier. **Rule: dependencies only point downward.** A file in tier `N` must never import from a tier numbered higher than `N`. When adding a file, put it in the lowest tier that satisfies what it actually needs — don't reach for a higher tier out of convenience.

| Folder                  | Tier role                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | May import from  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `00_base`               | Zero-dependency primitives: `CellValue`/`CellValueName` types, base (non-config-dependent) value schemas, raw Apps Script service wrappers (`AppsScript.ts`), ambient GAS types.                                                                                                                                                                                                                                                                                                                                                                                                                                        | `utils/` only    |
| `01_generatedConfigs`   | The config data describing the spreadsheet's own structure — which sheets exist, their columns (by `columnId`, no longer by index), value-name enums, and the hand-authored layout constants (`spreadsheetConfig`) — plus the schema types built from that data. Includes a small hardcoded/bootstrap subset for the Sheet Config/Column Config sheets themselves. See "Generated data" below.                                                                                                                                                                                                                          | `00`             |
| `02_SpreadsheetRaw`     | Low-level, **config-independent** wrapper around the Sheets Advanced API: fetch/update whole rows and cells by sheet GID + row/column index, and fetch sheet properties. Includes `UniformRowRaw`, a structural row (header/columnId/footer) addressed by role name rather than by any generated schema. Never resolves a column by name or column ID — see 03/04. Also owns `SchemaBase`, the schema mechanics shared by every tier above it (uniform-row indexes, ID encode/decode) — it depends on `01_generatedConfigs` for `spreadsheetConfig` and sheet GIDs, so it belongs above that tier rather than in 03/04. | `00`, `01`       |
| `03_SpreadsheetIndexed` | Config-**dependent** classes that address sheets/columns by GID/index rather than by name (`ColumnSchemaIndexed`, `SheetIndexed`, `DataRowIndexed`, etc.). A column's index is resolved here at runtime — by looking up its `columnId` (from `01_generatedConfigs`) against the live "columnId" row fetched via `02`'s `UniformRowRaw` — rather than being stored in config data.                                                                                                                                                                                                                                       | `00`, `01`, `02` |
| `04_SpreadsheetNamed`   | Config-dependent, **name**-based API — the one most application code should use (`SheetNamed`, `ColumnNamed`, `DataRowNamed`, `CellNamed`, `*SchemaNamed`). Also owns `SheetConfigOperator`/`ColumnConfigOperator`, which read the real "Sheet Config"/"Column Config" sheets by name and regenerate tier 01's config files — maintaining generated data is a Named-tier job now, not Raw's.                                                                                                                                                                                                                            | `00`–`03`        |
| `05_Api`                | Generic, config-independent-of-domain endpoint dispatch: `Api` decodes a sheet-edit event into a column's full name and calls the matching registered endpoint; `EndpointHandler`/`EndpointHandlerBase` are scaffolding for endpoints that need to report run/success status back to the sheet. Still project-agnostic — takes its endpoint map as a generic parameter, so it has no real-estate knowledge itself.                                                                                                                                                                                                      | `00`–`04`        |

`src/businessEndpoints/` sits outside the numbering (like `utils/`) as the real-estate domain logic for _this_ project — the only place allowed to know about properties, leases, tenants, etc. `businessEndpoints.ts` builds the endpoint map passed into `05_Api`'s `Api` class; it may import from any tier. `src/index.ts` sits outside the numbering as the entry-point file Apps Script calls into.

## Naming vocabulary

These words are used precisely and consistently — don't use them loosely:

- **Raw** — depends on nothing generated from the spreadsheet's config sheets except `spreadsheetConfig` and sheet GIDs. If a class resolves a column by name or `columnId`, it is not "Raw," regardless of what folder it's in. Raw's job is raw-index Sheets API access only — fetching whole rows/columns and sheet properties.
- **Indexed** — config-dependent, addresses things by sheet GID / column index (not by name). A column's index isn't stored in config data; Indexed resolves it live from the column's `columnId` against the live "columnId" row.
- **Named** — config-dependent, addresses things by sheet name / column name. Also responsible for maintaining `01_generatedConfigs` itself (`SheetConfigOperator`/`ColumnConfigOperator`), since regenerating config files means reading the real Config sheets by name.
- **Config** — the data describing the spreadsheet's own structure, generated (or eventually generated) from the real spreadsheet rather than freely made up. Lives in `01_generatedConfigs`. Naming has three tiers, from a full collection down to a single fact:
  - **`xConfigs`** (plural, e.g. `sheetConfigs`) — the whole map, one entry per sheet/column/value-name.
  - **`XConfig`** (singular, e.g. `SheetConfig`, `ColumnConfig`) — one entry's full record.
  - **trait** — one property picked out of a single config record (e.g. a sheet's `sheetGid`), via accessors like `getSheetTraitByGid`/`getColumnTraitByIndex`. The same word is reused one layer up for picking a single property out of a `ValueSchema` (`getValTrait`) — "trait" always means "one property of a multi-field record," never a collection.
  - `spreadsheetConfig` is the one exception to the plural/singular split: there's only one spreadsheet, so it's a single record with no separate `spreadsheetConfigs` collection.
  - A small subset of config data — sheet names/headers, indexes, and possibly `columnId`s for the Sheet Config and Column Config sheets themselves — is hardcoded rather than generated, to bootstrap the generation process before any config data exists for those two sheets (see `baseSheetConfigs.ts`). Treat that seed subset as a guaranteed hardcoded floor, not as data to "fix" by trying to regenerate it away.
- **Schema** — type/validation logic layered on top of Config data (e.g. `ValueSchema`, `*SchemaNamed`, `*SchemaIndexed`).

If you're renaming or relocating something and unsure which word applies, ask rather than guess — these distinctions were deliberately hashed out and folder placement depends on them.

## Generated data — do not hand-edit

`src/01_generatedConfigs/` holds four config constants, each split across two files: an `xConfigs.ts` file with the literal data plus a `makeXConfigs` validating constructor, and a sibling `xConfigsTypes.ts` file with the derived types and accessor functions built on top of it (`spreadsheetConfig`/`spreadsheetConfigTypes`, `sheetConfigs`/`sheetConfigsTypes`, `columnConfigs`/`columnConfigsTypes`, `valueConfigs`/`valueConfigsTypes`). `sheetConfigs` and `columnConfigs` additionally have a `sheetConfigBuilder.ts`/`columnConfigBuilder.ts` file holding their per-entry record type and constructor (`SheetConfig`/`msc`, `ColumnConfig`/`mcc`) — split out from the main pair specifically to avoid a circular import between the data file (which needs the per-entry constructor to build itself) and the types file (which needs the finished data to derive things like the by-GID lookup map).

All four are (or are meant to be) mechanically generated from the real spreadsheet, not hand-authored:

- **`sheetConfigs`** (`01_generatedConfigs/sheetConfigs.ts`) — generated by `SheetConfigOperator` (`04_SpreadsheetNamed`), reading the real "Sheet Config" sheet by name. Regenerate with `npm run gen:sheet-config` (requires `clasp run` — see the deploy-safety note above).
- **`columnConfigs`** (`01_generatedConfigs/columnConfigs.ts`) — generated by `ColumnConfigOperator` (`04_SpreadsheetNamed`) from the "Column Config" sheet. No longer stores a column's index (`colIndex`) — `03_SpreadsheetIndexed` resolves that live from `columnId` instead, since a stored index would go stale as columns are added/removed/reordered.
- **`valueConfigs`** (`01_generatedConfigs/valueConfigs.ts`) — intended to eventually be generated from a "Value Config"-style sheet, same as the other two. No generator exists yet; it's genuinely hand-authored for now.
- **`spreadsheetConfig`** (`01_generatedConfigs/spreadsheetConfig.ts`) — layout constants (row indexes, ID delimiter, the Config sheets' own GIDs). Also intended to eventually be generated from the spreadsheet; no generator exists yet.

Do not hand-edit (or AI-edit) the literal data inside `sheetConfigs`/`columnConfigs` once they have real generators — always regenerate from the spreadsheet instead. Structural/type changes around them (not the data itself) are fine.

**Exception — the bootstrap subset.** A handful of entries in `sheetConfigs`/`columnConfigs`, covering the Sheet Config and Column Config sheets themselves (sheet names/headers, indexes, and possibly `columnId`s), are intentionally hardcoded rather than generated — see `baseSheetConfigs.ts`. `SheetConfigOperator`/`ColumnConfigOperator` need _some_ way to find those two sheets and their own columns before any config data exists for them — this seed data is that bootstrap, plus placeholders kept around for type safety before a full initialization step fleshes them out. Don't "fix" these entries by trying to regenerate them away; they're meant to stay hand-maintained, the same way `valueConfigs` and `spreadsheetConfig` currently are.

## Validation

There is no automated test suite (`npm run test` is a stub). **`npm run tsc` is the entire verification story right now** — run it before considering any change complete, and treat any new type error as something you introduced unless you've confirmed otherwise (check whether the same error exists on a clean checkout, or ask).

## Known rough edges

- **Most of `src/businessEndpoints/*.ts` is currently commented out.** `businessEndpoints.ts` itself is live (it's the endpoint map wired into `Api` via `triggerOnEdit`), but the domain classes it will eventually call — `ChargeMgmt`, `ExpenseMgmt`, `LeaseMgmt`, `LedgerMgmt`, `PaymentMgmt`, `SubsidyMgmt` — predate the 00–05 reorganization and are kept fully commented out as reference for reimplementing on the current architecture, one file at a time.
- **`src/02_SpreadsheetRaw/toIntegrate.ts`** is a deliberate holding pen for pre-TypeScript legacy code awaiting reimplementation. It's not part of the numbered-tier system by design.
