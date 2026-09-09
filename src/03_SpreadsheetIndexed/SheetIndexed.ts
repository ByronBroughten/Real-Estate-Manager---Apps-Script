import type { Value } from "../01_generatedConfigs/valueSchemas";
import { SheetRaw } from "../02_SpreadsheetRaw/SheetRaw";
import { ColumnIndexed } from "./ColumnIndexed";
import { RowIndexed } from "./RowIndexed";
import { SheetCommon } from "./SheetCommon";
import { SheetMetaIndexed } from "./SheetMetaIndexed";

export class SheetIndexed extends SheetCommon {
  get meta(): SheetMetaIndexed {
    return new SheetMetaIndexed(this.sheetIndexedProps);
  }
  get raw(): SheetRaw {
    return new SheetRaw(this.sheetIndexedProps);
  }
  get rowIndexesActive(): number[] {
    return this.raw.rowIndexesActive;
  }
  get rows(): RowIndexed[] {
    return this.raw.rows.map((row) => this.row(row.rowIndex));
  }
  get topRow(): RowIndexed {
    return this.row(this.schema.topDataRowIdx);
  }
  get rowCount(): number {
    return this.raw.rowCount;
  }
  // The invariant makes a zero row count permanently false, so ask this instead.
  get hasNoData(): boolean {
    if (this.raw.dataRowCountAfterFlush === 0) return true;
    return this._isTopRowTheOnlyRow && this.topRow.isBlank;
  }
  get rowIndexesActiveWithData(): number[] {
    return this._withoutBlankRows(this.rowIndexesActive);
  }
  get rowIndexesFullWithData(): number[] {
    return this._withoutBlankRows(this.raw.rowIndexesFull);
  }
  column(columnId: string): ColumnIndexed {
    return new ColumnIndexed({
      ...this.sheetIndexedProps,
      columnId,
    });
  }
  row(rowIndex: number): RowIndexed {
    return new RowIndexed({
      ...this.sheetIndexedProps,
      rowIndex,
    });
  }
  // The top data row survives, so which row a wipe leaves is predictable.
  DELETE_ALL_DATA_ROWS(): void {
    const [topRowIndex, ...rowIndexesBelow] = this.raw.rowIndexesFull;
    if (topRowIndex === undefined) return;
    rowIndexesBelow.forEach((rowIndex) => this.row(rowIndex).delete());
    this.row(topRowIndex).clearValues();
  }
  appendRowDefault(): RowIndexed {
    const row = this._rowToFillWithDefaults();
    this._defaultDataValues().forEach((value, columnId) => {
      row.updateValue(columnId, value);
    });
    row.reserve();
    return row;
  }
  // A queued delete makes the survivor's index unknowable until the flush.
  private get _isTopRowTheOnlyRow(): boolean {
    return (
      this.raw.dataRowCountAfterFlush === 1 && !this.topRow.isQueuedForDelete
    );
  }
  private _withoutBlankRows(rowIndexes: number[]): number[] {
    return rowIndexes.filter((rowIndex) => !this.row(rowIndex).isBlank);
  }
  // Appending past a blank row would leave it stranded above the data forever.
  private _rowToFillWithDefaults(): RowIndexed {
    if (this._isTopRowReusable()) return this.topRow;
    return this.row(this.raw.appendDataRow().rowIndex);
  }
  private _isTopRowReusable(): boolean {
    if (!this._isTopRowTheOnlyRow) return false;
    if (!this.topRow.isActive) {
      throw new Error(
        `Cannot append to sheetGid ${this.sheetGid}: its one data row was never fetched, so whether the append may reuse it is unknown. Prefetch that row first.`,
      );
    }
    return this.topRow.isReusable;
  }
  private _defaultDataValues(): Map<string, Value> {
    return this.schema.nonFormulaColumnIds.reduce((acc, columnId) => {
      acc.set(
        columnId,
        this.schema.columnById(columnId).makeDefaultDataValue(),
      );
      return acc;
    }, new Map<string, Value>());
  }
}
