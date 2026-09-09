import type { UniformRowName, UniformRowValueName } from "../00_base/base";
import type {
  ColumnFullName,
  ColumnName,
  ColumnValueName,
  MakeColumnFullName,
} from "../01_generatedConfigs/columnConfigsTypes";
import type { SheetName } from "../01_generatedConfigs/sheetConfigsTypes";
import type { CellIndexed } from "../03_SpreadsheetIndexed/CellIndexed";
import { ColumnMetaIndexed } from "../03_SpreadsheetIndexed/ColumnMetaIndexed";
import { ColumnCommonNamed } from "./ColumnCommonNamed";
import { ColumnNamed } from "./ColumnNamed";
import { SheetMetaNamed } from "./SheetMetaNamed";

export class ColumnMetaNamed<
  SN extends SheetName,
  CN extends ColumnName<SN> = ColumnName<SN>,
> extends ColumnCommonNamed<SN, CN> {
  get sheet(): SheetMetaNamed<SN> {
    return new SheetMetaNamed(this.sheetNamedProps);
  }
  get raw() {
    return this.sheet.raw.column(this.indexed.colIndex);
  }
  get indexed(): ColumnMetaIndexed<ColumnValueName<SN, CN>> {
    return new ColumnMetaIndexed<ColumnValueName<SN, CN>>({
      ...this.sheet.indexed.sheetIndexedProps,
      columnId: this.columnId,
    });
  }
  get primary(): ColumnNamed<SN, CN> {
    return new ColumnNamed(this.columnNamedProps);
  }
  get colIndex() {
    return this.indexed.colIndex;
  }
  get fullName(): MakeColumnFullName<SN, CN> & ColumnFullName {
    return this.schema.fullName;
  }
  uniformCell<UN extends UniformRowName>(
    rowName: UN,
  ): CellIndexed<UniformRowValueName<UN>> {
    // intentionally not cell named, because named cells only work for data...
    return this.indexed.uniformCell(rowName);
  }
  prepFetchUniformCell<UN extends UniformRowName>(
    rowName: UN,
  ): CellIndexed<UniformRowValueName<UN>> {
    return this.uniformCell(rowName).prepFetch();
  }
  actionRowToDefault(): ColumnMetaNamed<SN, CN> {
    this.uniformCell("action").updateValue(false);
    return this;
  }
}
