# The sheet and column class chains

Map fragment. Sibling headings live in this folder.


Every tier's sheet and column classes have the same three-level shape: a base class, an abstract common class, and the two concrete Meta/primary classes under it.

```
ColumnNamedBase<SN, CN>          // the base: columnName, schema, columnNamedProps
  └─ ColumnCommonNamed<SN, CN>   // abstract; adds columnId
       ├─ ColumnNamed<SN, CN>
       └─ ColumnMetaNamed<SN, CN>
```

**Columns are the one chain whose base does not sit in `ClassBases/`** — `ColumnNamedBase` sits directly in the tier folder and *is* the base. There is no base class for the primary column alone: a class that wants to sit beside `ColumnNamed` rather than under it extends `ColumnNamedBase` and reaches the column through a getter — which is what `GenericSheetOperator` does one level up (`extends SheetNamedBase`), and what the column-scoped endpoint classes in `06_API` already do.

**Rows and cells have base classes too, and an operator may hang off either.** The Named tier's `ClassBases/` holds four: `SpreadsheetNamedBase`, `SheetNamedBase` (adds `sheetName`), `RowNamedBase` (adds `rowIndex`) and `CellNamedBase`. The chains above show sheets and columns because those two needed explaining, not because they are the set an operator may extend. See [`STYLE.md`](../../STYLE.md) for choosing between them.

The Raw tier needs **two** sheet-level classes above its concrete pair, and both earn their place:

```
SheetRawBase                     // sheetGid, sheet state, activeTable, schema
  ├─ SheetCommonRaw              // abstract; ss, fetch-range gatherers, sheet change queue, fullTableColIndexes
  │    ├─ SheetRaw
  │    └─ SheetMetaRaw
  ├─ RowRawBase
  └─ ColumnRawBase
```

`SheetRawBase` cannot hold `SheetCommonRaw`'s members, because the row and column base classes hang off it: `RowCommonRaw` already declares a `changesToSave` of an incompatible type and `CellRaw` a `gatherFetchRange` of a different signature, so either would be an illegal override, and the rest would be inherited by classes with no use for them. Don't fold `SheetCommonRaw` back into `SheetRawBase`. `ss` is declared `abstract` on `SheetCommonRaw` and implemented on each concrete class — importing `SpreadsheetRaw` as a value there would close a module-init cycle through the two subclasses' `extends` clauses, which is the crash class described under [The schema classes](./schema-classes.md).

**The widened instantiation must never collapse to `never` — and today it doesn't.** The hazard is real but guarded: indexing a union of sheets by a union of column names naively requires the column name to key *every* sheet, which would yield `never`, so `ColumnValueName` (in `columnConfigsTypes.ts`) is deliberately written to distribute over the sheet name instead. That is why it looks the way it does; it is not a description of a current defect. Type assertions in `SpreadsheetSchema.test.ts` pin both ends — exact literal on the named path, full union and specifically not `never` on the widened one — and fail `npm run tsc` if either degrades. `tsc` passing is not by itself evidence that precision survived, which is why those assertions are not optional. Neither is an assignment — see [`STYLE.md`](../../STYLE.md)'s "Verify a type-level claim with an identity check."
