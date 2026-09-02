import type { ColumnName } from "../01_generatedConfigs/columnConfigsTypes";
import type { SheetName } from "../01_generatedConfigs/sheetConfigsTypes";
import { ColumnNamedBase } from "./ColumnNamedBase";
import { SheetNamed } from "./SheetNamed";

export abstract class ColumnCommonNamed<
  SN extends SheetName,
  CN extends ColumnName<SN>,
> extends ColumnNamedBase<SN, CN> {
  get columnId(): string {
    return this.schema.columnId;
  }
  get sheet(): SheetNamed<SN> {
    return new SheetNamed(this.sheetNamedProps);
  }
}
