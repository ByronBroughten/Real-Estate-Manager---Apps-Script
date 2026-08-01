import { SheetSchemaRaw } from "../1.1 SpreadsheetSchemaRaw/SheetSchemaRaw";
import { RowRawBase } from "./ClassBases/RowRawBase";
import { SheetRaw } from "./SheetRaw";
import type { GoogleColCell } from "./Types/AppsScriptTypes";

export class RowRaw extends RowRawBase {
  get sheet() {
    return new SheetRaw(this.sheetRawProps);
  }
  get sheetSchema() {
    return new SheetSchemaRaw(this.sheetGid);
  }
  columnSchema(colIdx) {
    return this.sheetSchema.column(colIdx);
  }
  ensureStateExists() {
    const rowStates = this.sheetState.rowStates;
    if (!rowStates.has(this.idxBase0)) {
      rowStates.set(this.idxBase0, new Map());
    }
  }
  initState(colIdx: number, colCell: GoogleColCell): void {
    this.ensureStateExists();
    const columnSchema = this.columnSchema(colIdx);
    const value = columnSchema.extractCellValue(colCell);
    this.rowState.set(colIdx, value);
  }
  get deleteRequest(): GoogleAppsScript.Sheets.Schema.Request {
    return {
      deleteDimension: {
        range: {
          sheetId: this.sheetGid,
          dimension: "ROWS",
          startIndex: this.idxBase0,
          endIndex: this.idxBase0 + 1,
        },
      },
    };
  }
}
