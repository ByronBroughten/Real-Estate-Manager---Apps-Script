import { allSheetGids } from "../0. spreadsheetMetaData/4.0 tableAttributes";

import { ColumnSchemaRaw } from "./ColumnSchemaRaw";
import { SchemaBase } from "./SchemaBase";
import { SheetSchemaRaw } from "./SheetSchemaRaw";

export class SpreadsheetSchemaRaw extends SchemaBase {
  sheet(sheetGid: number): SheetSchemaRaw {
    return new SheetSchemaRaw(sheetGid);
  }
  column(sheetGid: number, columnIdx: number): ColumnSchemaRaw {
    return new ColumnSchemaRaw(sheetGid, columnIdx);
  }
  get allSheetGids(): number[] {
    return allSheetGids;
  }
}
