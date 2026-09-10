import type { GoogleColor } from "../00_base/AppsScriptTypes";
import type { NotEmpty } from "../00_base/base";
import {
  toWireValue,
  type Value,
  type ValueName,
  type VnToCvn,
} from "../01_generatedConfigs/valueSchemas";
import { CellRaw } from "../02_SpreadsheetRaw/CellRaw";
import { CellIndexedBase } from "./CellIndexedBase";
import { ColumnIndexed } from "./ColumnIndexed";

export class CellIndexed<
  VN extends ValueName = ValueName,
> extends CellIndexedBase<VN> {
  get column(): ColumnIndexed<VN> {
    return new ColumnIndexed(this.cellIndexedProps);
  }
  get raw(): CellRaw<VnToCvn<VN>> {
    return new CellRaw<VnToCvn<VN>>({
      ...this.cellIndexedProps,
      rowIndex: this.rowIndex,
      colIndex: this.column.colIndex,
    });
  }
  get isActive(): boolean {
    return this.raw.isActive;
  }
  prepFetch(): this {
    this.preFetchGridRanges.push({ row: this.rowIndex, column: this.columnId });
    return this;
  }
  // Indexed is the lowest tier that knows the value name, so the blank is read here.
  valueOrEmpty(): Value<VN> {
    const value = this.raw.valueOrEmpty();
    const blankReadsAs = this.schema.valTrait("blankReadsAs");
    if (value === "" && blankReadsAs !== null) {
      return blankReadsAs as Value<VN>;
    }
    return value as Value<VN>;
  }
  value(): NotEmpty<Value<VN>> {
    const value = this.valueOrEmpty();
    if (value === "") {
      throw new Error(
        `Value for column "${this.columnId}" in row ${this.rowIndex} is empty.`,
      );
    } else {
      return value as NotEmpty<Value<VN>>;
    }
  }
  updateValue(value: Value<VN>): this {
    this.schema.validateDataNotFormula();
    this.raw.updateValue(toWireValue(value));
    return this;
  }
  updateBackgroundColor(backgroundColor: GoogleColor): this {
    this.raw.updateBackgroundColor(backgroundColor);
    return this;
  }
  updateToDefault(): this {
    if (!this.schema.isFormula) {
      this.updateValue(this.schema.makeDefaultDataValue() as Value<VN>);
    }
    return this;
  }
}
