import type { ValueName } from "../01_generatedConfigs/valueSchemas";
import { ColumnIndexedBase } from "./ColumnIndexedBase";
import { SheetIndexed } from "./SheetIndexed";

export abstract class ColumnCommonIndexed<
  VN extends ValueName = ValueName,
> extends ColumnIndexedBase<VN> {
  get sheet(): SheetIndexed {
    return new SheetIndexed(this.sheetIndexedProps);
  }
  get colIndex() {
    return this.sheet.raw.uniformRow("columnId").colIndexOfValue(this.columnId);
  }
}
