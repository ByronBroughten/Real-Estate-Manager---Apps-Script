import { SheetRawBase, type SheetRawProps } from "./SheetRawBase";

interface ColumnRawBaseProps extends SheetRawProps {
  colIndex: number;
}

export class ColumnRawBase extends SheetRawBase {
  readonly colIndex: number;
  constructor({ colIndex, ...rest }: ColumnRawBaseProps) {
    super(rest);
    this.colIndex = colIndex;
  }
  get columnRawProps(): ColumnRawBaseProps {
    return {
      colIndex: this.colIndex,
      ...this.sheetRawProps,
    };
  }
}
