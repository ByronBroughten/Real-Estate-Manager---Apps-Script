import type { SheetName } from "../02_generatedTraits/02_sheetTraitsTypes";
import type { ColumnName } from "../02_generatedTraits/03_columnTraits";
import { ColumnNamedBase } from "./ClassBases/ColumnNamedBase";
import { SheetNamed } from "./SheetNamed";

export class ColumnNamed<
  TN extends SheetName,
  CN extends ColumnName<TN>,
> extends ColumnNamedBase<TN, CN> {
  get colIndex(): number {
    return this.sheet.schema.column(this.columnName).colIndex;
  }
  get sheet(): SheetNamed<TN> {
    return new SheetNamed(this.sheetNamedProps);
  }
  get raw() {
    return this.sheet.raw.column(this.colIndex);
  }
  get rich() {
    return this.sheet.rich.column(this.colIndex);
  }
  get schema() {
    return this.sheet.schema.column(this.columnName);
  }
  dataCellsToDefault() {
    this.rich.dataCellsToDefault();
  }
  fillEmptyDataCellsWithDefaultValues() {
    this.rich.fillEmptyDataCellsWithDefaultValues();
  }
  actionRowToDefault() {
    this.sheet.rich.uniformRow("action").updateValue(this.colIndex, false);
  }
}
