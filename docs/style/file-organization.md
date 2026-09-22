# Imports and file organization: examples

Disclosed from [`docs/style.md`](../style.md), "Imports & file organization". The rules are there, one line each; this file holds the examples.

## Import order and `import type`

Imports are sorted by hand because no import-order lint plugin is configured. A module whose value and types are both imported keeps one line with the inline modifier, `import { vsc, type ValueSchemaBase } from "./valueSchema"`, rather than splitting into a value line and a type line.

## No barrel files

`src/index.ts` is the Apps Script entry point, not a re-export barrel. Every other file is imported directly by its path.

## File naming

- A class file mirrors its exported class: `SheetConfigOperator.ts`, `ConfigCoordinator.ts`.
- A static-bundle file takes a short abbreviation: `Str.ts` exports `Str`, and likewise `Obj`, `Arr`, `Dat`, `Tim` and `Val`. A fat bundle's pieces split into a same-named subfolder, as `utils/Obj/merge.ts` does, and are re-assembled in the parent file.
- Plain data, config and entry-point files are camelCase: `columnConfigs.ts`, `businessEndpoints.ts`, `index.ts`.
- A long module's helpers split by subject into a same-named subfolder: `GoogleSheets/GoogleSheetsAPI/cellData.ts` exports `cellDataRequests`.
