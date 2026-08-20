import type { CellValueName } from "../../00_base/base";
import type { ColumnGridRangeProps } from "../ClassTypes/AccessorsRaw";
import { SheetRaw } from "../SheetRaw";
import { ColumnRawBase } from "./ColumnRawBase";

export abstract class ColumnCommon<
  VN extends CellValueName = CellValueName,
> extends ColumnRawBase<VN> {
  get sheet(): SheetRaw {
    return new SheetRaw(this.sheetRawProps);
  }
  gatherFetchRange(props: ColumnGridRangeProps): this {
    this.sheet.gatherFetchRange({
      ...props,
      startColumnIndex: this.colIndex,
      endColumnIndex: this.colIndex + 1,
    });
    return this;
  }
}
