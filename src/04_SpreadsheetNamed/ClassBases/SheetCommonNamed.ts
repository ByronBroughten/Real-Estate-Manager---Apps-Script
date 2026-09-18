import type { SheetName } from "../../01_generatedConfigs/sheetConfigsTypes";
import { SheetSchema } from "../../02_SpreadsheetRaw/SpreadsheetSchema";
import { SheetBaseNamed } from "./SheetBaseNamed";

export abstract class SheetCommonNamed<
  SN extends SheetName,
> extends SheetBaseNamed<SN> {
  get schema(): SheetSchema<SN> {
    return SheetSchema.fromSheetName(this.sheetName);
  }
  get sheetGid(): number {
    return this.schema.sheetGid;
  }
}
