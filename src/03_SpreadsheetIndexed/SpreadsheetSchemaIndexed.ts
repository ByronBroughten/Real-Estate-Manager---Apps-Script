import { configSheetGids } from "../01_generatedConfigs/sheetConfigsTypes";

import { SchemaBase } from "../02_SpreadsheetRaw/SchemaBase";
import { SheetSchemaIndexed } from "./SheetSchemaIndexed";

export class SpreadsheetSchemaIndexed extends SchemaBase {
  get configSheetGids(): number[] {
    return configSheetGids;
  }
  sheet(sheetGid: number): SheetSchemaIndexed {
    return new SheetSchemaIndexed(sheetGid);
  }
  column(sheetGid: number, columnId: string) {
    return this.sheet(sheetGid).column(columnId);
  }
  sheetNameFromGid(sheetGid: number) {
    this.sheet(sheetGid).trait("sheetName");
  }
  makeSheetIdxId(sheetGid: number, idx: number): string {
    return this.makeId(sheetGid, idx);
  }
}
