import { SchemaBase } from "../02_SpreadsheetRaw/BaseSchema";
import { SheetSchemaIndexed } from "./SheetSchemaIndexed";

export class SpreadsheetSchemaIndexed extends SchemaBase {
  sheet(sheetGid: number): SheetSchemaIndexed {
    return new SheetSchemaIndexed(sheetGid);
  }
  column(sheetGid: number, columnId: string) {
    return this.sheet(sheetGid).column(columnId);
  }
}
