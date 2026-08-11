import type { SheetName } from "../1.0 Configs/2.0 sheetConfigs";
import type { ColumnName } from "../1.0 Configs/3.0 columnConfigs";
import { ColumnNamedBase } from "./ClassBases/ColumnNamedBase";
import { SheetNamed } from "./SheetNamed";

export class ColumnNamed<
  TN extends SheetName,
  CN extends ColumnName<TN>,
> extends ColumnNamedBase<TN, CN> {
  get colIdx(): number {
    return this.sheet.schema.column(this.columnName).colIndex;
  }
  get sheet(): SheetNamed<TN> {
    return new SheetNamed(this.sheetNamedProps);
  }
  get raw() {
    return this.sheet.raw.column(this.colIdx);
  }
  get schema() {
    return this.sheet.schema.column(this.columnName);
  }
}
