import type { SheetName } from "../0. spreadsheetMetaData/4.0 tableAttributes";
import type { ColumnName } from "../0. spreadsheetMetaData/5. allColumnAttributes";
import { ColumnNamedBase } from "./ClassBases/ColumnNamedBase";
import { SheetNamed } from "./SheetNamed";

export class ColumnNamed<
  TN extends SheetName,
  CN extends ColumnName<TN>,
> extends ColumnNamedBase<TN, CN> {
  get colIdx(): number {
    return this.sheet.schema.column(this.columnName).columnIdx;
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
