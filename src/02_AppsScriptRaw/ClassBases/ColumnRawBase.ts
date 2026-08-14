import type { CellValueName } from "../../1.0 Configs/0.0 ConfigPrecursors";
import { SheetRawBase, type SheetRawProps } from "./SheetRawBase";

interface ColumnRawBaseProps<
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
  constructor({ colIndex, valueName, ...rest }: ColumnRawBaseProps<VN>) {
    super(rest);
    this.colIndex = colIndex;
    this.valueName = valueName;
  }
  get columnRawProps(): ColumnRawBaseProps {
    return {
      colIndex: this.colIndex,
      ...this.sheetRawProps,
    };
  }
}
