import { SheetRawBase } from "./ClassBases/SheetRawBase";
import { RowRaw } from "./RowRaw";
import { SpreadsheetRaw } from "./SpreadsheetRaw";
import type { DataFilter, GridRange } from "./Types/AppsScriptTypes";

export class SheetRaw extends SheetRawBase {
  get spreadsheet(): SpreadsheetRaw {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  get gs(): GoogleAppsScript.Spreadsheet.Sheet {
    return this.gss.getSheetById(this.gid);
  }
  get emptyGridRange(): GridRange {
    return { sheetId: this.gid, startRowIndex: 0, endRowIndex: 0 };
  }
  row(idxBase0: number): RowRaw {
    return new RowRaw({
      idxBase0,
      ...this.sheetRawProps,
    });
  }
  getRequest(startIdxBase0: number, howMany: number): DataFilter {
    return {
      gridRange: {
        sheetId: this.gid,
        startRowIndex: startIdxBase0,
        endRowIndex: startIdxBase0 + howMany,
      },
    };
  }
  getDataRequest(howMany: number): DataFilter {
    return this.getRequest(this.configGet("topBodyRowIdxBase0"), howMany);
  }
  appendRow(rowData: unknown[]) {
    this.gs.appendRow(rowData);
  }
  deleteRows(startIdxBase1: number, howMany: number) {
    this.gs.deleteRows(startIdxBase1, howMany);
  }
}
