import type { CellValueName } from "../../00_traitPrecursors/configPrecursors";
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
