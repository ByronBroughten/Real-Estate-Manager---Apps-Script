import type { SheetName } from "../01_generatedConfigs/sheetConfigsTypes";
import { SheetSchema } from "../02_SpreadsheetRaw/SpreadsheetSchema";
import { SheetNamedBase } from "./ClassBases/SheetNamedBase";

export abstract class SheetCommon<
  SN extends SheetName,
> extends SheetNamedBase<SN> {
  get schema(): SheetSchema<SN> {
    return SheetSchema.fromSheetName(this.sheetName);
  }
}
