import { SheetRawBase, type SheetRawProps } from "./SheetRawBase";

interface ColumnRawBaseProps extends SheetRawProps {
  columnIdx: number;
}

export class ColumnRawBase extends SheetRawBase {
  readonly columnIdx: number;
  constructor({ columnIdx, ...rest }: ColumnRawBaseProps) {
    super(rest);
    this.columnIdx = columnIdx;
  }
  get columnRawProps(): ColumnRawBaseProps {
    return {
      columnIdx: this.columnIdx,
      ...this.sheetRawProps,
    };
  }
}
