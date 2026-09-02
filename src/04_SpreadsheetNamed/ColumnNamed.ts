import type { UniformRowName, UniformRowValueName } from "../00_base/base";
import type {
  ColumnFullName,
  ColumnName,
  ColumnValueName,
  MakeColumnFullName,
} from "../01_generatedConfigs/columnConfigsTypes";
import type { SheetName } from "../01_generatedConfigs/sheetConfigsTypes";
import type { CellIndexed } from "../03_SpreadsheetIndexed/CellIndexed";
import { ColumnIndexed } from "../03_SpreadsheetIndexed/ColumnIndexed";
import { ColumnCommonNamed } from "./ColumnCommonNamed";
import { DataColumnNamed } from "./DataColumnNamed";

export class ColumnNamed<
  SN extends SheetName,
  CN extends ColumnName<SN> = ColumnName<SN>,
> extends ColumnCommonNamed<SN, CN> {
  get raw() {
    return this.sheet.raw.column(this.indexed.colIndex);
  }
  get indexed(): ColumnIndexed<ColumnValueName<SN, CN>> {
    return new ColumnIndexed<ColumnValueName<SN, CN>>({
      ...this.sheet.indexed.sheetIndexedProps,
      columnId: this.columnId,
    });
  }
  get colIndex() {
    return this.indexed.colIndex;
  }
  get fullName(): MakeColumnFullName<SN, CN> & ColumnFullName {
    return this.schema.fullName;
  }
  get data(): DataColumnNamed<SN, CN> {
    return new DataColumnNamed(this.columnNamedProps);
  }
  uniformCell<UN extends UniformRowName>(
    rowName: UN,
  ): CellIndexed<UniformRowValueName<UN>> {
    // intentionally not cell named, because named cells only work for data
    return this.indexed.uniformCell(rowName);
  }
  prepFetchUniformCell<UN extends UniformRowName>(
    rowName: UN,
  ): CellIndexed<UniformRowValueName<UN>> {
    return this.uniformCell(rowName).prepFetch();
  }
  actionRowToDefault(): ColumnNamed<SN, CN> {
    this.uniformCell("action").updateValue(false);
    return this;
  }
}
