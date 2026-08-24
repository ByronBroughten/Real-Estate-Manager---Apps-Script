import type { CellValueName } from "../00_base/base";
import type { Value } from "../01_generatedConfigs/valueSchemas";
import { Arr } from "../utils/Arr";
import { DataColumnRaw } from "./ClassBases/DataColumnRaw";
import { DataRowRaw } from "./ClassBases/DataRowRaw";
import { SheetCommonRaw } from "./ClassBases/SheetCommonRaw";
import { SheetRaw } from "./SheetRaw";

export class DataSheetRaw extends SheetCommonRaw {
  get sheet(): SheetRaw {
    return new SheetRaw(this.sheetRawProps);
  }
  get dataRowIndexesActive(): number[] {
    return this.sheet.activeRowIndexes.filter((rowIndex) =>
      this.schema.isDataRowIndex(rowIndex),
    );
  }
  get fullDataRowIndexes(): number[] {
    return Arr.indexesFromUntil(
      this.schema.topDataRowIdx,
      this.activeTable.endRowIndex,
    );
  }
  get dataRowsFull(): DataRowRaw[] {
    return this.fullDataRowIndexes.map((rowIndex) => this.row(rowIndex));
  }
  get dataRowCount(): number {
    return this.sheet.rowCount - this.schema.topDataRowIdx;
  }
  row(rowIndex: number): DataRowRaw {
    return new DataRowRaw({
      rowIndex,
      ...this.sheetRawProps,
    });
  }
  get rows(): DataRowRaw[] {
    return this.dataRowIndexesActive.map((index) => this.row(index));
  }
  get topRow(): DataRowRaw {
    return this.row(this.schema.topDataRowIdx);
  }
  column<VN extends CellValueName = CellValueName>(
    colIndex: number,
    valueName?: VN,
  ): DataColumnRaw<VN> {
    return new DataColumnRaw({
      colIndex,
      valueName,
      ...this.sheetRawProps,
    });
  }
  gatherFetchDataColumnsUsingHeaders<HD extends string>(
    ...headers: HD[]
  ): Record<HD, DataColumnRaw> {
    return headers.reduce(
      (acc, header) => {
        acc[header] = this.sheet.columnByHeader(header).data.gatherFetchAll();
        return acc;
      },
      {} as Record<HD, DataColumnRaw>,
    );
  }
  appendDataRow(): DataRowRaw {
    const idx = this.activeTable.endRowIndex;
    return this.row(idx).append();
  }
  appendDataRowValues(colValues: Map<number, Value>): DataRowRaw {
    const row = this.appendDataRow();
    for (const [colIndex, value] of colValues.entries()) {
      row.updateValue(colIndex, value);
    }
    return row;
  }
  DELETE_ACTIVE_DATA_ROWS(
    startRowIdx: number,
    numRows: number = this.sheet.rowCount - startRowIdx,
  ): DataSheetRaw {
    this.rowStates
      .entries()
      .filter(
        ([rowIndex]) =>
          rowIndex >= startRowIdx && rowIndex < startRowIdx + numRows,
      )
      .forEach(([rowIndex]) => {
        const row = this.row(rowIndex);
        row.delete();
      });
    return this;
  }
  copyAndDeleteLastActiveDataRow() {
    // I'd want to insert rather than append.
    // Can I append at the not last row? Probably not.
    // Is there a way for me to verify that rows or values are fetched?
    const lastRowIdx = this.sheet.lastRowIdx;
    const lastRow = this.row(lastRowIdx);
    const newRow = this.appendDataRow();
    this.sheet.fullTableColIndexes.forEach((colIndex) => {
      const value = lastRow.value(colIndex);
      newRow.updateValue(colIndex, value);
    });
    lastRow.delete();
  }
}
