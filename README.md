# Real Estate Manager — Apps Script

A Google Apps Script project (TypeScript, compiled and pushed via `clasp`) for managing real estate operations — properties, units, households, leases, subsidies, charges, and payments — on top of a Google Sheets spreadsheet that acts as the database and the UI.

## Two layers, one codebase

This repo is really two things stacked on top of each other:

- **`src/00_*` through `src/04_*` are a project-agnostic framework** for building typed, structured apps on top of Google Sheets + Apps Script (reading/writing sheets by GID and column index, generating typed schemas from "config" sheets, exposing a name-based API over that data). Nothing in these folders should reference real-estate concepts (properties, leases, tenants, etc.). If you're adding something reusable that any Sheets-backed app would want, it belongs here.
- **`src/05_BusinessClasses/` is this specific project** — it's the only place real-estate domain logic (charges, leases, subsidies, payments, ledgers) should live. Everything in here is built on top of the framework layers below it.

Keep that boundary in mind before adding a file: "would this make sense in a completely different Sheets-backed app?" If yes, it belongs in 00–04, generically named. If no, it belongs in 05.

## How it runs

This is **not** a Node app at runtime. `src/` is TypeScript compiled by `rollup` (via `@rollup/plugin-typescript`) into a single `dist/bundle.js`, which `clasp` pushes to a Google Apps Script project. The code then executes server-side inside Apps Script against the Sheets Advanced Service (`Sheets.Spreadsheets...`), not the `SpreadsheetApp` UI-bound API. Node/DOM APIs are not available at runtime — only in the local build tooling (`rollup`, `tsc`, `scripts/*.mjs`).

Entry points are the top-level functions exported from `src/index.ts` (e.g. `triggerOnEdit`, `generateSheetTraitsFile`). Apps Script calls into these by name — via installed triggers, `clasp run <functionName>`, or (once wired up) spreadsheet menu items.

## ⚠️ Before running deploy or generation commands

**Never run these without asking the user first** — they affect a live Apps Script deployment and/or read the user's real Google Sheet:

- `npm run build` (runs `clasp push`)
- `clasp push`, `clasp run <anything>`, `clasp deploy`
- `npm run gen:sheet-traits` (runs `clasp run` under the hood — see below)

`npm run tsc` (type-checking only) is always safe to run freely.

## Architecture: the numbered tiers

Each top-level folder under `src/` is a dependency tier. **Rule: dependencies only point downward.** A file in tier `N` must never import from a tier numbered higher than `N`. When adding a file, put it in the lowest tier that satisfies what it actually needs — don't reach for a higher tier out of convenience.

| Folder                  | Tier role                                                                                                                                                                                                                                                                             | May import from  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `00_rawPrecursors`      | Zero-dependency primitives: `CellValue`/`CellValueName` types, base (non-config-dependent) value schemas, hand-authored app config (`spreadsheetConfig.ts`), raw Apps Script service wrappers (`AppsScript.ts`), ambient GAS types.                                                   | `utils/` only    |
| `01_SpreadsheetRaw`     | Low-level, **config-independent** wrapper around the Sheets API: read/write cells by sheet GID + row/column index. Includes the bootstrap generator classes (`SheetConfigRaw`, `ColumnConfigRaw`) that read the real "Sheet Config"/"Column Config" sheets to produce tier 02's data. | `00`             |
| `02_generatedTraits`    | Generated data representing the actual structure of the spreadsheet — which sheets exist, their columns, and value-name enums — plus the schema types built from that data. See "Generated data" below.                                                                               | `00`             |
| `03_SpreadsheetIndexed` | Config-**dependent** classes that still address sheets/columns by GID/index rather than by name (`ColumnSchemaIndexed`, `SheetIndexed`, `DataRowIndexed`, etc.).                                                                                                                      | `00`, `01`, `02` |
| `04_SpreadsheetNamed`   | Config-dependent, **name**-based API — the one most application code should use (`SheetNamed`, `ColumnNamed`, `DataRowNamed`, `*SchemaNamed`).                                                                                                                                        | `00`–`03`        |
| `05_BusinessClasses`    | Real-estate domain logic for _this_ project. The only tier allowed to know about properties, leases, tenants, etc.                                                                                                                                                                    | anything         |

`Api.ts` and `src/index.ts` sit outside the numbering as entry points; `utils/` sits outside it as shared, dependency-free helpers used by any tier.

## Naming vocabulary

These words are used precisely and consistently — don't use them loosely:

- **Raw** — depends on nothing generated from the spreadsheet's config sheets. If a class needs `02_generatedTraits` data, it is not "Raw," regardless of what folder it's in.
- **Indexed** — config-dependent, but addresses things by sheet GID / column index (not by name).
- **Named** — config-dependent, addresses things by sheet name / column name.
- **Trait** — a fact _generated from_ the real spreadsheet (e.g. a sheet's GID, a column's value type). Lives in `02_generatedTraits`.
- **Config** — hand-authored, edited directly in code, with no spreadsheet mirror. Only `spreadsheetConfig.ts` and (currently, see below) `valueTraits` qualify.
- **Schema** — type/validation logic layered on top of Trait data (e.g. `ValueSchema`, `*SchemaNamed`, `*SchemaIndexed`).

If you're renaming or relocating something and unsure which word applies, ask rather than guess — these distinctions were deliberately hashed out and folder placement depends on them.

## Generated data — do not hand-edit

Three constants are (or are meant to be) mechanically generated from the real spreadsheet, not hand-authored:

- **`allSheetTraits`** (`02_generatedTraits/02_sheetTraits.ts`) — generated by `SheetConfigRaw.generateSheetTraitsFileSource()`, reading the real "Sheet Config" sheet. Regenerate with `npm run gen:sheet-traits` (requires `clasp run` — see the deploy-safety note above).
- **`allColTraits`** (`02_generatedTraits/03_columnTraits.ts`) — meant to be generated the same way from the "Column Config" sheet via `ColumnConfigRaw`, but that file-generator doesn't exist yet; the data is currently still hand-maintained. Treat it as generated-in-spirit — don't casually restructure it.
- **`valueTraits`** (`02_generatedTraits/04_valueTraits.ts`) — intended to eventually be generated from a "Value Config"-style sheet, same as the other two. No generator exists yet; it's genuinely hand-authored for now.

Do not hand-edit (or AI-edit) the literal data inside `allSheetTraits`/`allColTraits` once they have real generators — always regenerate from the spreadsheet instead. Structural/type changes around them (not the data itself) are fine.

## Validation

There is no automated test suite (`npm run test` is a stub). **`npm run tsc` is the entire verification story right now** — run it before considering any change complete, and treat any new type error as something you introduced unless you've confirmed otherwise (check whether the same error exists on a clean checkout, or ask).

## Known rough edges

- **`src/05_BusinessClasses/*.ts` are all currently commented out.** They predate the 00–05 reorganization and are kept as reference for reimplementing on the current architecture, one file at a time — don't be surprised to find no live business logic.
- **`src/01_SpreadsheetRaw/toIntegrate.ts`** is a deliberate holding pen for pre-TypeScript legacy code awaiting reimplementation. It's not part of the numbered-tier system by design.
