import type { ValueName } from "../01_generatedConfigs/valueSchemas";
import { SheetRaw } from "../02_SpreadsheetRaw/SheetRaw";
import { ColumnIndexedBase } from "./ColumnIndexedBase";

export abstract class ColumnCommonIndexed<
  VN extends ValueName = ValueName,
> extends ColumnIndexedBase<VN> {
  get colIndex() {
    return new SheetRaw(this.sheetIndexedProps)
      .uniformRow("columnId")
      .colIndexOfValue(this.columnId);
  }
}
