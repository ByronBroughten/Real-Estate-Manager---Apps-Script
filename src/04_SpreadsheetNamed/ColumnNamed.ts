import type { UniformRowName } from "../00_base/base";
import type {
  ColumnFullName,
  ColumnName,
} from "../01_generatedConfigs/columnConfigsTypes";
import type { SheetName } from "../01_generatedConfigs/sheetConfigsTypes";
import { ColumnCommon } from "./ColumnCommon";
import { DataColumnNamed } from "./DataColumnNamed";

export class ColumnNamed<
  SN extends SheetName,
  CN extends ColumnName<SN> = ColumnName<SN>,
> extends ColumnCommon<SN, CN> {
  get raw() {
    return this.sheet.raw.column(this.indexed.colIndex);
  }
  get indexed() {
    return this.sheet.indexed.column(this.columnId);
  }
  get colIndex() {
    return this.indexed.colIndex;
  }
  get schema() {
    return this.sheet.schema.column(this.columnName);
  }
  get fullName(): ColumnFullName<SN, CN> {
    return this.schema.fullName;
  }
  get data(): DataColumnNamed<SN, CN> {
    return new DataColumnNamed(this.columnNamedProps);
  }
  prepFetchUniformCell(rowName: UniformRowName): ColumnNamed<SN, CN> {
    const rowIndex = this.sheet.schema.uniformRowIndex(rowName);
    this.indexed.data.cell(rowIndex).prepFetch();
    return this;
  }
  actionRowToDefault(): ColumnNamed<SN, CN> {
    this.sheet.indexed.uniformRow("action").updateValue(this.colIndex, false);
    return this;
  }
}
