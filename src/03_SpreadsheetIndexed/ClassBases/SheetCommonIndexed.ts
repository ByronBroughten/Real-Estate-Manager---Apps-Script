import type { SheetName } from "../../01_generatedConfigs/sheetConfigsTypes";
import { SheetSchema } from "../../02_SpreadsheetRaw/Schema/SheetSchema";
import { SheetBaseIndexed } from "./SheetBaseIndexed";

export abstract class SheetCommonIndexed extends SheetBaseIndexed {
  get schema(): SheetSchema {
    return SheetSchema.fromSheetGid(this.sheetGid);
  }
  get sheetName(): SheetName {
    return this.schema.sheetName;
  }
}
