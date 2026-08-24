import type { SheetName } from "../01_generatedConfigs/sheetConfigsTypes";
import { SheetNamedBase } from "./ClassBases/SheetNamedBase";
import type { SheetSchemaNamed } from "./SheetSchemaNamed";

export abstract class SheetCommon<
  SN extends SheetName,
> extends SheetNamedBase<SN> {
  get schema(): SheetSchemaNamed<SN> {
    return this.ssSchema.sheet(this.sheetName);
  }
}
