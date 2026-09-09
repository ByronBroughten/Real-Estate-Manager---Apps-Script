import type { ValueName } from "../01_generatedConfigs/valueSchemas";
import { SheetMetaRaw } from "../02_SpreadsheetRaw/SheetMetaRaw";
import { ColumnIndexedBase } from "./ColumnIndexedBase";

export abstract class ColumnCommonIndexed<
  VN extends ValueName = ValueName,
> extends ColumnIndexedBase<VN> {
  get colIndex() {
    return new SheetMetaRaw(this.sheetIndexedProps).colIdRow.colIndexOfValue(
      this.columnId,
    );
  }
}
