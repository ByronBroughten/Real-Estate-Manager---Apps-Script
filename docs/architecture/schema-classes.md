# The schema classes

Map fragment. Sibling headings live in this folder.


`src/02_SpreadsheetRaw/SpreadsheetSchema.ts` holds all three, in one module because they form an import cycle — `extends` is evaluated at module init, so under the bundler a split would risk a "cannot access before initialization" crash in Apps Script that neither `tsc` nor the tests would catch.

The converse is worth knowing, because it looks like the same hazard and isn't: **two sibling classes may import each other as values and instantiate each other in getter bodies.** `SheetRaw`/`SheetMetaRaw` and `ColumnRaw`/`ColumnMetaRaw` already do, in both directions. Only `extends` runs at module init, so a cycle whose imports are used exclusively inside method and getter bodies is safe. Reach for a single shared module — or for an `abstract` member implemented on each subclass, as `SheetCommonRaw` does with `ss` — only when the cycle would close through an `extends` clause.

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

