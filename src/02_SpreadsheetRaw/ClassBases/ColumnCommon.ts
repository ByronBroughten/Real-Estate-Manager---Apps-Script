import type { CellValueName } from "../../00_base/base";
import { SchemaBase } from "../SchemaBase";
import { SheetRaw } from "../SheetRaw";
import { ColumnRawBase } from "./ColumnRawBase";

export abstract class ColumnCommon<
  VN extends CellValueName = CellValueName,
> extends ColumnRawBase<VN> {
  get sheet(): SheetRaw {
    return new SheetRaw(this.sheetRawProps);
  }
  get schema() {
    return new SchemaBase();
  }
}
