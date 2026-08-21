import type { CellValueName } from "../../00_base/base";
import { SheetRawBase, type SheetRawProps } from "./SheetRawBase";

export interface ColumnRawProps<
  VN extends CellValueName = CellValueName,
> extends SheetRawProps {
  colIndex: number;
  valueName?: VN;
}

export class ColumnRawBase<
  VN extends CellValueName = CellValueName,
> extends SheetRawBase {
  readonly colIndex: number;
  readonly valueName?: VN;
  constructor({ colIndex, valueName, ...rest }: ColumnRawProps<VN>) {
    super(rest);
    this.colIndex = colIndex;
    this.valueName = valueName;
  }
  get columnRawProps(): ColumnRawProps<VN> {
    return {
      colIndex: this.colIndex,
      valueName: this.valueName,
      ...this.sheetRawProps,
    };
  }
}
