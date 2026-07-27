import { SheetRawBase } from "./RawHandlerBases/SheetRawBase";
import { RowRaw } from "./RowRaw";
import { SpreadsheetRaw } from "./SpreadsheetRaw";

export class SheetRaw extends SheetRawBase {
  get spreadsheet(): SpreadsheetRaw {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  get gs(): GoogleAppsScript.Spreadsheet.Sheet {
    return this.gss.getSheetById(this.gid);
  }
  row(idxBase1: number): RowRaw {
    return new RowRaw({
      idxBase1,
      ...this.sheetRawProps,
    });
  }
  appendRow(rowData: unknown[]) {
    this.gs.appendRow(rowData);
  }
  deleteRows(startIdxBase1: number, howMany: number) {
    this.gs.deleteRows(startIdxBase1, howMany);
  }
}
