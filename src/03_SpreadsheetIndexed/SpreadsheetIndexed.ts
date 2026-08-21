import { type ColumnIndexed } from "./ColumnIndexed";
import { SheetIndexed } from "./SheetIndexed";
import { SpreadsheetIndexedBase } from "./SpreadsheetIndexedBase";
import { SpreadsheetSchemaIndexed } from "./SpreadsheetSchemaIndexed";

export class SpreadsheetIndexed extends SpreadsheetIndexedBase {
  get schema(): SpreadsheetSchemaIndexed {
    return new SpreadsheetSchemaIndexed();
  }
  sheet(sheetGid: number) {
    return new SheetIndexed({
      ...this.spreadsheetIndexedProps,
      sheetGid,
    });
  }
  column(sheetGid: number, columnId: string): ColumnIndexed {
    return this.sheet(sheetGid).column(columnId);
  }
}
