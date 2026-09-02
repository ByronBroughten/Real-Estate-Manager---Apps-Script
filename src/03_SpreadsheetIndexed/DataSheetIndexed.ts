import type { CellValue } from "../00_base/base";
import { DataSheetRaw } from "../02_SpreadsheetRaw/DataSheetRaw";
import { DataColumnIndexed } from "./DataColumnIndexed";
import { DataRowIndexed } from "./DataRowIndexed";
import { SheetCommon } from "./SheetCommon";
import { SheetIndexed } from "./SheetIndexed";

export class DataSheetIndexed extends SheetCommon {
  get sheet(): SheetIndexed {
    return new SheetIndexed(this.sheetIndexedProps);
  }
  get raw(): DataSheetRaw {
    return new DataSheetRaw(this.sheetIndexedProps);
  }
  column(columnId: string): DataColumnIndexed {
    return new DataColumnIndexed({
      ...this.sheetIndexedProps,
      columnId,
    });
  }
  get rowIndexesActive(): number[] {
    return this.raw.rowIndexesActive;
  }
  row(rowIndex: number): DataRowIndexed {
    return new DataRowIndexed({
      ...this.sheetIndexedProps,
      rowIndex,
    });
  }
  get rows(): DataRowIndexed[] {
    return this.raw.rows.map((row) => this.row(row.rowIndex));
  }
  get topRow(): DataRowIndexed {
    return this.row(this.schema.topDataRowIdx);
  }
  get rowCount(): number {
    return this.raw.rowCount;
  }
  appendRowDefault(): DataRowIndexed {
    const defaultValues = this.schema.nonFormulaColumnIds.reduce(
      (acc, columnId) => {
        const colIndex = this.column(columnId).colIndex;
        const colSchema = this.schema.columnById(columnId);
        const defaultValue = colSchema.makeDefaultDataValue();
        acc.set(colIndex, defaultValue);
        return acc;
      },
      new Map() as Map<number, CellValue>,
    );
    const { rowIndex } = this.raw.appendDataRowValues(defaultValues);
    return this.row(rowIndex);
  }
}
