import { RowRawBase } from "./ClassBases/RowRawBase";
import { SheetRaw } from "./SheetRaw";

export class RowRaw extends RowRawBase {
  get sheet() {
    return new SheetRaw(this.sheetRawProps);
  }
  get deleteRequest(): GoogleAppsScript.Sheets.Schema.Request {
    return {
      deleteDimension: {
        range: {
          sheetId: this.sheet.gid,
          dimension: "ROWS",
          startIndex: this.idxBase0,
          endIndex: this.idxBase0 + 1,
        },
      },
    };
  }
}
