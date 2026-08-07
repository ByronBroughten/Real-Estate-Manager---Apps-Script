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
      row.resetToDefault(this.columnIdx);
    });
  }
  resetDataAndActionRows() {
    this.resetDataRows();
    this.sheet.actionRow.setValue(this.columnIdx, false);
  }
}
