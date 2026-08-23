import type { ColumnName } from "../01_generatedConfigs/columnConfigsTypes";
import type { SheetName } from "../01_generatedConfigs/sheetConfigsTypes";
import { ColumnNamedBase } from "./ColumnNamedBase";
import { SheetNamed } from "./SheetNamed";

export abstract class ColumnCommon<
  SN extends SheetName,
  CN extends ColumnName<SN>,
> extends ColumnNamedBase<SN, CN> {
  get columnId(): string {
    return this.sheet.schema.column(this.columnName).columnId;
  }
  get sheet(): SheetNamed<SN> {
    return new SheetNamed(this.sheetNamedProps);
  }
}
