# Comments: reasoning and examples

Disclosed from [`docs/style.md`](../style.md), "Comments". The rules are there, one line each; this file holds the examples and the why.

## Pull a "what" comment into a named method

A block that would need a comment saying _what_ it does becomes a small private method whose name says it. `SheetConfigOperator._updateAll` split into `_deleteStaleSheetConfigs`, `_appendMissingSheetConfigs` and `_updateProgrammaticValues`, and the call site now reads as the list of steps.

## A comment explains a "why not the obvious thing"

A comment sits trailing or immediately above its line and never restates the line. `action: "boolean", // Should perhaps be "boolean" | "string"` is the shape: it tells the reader why the obvious value isn't there.

## File-level navigation blocks

A navigation block is 5–10 lines immediately above the exported class, stating the file's job and where neighbouring work lives, so an agent opens the right sibling instead of the whole tier. Six files have one:

- `src/02_SpreadsheetRaw/SpreadsheetRaw.ts`
- `src/02_SpreadsheetRaw/SheetRaw.ts`
- `src/04_SpreadsheetNamed/SheetNamed.ts`
- `src/05_Operators/ConfigCoordinator.ts`
- `src/05_Operators/ConfigSheetFloor/ConfigSheetFloorEditWarnings.ts`
- `src/06_API/EndpointRun.ts`

Copy one of them for the shape. The set is small on purpose: a new block is the exception, not the pattern, and every other comment stays one line.
