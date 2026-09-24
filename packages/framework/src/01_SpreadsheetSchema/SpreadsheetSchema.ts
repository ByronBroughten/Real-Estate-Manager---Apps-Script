import {
  configSheetNames,
  sheetConfigsByGid,
  type SheetName,
} from "./sheetConfigsTypes";
import { SpreadsheetBaseSchema } from "./SpreadsheetBaseSchema";
import { SheetSchema } from "./SheetSchema";

export class SpreadsheetSchema extends SpreadsheetBaseSchema {
  isInSheetGids(sheetGid: number): boolean {
    return sheetConfigsByGid().has(sheetGid);
  }
  get sheetNames() {
    return configSheetNames();
  }
  sheetByName<SN extends SheetName>(sheetName: SN): SheetSchema<SN> {
    return SheetSchema.fromSheetName(sheetName);
  }
  sheetByGid(sheetGid: number): SheetSchema {
    return SheetSchema.fromSheetGid(sheetGid);
  }
}
