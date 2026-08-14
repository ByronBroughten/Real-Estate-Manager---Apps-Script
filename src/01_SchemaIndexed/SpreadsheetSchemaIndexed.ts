import { schemaSheetGids } from "../01_configs/02_sheetTraitsTypes";

import { SchemaBase } from "./SchemaBase";
import { SheetSchemaIndexed } from "./SheetSchemaIndexed";

export class SpreadsheetSchemaIndexed extends SchemaBase {
  get schemaSheetGids(): number[] {
    return schemaSheetGids;
  }
  sheet(sheetGid: number): SheetSchemaIndexed {
    return new SheetSchemaIndexed(sheetGid);
  }
  sheetNameFromGid(sheetGid: number) {
    this.sheet(sheetGid).trait("sheetName");
  }
  makeSheetIdxId(sheetGid: number, idx: number): string {
    return this.makeId(sheetGid, idx);
  }
}
