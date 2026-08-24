import type { CellValue } from "../00_base/base";
import { SheetRaw } from "../02_SpreadsheetRaw/SheetRaw";
import { Arr } from "../utils/Arr";
import { DataColumnIndexed } from "./DataColumnIndexed";
import { DataRowIndexed } from "./DataRowIndexed";
import { SheetCommon } from "./SheetCommon";
import { SheetIndexed } from "./SheetIndexed";

export class DataSheetIndexed extends SheetCommon {
  get sheet(): SheetIndexed {
    return new SheetIndexed(this.sheetIndexedProps);
  }
  get raw(): SheetRaw {
    return new SheetRaw(this.sheetIndexedProps);
  }
  column(columnId: string): DataColumnIndexed {
    return new DataColumnIndexed({
      ...this.sheetIndexedProps,
      columnId,
    });
  }
  get dataRowIndexesActive(): number[] {
    return this.raw.dataRowIndexesActive;
  }
  row(rowIndex: number): DataRowIndexed {
    return new DataRowIndexed({
      ...this.sheetIndexedProps,
      rowIndex,
    });
  }
  get rows(): DataRowIndexed[] {
    return this.raw.dataRows.map((row) => this.row(row.rowIndex));
  }
  get topRow(): DataRowIndexed {
    return this.row(this.schema.topDataRowIdx);
  }
  get dataRowCount(): number {
    return this.raw.dataRowCount;
  }
  get fullDataRowIndexes(): number[] {
    return Arr.indexesFromUntil(
      this.ssSchema.topDataRowIdx,
      this.raw.activeTable.endRowIndex,
    );
  }
  appendRowDefault(): DataRowIndexed {
    const defaultValues = this.schema.nonFormulaColumnIds.reduce(
      (acc, columnId) => {
        const colIndex = this.column(columnId).colIndex;
        const colSchema = this.schema.column(columnId);
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
