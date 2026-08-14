import { schemaSheetGids } from "../1.0 Configs/sheetConfigsTypes";

import { SchemaBase } from "./SchemaBase";
import { SheetSchemaRaw } from "./SheetSchemaRaw";

export class SpreadsheetSchemaRaw extends SchemaBase {
  get schemaSheetGids(): number[] {
    return schemaSheetGids;
  }
  sheet(sheetGid: number): SheetSchemaRaw {
    return new SheetSchemaRaw(sheetGid);
  }
  sheetNameFromGid(sheetGid: number) {
    this.sheet(sheetGid).trait("sheetName");
  }
  makeSheetIdxId(sheetGid: number, idx: number): string {
    return this.makeId(sheetGid, idx);
  }
}
