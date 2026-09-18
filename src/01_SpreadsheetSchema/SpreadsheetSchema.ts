import {
  configSheetGids,
  configSheetNames,
  type SheetName,
} from "./sheetConfigsTypes";
import { SpreadsheetBaseSchema } from "./SpreadsheetBaseSchema";
import { SheetSchema } from "./SheetSchema";

export class SpreadsheetSchema extends SpreadsheetBaseSchema {
  isInSheetGids(sheetGid: number): boolean {
    return configSheetGids.includes(sheetGid);
  }
  get sheetNames() {
    return configSheetNames;
  }
  sheetByName<SN extends SheetName>(sheetName: SN): SheetSchema<SN> {
    return SheetSchema.fromSheetName(sheetName);
  }
  sheetByGid(sheetGid: number): SheetSchema {
    return SheetSchema.fromSheetGid(sheetGid);
  }
}
