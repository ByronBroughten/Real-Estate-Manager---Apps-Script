import { schemaSheetGids } from "../02_generatedTraits/02_sheetTraitsTypes";

import { SchemaBase } from "./SchemaBase";
import { SheetSchemaIndexed } from "./SheetSchemaIndexed";

export class SpreadsheetSchemaIndexed extends SchemaBase {
  get schemaSheetGids(): number[] {
    return schemaSheetGids;
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
