import type { UniformRowName } from "../00_base/base";
import type { SheetName } from "../02_generatedTraits/02_sheetTraitsTypes";
import type {
  ColumnFullName,
  ColumnName,
} from "../02_generatedTraits/03_columnTraits";

import { ColumnNamedBase } from "./ClassBases/ColumnNamedBase";
import { SheetNamed } from "./SheetNamed";

export class ColumnNamed<
  SN extends SheetName,
  CN extends ColumnName<SN> = ColumnName<SN>,
> extends ColumnNamedBase<SN, CN> {
  get colIndex(): number {
    return this.sheet.schema.column(this.columnName).colIndex;
  }
  get sheet(): SheetNamed<SN> {
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
  get fullName(): ColumnFullName<SN, CN> {
    return this.schema.fullName;
  }
  prepFetchUniformCell(rowName: UniformRowName): ColumnNamed<SN, CN> {
    this.raw.prepFetchUniformCell(rowName);
    return this;
  }
  prepFetchAllDataCells(): ColumnNamed<SN, CN> {
    this.raw.prepFetchAllDataCells();
    return this;
  }
  dataCellsToDefault(): ColumnNamed<SN, CN> {
    this.rich.dataCellsToDefault();
    return this;
  }
  fillEmptyDataCellsWithDefaultValues(): ColumnNamed<SN, CN> {
    this.rich.fillEmptyDataCellsWithDefaultValues();
    return this;
  }
  actionRowToDefault(): ColumnNamed<SN, CN> {
    this.sheet.rich.uniformRow("action").updateValue(this.colIndex, false);
    return this;
  }
}
