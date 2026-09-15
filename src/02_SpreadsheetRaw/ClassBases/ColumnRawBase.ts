import { SheetRawBase, type SheetRawProps } from "./SheetRawBase";

export interface ColumnRawProps extends SheetRawProps {
  colIndex: number;
}

export class ColumnRawBase extends SheetRawBase {
  readonly colIndex: number;
  constructor({ colIndex, ...rest }: ColumnRawProps) {
    super(rest);
    this.colIndex = colIndex;
  }
  get columnRawProps(): ColumnRawProps {
    return {
      colIndex: this.colIndex,
      ...this.sheetRawProps,
    };
  }
}
