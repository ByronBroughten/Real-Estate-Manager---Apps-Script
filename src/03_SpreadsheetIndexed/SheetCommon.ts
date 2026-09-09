import type { SheetName } from "../01_generatedConfigs/sheetConfigsTypes";
import { SheetSchema } from "../02_SpreadsheetRaw/SpreadsheetSchema";
import { SheetIndexedBase } from "./SheetIndexedBase";

export abstract class SheetCommon extends SheetIndexedBase {
  get schema(): SheetSchema {
    return SheetSchema.fromSheetGid(this.sheetGid);
  }
  get sheetName(): SheetName {
    return this.schema.sheetName;
  }
}
