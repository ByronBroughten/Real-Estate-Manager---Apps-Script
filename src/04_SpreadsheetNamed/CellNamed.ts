import type {
  ColumnName,
  ColumnValue,
  ColumnValueName,
} from "../01_generatedConfigs/columnConfigsTypes";
import type { SheetName } from "../01_generatedConfigs/sheetConfigsTypes";
import type {
  Value,
  ValueName,
  VnToCvn,
} from "../01_generatedConfigs/valueSchemas";
import type { CellRaw } from "../02_SpreadsheetRaw/ClassBases/CellRaw";
import type { CellIndexed } from "../03_SpreadsheetIndexed/CellIndexed";
import { CellNamedBase } from "./ClassBases/CellNamedBase";
import { ColumnNamed } from "./ColumnNamed";

export class CellNamed<
  SN extends SheetName,
  CN extends ColumnName<SN> = ColumnName<SN>,
> extends CellNamedBase<SN, CN> {
  get column(): ColumnNamed<SN, CN> {
    return new ColumnNamed(this.columnNamedProps);
  }
  get indexed(): CellIndexed<ColumnValueName<SN, CN>> {
    return this.column.indexed.data.cell(this.rowIndex);
  }
  get raw(): CellRaw<VnToCvn<ColumnValueName<SN, CN>>> {
    return this.indexed.raw;
  }
  get isActive(): boolean {
    return this.indexed.isActive;
  }
  value(): ColumnValue<SN, CN> {
    return this.indexed.value();
  }
  updateValue(value: ColumnValue<SN, CN>): this {
    this.indexed.updateValue(value);
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
