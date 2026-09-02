import { SheetSchema } from "../02_SpreadsheetRaw/SpreadsheetSchema";
import { SheetIndexedBase } from "./SheetIndexedBase";

export abstract class SheetCommon extends SheetIndexedBase {
  get schema(): SheetSchema {
    return SheetSchema.fromSheetGid(this.sheetGid);
  }
}
