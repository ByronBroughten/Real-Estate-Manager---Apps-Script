import type { CellValue } from "../1.0 Configs/0.0 ConfigPrecursors";
import { ColumnRawBase } from "./ClassBases/ColumnRawBase";
import { SheetRaw } from "./SheetRaw";
import { SpreadsheetRaw } from "./SpreadsheetRaw";

export class ColumnRaw extends ColumnRawBase {
  get ss() {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  get sheet() {
    return new SheetRaw(this.sheetRawProps);
  }
  get sheetSchema() {
    return this.sheet.schema;
  }
  get schema() {
    return this.sheetSchema.column(this.colIndex);
  }
  get dataValueArr(): CellValue[] {
    return this.sheet.dataRows.map((row) => row.value(this.colIndex));
  }
  resetDataRows() {
    this.sheet.dataRows.forEach((row) => {
      row.setDataRowToDefault(this.colIndex);
    });
  }
  resetActionRow() {
    this.sheet.actionRow.setValue(this.colIndex, false);
  }
  fillEmptyDataCellsWithDefaultValues() {
    this.sheet.dataRows.forEach((row) => {
      if (row.isEmptyCell(this.colIndex)) {
        row.setDataRowToDefault(this.colIndex);
      }
    });
  }
  get fetchDataRange() {
    return {
      sheetId: this.sheetGid,
      startRowIndex: this.sheetSchema.topDataRowIdx,
      endRowIndex: this.sheet.activeTable.endRowIndex,
      startColumnIndex: this.colIndex,
      endColumnIndex: this.colIndex + 1,
    };
  }
  gatherFetchDataRange() {
    this.ss.gatherFetchRanges(this.fetchDataRange);
    return this;
  }
  fetchData(): ColumnRaw {
    this.ss.fetchSheets(this.fetchDataRange);
    return this;
  }
}
