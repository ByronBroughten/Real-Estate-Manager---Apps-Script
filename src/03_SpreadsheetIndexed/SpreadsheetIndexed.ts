import { SpreadsheetRawBase } from "../01_SpreadsheetRaw/ClassBases/SpreadsheetRawBase";
import type { ColumnIndexed } from "./ColumnIndexed";
import { SheetIndexed } from "./SheetIndexed";
import { SpreadsheetSchemaIndexed } from "./SpreadsheetSchemaIndexed";

export class SpreadsheetIndexed extends SpreadsheetRawBase {
  get schema(): SpreadsheetSchemaIndexed {
    return new SpreadsheetSchemaIndexed();
  }
  sheet(sheetGid: number) {
    return new SheetIndexed({
      ...this.spreadsheetRawProps,
      sheetGid,
    });
  }
  column(sheetGid: number, colIndex: number): ColumnIndexed {
    return this.sheet(sheetGid).column(colIndex);
  }
}
