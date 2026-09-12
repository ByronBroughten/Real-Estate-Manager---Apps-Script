import type { ColumnName } from "../01_generatedConfigs/columnConfigsTypes";
import { SheetSchema } from "../02_SpreadsheetRaw/SpreadsheetSchema";
import { ColumnIndexed } from "../03_SpreadsheetIndexed/ColumnIndexed";
import { ColumnNamedBase } from "../04_SpreadsheetNamed/ColumnNamedBase";
import type { SheetNamed } from "../04_SpreadsheetNamed/SheetNamed";
import type { SheetNameWithIdColumn } from "../04_SpreadsheetNamed/SheetNameGroups";
import { SpreadsheetNamed } from "../04_SpreadsheetNamed/SpreadsheetNamed";

// What the name found, not what to do about it: the caller owns the wording.
export type RowIdByName =
  | { found: "one"; rowId: string; rowIndex: number }
  | { found: "none" }
  | { found: "many"; rowCount: number };

export class RowIdByNameOperator<
  SN extends SheetNameWithIdColumn,
  CN extends ColumnName<SN>,
> extends ColumnNamedBase<SN, CN> {
  get ss(): SpreadsheetNamed {
    return new SpreadsheetNamed(this.spreadsheetNamedProps);
  }
  get sheet(): SheetNamed<SN> {
    return this.ss.sheet(this.sheetName);
  }
  prepFetch(): this {
    this._nameColumn.prepFetchFull();
    this._idColumn.prepFetchFull();
    return this;
  }
  rowIdByName(name: string): RowIdByName {
    this._validateNameNotBlank(name);
    const rowIndexes = this._rowIndexesNamed(name);
    const rowIndex = rowIndexes[0];
    if (rowIndex === undefined) return { found: "none" };
    if (rowIndexes.length > 1) {
      return { found: "many", rowCount: rowIndexes.length };
    }
    return { found: "one", rowId: this._rowId(rowIndex), rowIndex };
  }
  // A blank name would match every unnamed row, which is never what a caller meant.
  private _validateNameNotBlank(name: string): void {
    if (name !== "") return;
    throw new Error(
      `Cannot look up a blank name in column "${this.columnName}" of "${this.sheetName}".`,
    );
  }
  private _rowIndexesNamed(name: string): number[] {
    const column = this._nameColumn;
    return column.cellIndexesActive.filter(
      (rowIndex) => column.valueOrEmpty(rowIndex) === name,
    );
  }
  // A row id is bookkeeping nobody types, and the row is already in hand.
  private _rowId(rowIndex: number): string {
    const cell = this._idColumn.cell(rowIndex);
    if (cell.raw.isEmpty) {
      cell.updateToDefault();
    }
    return cell.valueNotEmpty();
  }
  // By column id, so the name column's own value type isn't composed into the read.
  private get _nameColumn(): ColumnIndexed {
    return this.sheet.columnIndexed(this.columnName);
  }
  // The id column is the framework's own, so it is named at the widened sheet type.
  private get _idColumn(): ColumnIndexed<"id"> {
    return new ColumnIndexed<"id">({
      ...this.sheet.indexed.sheetIndexedProps,
      columnId: SheetSchema.fromSheetName<SheetNameWithIdColumn>(this.sheetName)
        .columnByName("id").columnId,
    });
  }
}
