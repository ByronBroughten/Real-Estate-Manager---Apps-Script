import { CellRaw } from "../01_SpreadsheetRaw/ClassBases/CellRaw";
import type { SheetName } from "../02_generatedTraits/02_sheetTraitsTypes";
import type { ColumnName, ColumnValue } from "../02_generatedTraits/03_columnTraits";
import type { Value, ValueName, VnToCvn } from "../02_generatedTraits/06_valueSchemas";
import { CellIndexed } from "../03_SpreadsheetIndexed/CellIndexed";
import { CellNamedBase } from "./ClassBases/CellNamedBase";
import { ColumnNamed } from "./ColumnNamed";
import type { ColumnSchemaNamed } from "./ColumnSchemaNamed";

export class CellNamed<
  SN extends SheetName,
  CN extends ColumnName<SN> = ColumnName<SN>,
> extends CellNamedBase<SN, CN> {
  get column(): ColumnNamed<SN, CN> {
    return new ColumnNamed(this.columnNamedProps);
  }
  get schema(): ColumnSchemaNamed<SN, CN> {
    return this.column.schema;
  }
  get indexed(): CellIndexed {
    return this.column.indexed.dataCell(this.rowIndex);
  }
  get raw(): CellRaw<VnToCvn<ValueName>> {
    return this.indexed.raw;
  }
  get isActive(): boolean {
    return this.raw.isActive;
  }
  value(): ColumnValue<SN, CN> {
    return this.raw.value() as ColumnValue<SN, CN>;
  }
  updateValue(value: ColumnValue<SN, CN>): this {
    this.indexed.updateValue(value as Value<ValueName>);
    return this;
  }
  updateToDefault(): this {
    this.indexed.updateToDefault();
    return this;
  }
  setValueType(valueName: ValueName, value: Value): this {
    if (this.schema.valueName !== valueName) {
      throw new Error(
        `Value name ${valueName} does not match varb value name ${this.schema.valueName}`,
      );
    }
    const validated = this.schema.validate(value);
    this.updateValue(validated as ColumnValue<SN, CN>);
    return this;
  }
}
