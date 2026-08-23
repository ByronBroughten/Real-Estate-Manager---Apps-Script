import type { CellValue } from "../00_base/base";
import type {
  Value,
  ValueName,
  VnToCvn,
} from "../01_generatedConfigs/valueSchemas";
import { CellRaw } from "../02_SpreadsheetRaw/ClassBases/CellRaw";
import type { StrictExclude } from "../utils/Arr";
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
  prepFetch(): this {
    this.preFetchGridRanges.push({ row: this.rowIndex, column: this.columnId });
    return this;
  }
  value(): Value<VN> {
    return this.raw.value() as Value<VN>;
  }
  valueNotEmpty(): StrictExclude<Value<VN>, ""> {
    const value = this.value();
    if (value === "") {
      throw new Error(
        `Value for column "${this.columnId}" in row ${this.rowIndex} is empty.`,
      );
    } else {
      return value as StrictExclude<Value<VN>, "">;
    }
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
