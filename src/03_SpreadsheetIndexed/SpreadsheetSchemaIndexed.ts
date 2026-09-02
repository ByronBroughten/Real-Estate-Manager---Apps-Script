import { SpreadsheetSchema } from "../02_SpreadsheetRaw/SpreadsheetSchema";
import { SheetSchemaIndexed } from "./SheetSchemaIndexed";

export class SpreadsheetSchemaIndexed extends SpreadsheetSchema {
  sheet(sheetGid: number): SheetSchemaIndexed {
    return new SheetSchemaIndexed(sheetGid);
  }
  column(sheetGid: number, columnId: string) {
    return this.sheet(sheetGid).column(columnId);
  }
}
