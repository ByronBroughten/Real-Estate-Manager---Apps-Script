import type { CellValue, CellValueName } from "../00_base/base";
import { Arr } from "../utils/Arr";
import { CellRaw } from "./CellRaw";
import { ColumnRawBase } from "./ClassBases/ColumnRawBase";
import type { RowCellChange } from "./ClassTypes/RawState";
import { ColumnMetaRaw } from "./ColumnMetaRaw";
import { SheetRaw } from "./SheetRaw";
import { SpreadsheetRaw } from "./SpreadsheetRaw";

export class ColumnRaw<
  VN extends CellValueName = CellValueName,
> extends ColumnRawBase<VN> {
  get ss(): SpreadsheetRaw {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  get sheet(): SheetRaw {
    return new SheetRaw(this.sheetRawProps);
  }
  get meta(): ColumnMetaRaw<VN> {
    return new ColumnMetaRaw<VN>(this.columnRawProps);
  }
  get valueArrOrEmpty(): CellValue<VN>[] {
    return this.sheet.rowIndexesActive.map((rowIndex) =>
      this.valueOrEmpty(rowIndex),
    );
  }
  get valueArrFilterEmpty(): CellValue<VN>[] {
    return this.valueArrOrEmpty.filter((value) => value !== "");
  }
  get topCell(): CellRaw<VN> {
    return this.cell(this.schema.topDataRowIdx);
  }
  get cellIndexesActive(): number[] {
    return this.sheet.rowIndexesActive;
  }
  get cellIndexesFull(): number[] {
    return this.sheet.rowIndexesFull;
  }
  cell(rowIndex: number): CellRaw<VN> {
    return new CellRaw({
      ...this.columnRawProps,
      rowIndex,
      valueName: this.valueName,
    });
  }
  valueOrEmpty(rowIndex: number): CellValue<VN> {
    return this.cell(rowIndex).valueOrEmpty();
  }
  updateValue(rowIndex: number, newValue: CellValue<VN>): this {
    this.cell(rowIndex).updateValue(newValue);
    return this;
  }
  // State is still mirrored row by row; only the queued request collapses.
  updateAllCells(change: RowCellChange<VN>): this {
    this.validateIndexNotStale();
    this.sheet.validateNotPrunedToSelection();
    const { endRowIndex } = this.activeTable;
    const { value } = change;
    this.sheet.rowIndexesFull.forEach((rowIndex) => {
      const row = this.sheet.row(rowIndex);
      row.validateIsWritable();
      if (value !== undefined && row.rowIsActive()) {
        this.cell(rowIndex).setValueState(value);
      }
    });
    this.sheet.addSheetChangeToSave({
      action: "fill",
      colIndex: this.colIndex,
      startRowIndex: this.schema.topDataRowIdx,
      endRowIndex,
      ...change,
    });
    return this;
  }
  updateActiveCells(change: RowCellChange<VN>): this {
    this.validateIndexNotStale();
    const rowIndexes = this.cellIndexesActive;
    const { value } = change;
    if (value !== undefined) {
      rowIndexes.forEach((rowIndex) => {
        this.cell(rowIndex).setValueState(value);
      });
    }
    Arr.contiguousRanges(rowIndexes).forEach(({ startIndex, endIndex }) => {
      this.sheet.addSheetChangeToSave({
        action: "fill",
        colIndex: this.colIndex,
        startRowIndex: startIndex,
        endRowIndex: endIndex,
        ...change,
      });
    });
    return this;
  }
  gatherFetchActive(): this {
    this.cellIndexesActive.forEach((rowIndex) => {
      this.cell(rowIndex).gatherFetchRange();
    });
    return this;
  }
  gatherFetchFull(): this {
    this.sheet.gatherFetchRange({
      startRowIndex: this.schema.topDataRowIdx,
      startColumnIndex: this.colIndex,
      endColumnIndex: this.colIndex + 1,
    });
    this.sheetState.colIndexesToFinalize.add(this.colIndex);
    return this;
  }
  // A full-column fetch can hit rows that are entirely blank across every
  // column, which Sheets omits from the response — ensureStateExists
  // backfills those before ensureActive tries to touch a cell in them.
  ensureFullActiveDataCells(): void {
    this.sheet.rowIndexesFull.forEach((rowIndex) => {
      this.sheet.row(rowIndex).ensureStateExists();
      this.cell(rowIndex).ensureActive();
    });
  }
}
