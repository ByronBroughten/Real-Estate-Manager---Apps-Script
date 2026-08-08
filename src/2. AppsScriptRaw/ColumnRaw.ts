import { ColumnRawBase } from "./ClassBases/ColumnRawBase";
import { SheetRaw } from "./SheetRaw";

export class ColumnRaw extends ColumnRawBase {
  get sheet() {
    return new SheetRaw(this.sheetRawProps);
  }
  get schema() {
    return this.sheet.schema.column(this.columnIdx);
  }
  resetDataRows() {
    this.sheet.dataRows.forEach((row) => {
      row.setDataRowToDefault(this.columnIdx);
    });
  }
  resetActionRow() {
    this.sheet.actionRow.setValue(this.columnIdx, false);
  }
  fillEmptyDataCellsWithDefaultValues() {
    this.sheet.dataRows.forEach((row) => {
      if (row.isEmptyCell(this.columnIdx)) {
        row.setDataRowToDefault(this.columnIdx);
      }
    });
  }
}
