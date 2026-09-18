import type { ValueName } from "../../01_SpreadsheetSchema/valueSchemas";
import { SheetMetaRaw } from "../../02_SpreadsheetRaw/SheetMetaRaw";
import { ColumnBaseIndexed } from "./ColumnBaseIndexed";

export abstract class ColumnCommonIndexed<
  VN extends ValueName = ValueName,
> extends ColumnBaseIndexed<VN> {
  get colIndex() {
    return new SheetMetaRaw(this.sheetIndexedProps).colIndexOfActiveColumnId(
      this.columnId,
    );
  }
}
