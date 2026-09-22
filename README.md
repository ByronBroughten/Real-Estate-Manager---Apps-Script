# Real Estate Manager — Apps Script

> Coding agents working in this repo: start at [`AGENTS.md`](./AGENTS.md). This README is for people.

A Google Apps Script project (TypeScript, compiled and pushed via `clasp`) for managing real estate operations — properties, units, households, leases, subsidies, charges, and payments — on top of a Google Sheets spreadsheet that acts as the database and the UI.

## Two layers, one codebase

This repo is really two things stacked on top of each other:

- **`src/00_*` through `src/06_API/` are a project-agnostic framework** for building typed, structured apps on top of Google Sheets + Apps Script. The Raw tier talks to a host-neutral `RawSource` in terms of raw row/column indexes and sheet properties (`GoogleSheetsAPI` is the Google implementer); the Identified and Named tiers resolve the typed schema on top of that by generated ID and by name. A dedicated Operators tier (`05_Operators`) sits above Named and owns generating/updating `01_SpreadsheetSchema/generated/` from the live Spreadsheet Config/Sheet Config/Column Config/Value Config sheets — maintaining generated data is neither Raw's nor Named's job. `06_API` sits on top as a generic endpoint-dispatch layer (`Api`, `EndpointRun`) that routes sheet-edit events to registered endpoints by column name. Nothing in these folders should reference real-estate concepts (properties, leases, tenants, etc.). If you're adding something reusable that any Sheets-backed app would want, it belongs here.
- **`src/businessEndpoints.ts` and `src/businessEndpoints/` are this specific project** — together the only place real-estate domain logic (charges, leases, subsidies, payments, ledgers) should live: `businessEndpoints.ts` holds the `endpoints` record passed into `06_API`'s `Api` class, and `businessEndpoints/` holds one file per endpoint, with `businessEndpoints/BusinessOperators/` for any classes they need. Everything here is built on top of the framework layers below it.

Keep that boundary in mind before adding a file: "would this make sense in a completely different Sheets-backed app?" If yes, it belongs in 00–06, generically named. If no, it belongs in `businessEndpoints/` — or, if it is a one-off maintenance job rather than something an operator triggers from the sheet, in `src/chores/` (see [Chores](./docs/architecture/chores.md)). `src/nodeHost/` is a third thing again: not a layer of the app but the adapter that lets the framework run somewhere other than Apps Script (see [How it runs](./docs/how-it-runs.md)).

## Architecture: the numbered tiers

Each numbered folder under `src/` is a dependency tier, and dependencies only point downward (lint enforces it):

| Folder | What it does |
| --- | --- |
| `00_Source` | The host-neutral `RawSource` port, cell values, and the Google Sheets adapter behind the port |
| `01_SpreadsheetSchema` | The configs generated from the live spreadsheet, and the types and schema classes that read them |
| `02_SpreadsheetRaw` | Positional reads and writes, by sheet ID and row and column index |
| `03_SpreadsheetIdentified` | Sheets and columns addressed by generated ID |
| `04_SpreadsheetNamed` | Sheets and columns addressed by name: the API most code uses |
| `05_Operators` | Classes that add methods for one data structure, including regenerating the configs |
| `06_API` | Routing a sheet edit to the endpoint registered for its column |

`src/businessEndpoints/` sits above all of them as the real-estate logic. `src/chores/` holds one-off maintenance jobs, and `src/nodeHost/` lets the framework run in Node as well as Apps Script. The precise words for all of this (Raw, Identified, Named, Meta and primary) are defined in [`VOCABULARY.md`](./VOCABULARY.md).

## Generated data — do not hand-edit

Reading the generated files by block, regeneration, the config-sheet floor, and how `valueName` is declared vs sampled: [`docs/generated-data.md`](./docs/generated-data.md).

## Testing

Vitest, always safe: `npm test`. Co-located `Foo.test.ts`. Fakes, exemplars, and endpoint-run testing: [`docs/testing.md`](./docs/testing.md).

## Known rough edges

- **The properties probe is blind to a Table that moved down or right.** On the trigger path, a sheet's table metadata arrives only because `SheetRaw.gatherFetchProperties` requests the single cell at the Table header row and start column, and the Sheets API returns a sheet's `tables` only for a filter whose range overlaps the table. That probe, and the column-id row that shares its round trip, aim at the layout constant; later row fetches use the live Table start once `tables.range` is in state. A table that moved down or right still returns no metadata and looks identical to a table that was never created. That is why `SpreadsheetRaw`'s placement reporter pays for one full sheet-properties read before throwing, to tell "no Table here" from "Table somewhere else" — only on a path that is already aborting (#9).
