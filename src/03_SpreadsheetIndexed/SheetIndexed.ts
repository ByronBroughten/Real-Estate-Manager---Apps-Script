import type { CellValue } from "../00_base/base";
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
  appendRowDefault(): RowIndexed {
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
