import type { CellValue } from "../00_base/base";
import type {
  Value,
  ValueName,
  VnToCvn,
} from "../01_generatedConfigs/valueSchemas";
import { CellRaw } from "../02_SpreadsheetRaw/ClassBases/CellRaw";
import type { CellRawProps } from "../02_SpreadsheetRaw/ClassBases/CellRawBase";
import type { StrictExclude } from "../utils/Arr";
import { CellIndexedBase } from "./CellIndexedBase";
import { ColumnIndexed } from "./ColumnIndexed";

export class CellIndexed<
  VN extends ValueName = ValueName,
> extends CellIndexedBase<VN> {
  get column(): ColumnIndexed<VN> {
    return new ColumnIndexed(this.cellIndexedProps);
  }
  get raw(): CellRaw<VnToCvn<VN>> {
    // TODO: I need to actually convert the valueName to the corresponding CellValueName for the raw cell.
    // This should also be done in ColumnIndexed.
    return new CellRaw({
      ...this.cellIndexedProps,
      rowIndex: this.rowIndex,
      colIndex: this.column.colIndex,
    } as CellRawProps<VnToCvn<VN>>);
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
    this.schema.validateDataNotFormula();
    this.raw.updateValue(value as CellValue<VnToCvn<VN>>);
    return this;
  }
  updateToDefault(): this {
    if (!this.schema.isFormula) {
      const defaultValue = this.schema.makeDefaultDataValue();
      this.updateValue(defaultValue);
    }
    return this;
  }
}
