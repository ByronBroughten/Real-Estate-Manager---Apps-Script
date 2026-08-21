import { ColumnRawBase, type ColumnRawProps } from "./ColumnRawBase";

interface CellRawProps extends ColumnRawProps {
  rowIndex: number;
}

export class CellRawBase extends ColumnRawBase {
  readonly rowIndex: number;
  constructor({ rowIndex, ...rest }: CellRawProps) {
    super(rest);
    this.rowIndex = rowIndex;
  }
  get cellRawProps(): CellRawProps {
    return {
      rowIndex: this.rowIndex,
      ...this.columnRawProps,
    };
  }
}
