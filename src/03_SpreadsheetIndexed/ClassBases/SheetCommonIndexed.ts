import type { SheetName } from "../../01_SpreadsheetSchema/sheetConfigsTypes";
import { SheetSchema } from "../../01_SpreadsheetSchema/SheetSchema";
import { SheetBaseIndexed } from "./SheetBaseIndexed";

export abstract class SheetCommonIndexed extends SheetBaseIndexed {
  get schema(): SheetSchema {
    return SheetSchema.fromSheetGid(this.sheetGid);
  }
  get sheetName(): SheetName {
    return this.schema.sheetName;
  }
}
