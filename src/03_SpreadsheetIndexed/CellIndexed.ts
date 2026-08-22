import type { CellValue } from "../00_base/base";
import { CellRaw } from "../01_SpreadsheetRaw/ClassBases/CellRaw";
import type {
  Value,
  ValueName,
  VnToCvn,
} from "../02_generatedTraits/06_valueSchemas";
import { CellIndexedBase } from "./CellIndexedBase";
import { ColumnIndexed } from "./ColumnIndexed";
import { ColumnSchemaIndexed } from "./ColumnSchemaIndexed";

export class CellIndexed<
  VN extends ValueName = ValueName,
> extends CellIndexedBase<VN> {
  get columnSchema(): ColumnSchemaIndexed<VN> {
    return new ColumnSchemaIndexed({
      sheetGid: this.sheetGid,
      columnId: this.columnId,
    });
  }
  get column(): ColumnIndexed<VN> {
    return new ColumnIndexed(this.cellIndexedProps);
  }
  get raw(): CellRaw<VnToCvn<VN>> {
    return this.column.raw.cell(this.rowIndex);
  }
  get isActive(): boolean {
    return this.raw.isActive;
  }
  value(): Value<VN> {
    return this.raw.value() as Value<VN>;
  }
  updateValue(value: Value<VN>): this {
    this.columnSchema.validateDataNotFormula();
    this.raw.updateValue(value as CellValue<VnToCvn<VN>>);
    return this;
  }
  updateToDefault(): this {
    if (!this.columnSchema.isFormula) {
      const defaultValue = this.columnSchema.makeDefaultDataValue();
      this.updateValue(defaultValue);
    }
    return this;
  }
}
