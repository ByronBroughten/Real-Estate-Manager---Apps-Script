import type { CellValueName } from "../../00_base/base";
import { SchemaBase } from "../BaseSchema";
import { SheetRaw } from "../SheetRaw";
import { SpreadsheetRaw } from "../SpreadsheetRaw";
import { CellRaw } from "./CellRaw";
import { ColumnRawBase } from "./ColumnRawBase";

export abstract class ColumnCommonRaw<
  VN extends CellValueName = CellValueName,
> extends ColumnRawBase<VN> {
  get ss() {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  get sheet(): SheetRaw {
    return new SheetRaw(this.sheetRawProps);
  }
  get schema() {
    return new SchemaBase();
  }
  cell(rowIndex: number): CellRaw<VN> {
    return new CellRaw({
      ...this.columnRawProps,
      rowIndex,
      valueName: this.valueName,
    });
  }
}
