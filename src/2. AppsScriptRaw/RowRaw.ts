import type { ColumnSchemaRaw } from "../1.1 SpreadsheetSchemaRaw/ColumnSchemaRaw";
import { SheetSchemaRaw } from "../1.1 SpreadsheetSchemaRaw/SheetSchemaRaw";
import type { CellValue } from "../utilitiesAppsScript";
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
  columnSchema(colIdx): ColumnSchemaRaw {
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
    const value = this.extractValue(colIdx, colCell);
    this.rowState.set(colIdx, value);
  }
  extractValue(colIdx, colCell: GoogleColCell): CellValue {
    const columnSchema = this.columnSchema(colIdx);
    if (this.idxBase0 < this.sheetSchema.topBodyRowIdx) {
      // This handles column ID and header rows.
      return columnSchema.extractCellString(colCell);
    } else {
      return columnSchema.extractCellValue(colCell);
    }
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
