import { SheetIndexedBase, type SheetIndexedProps } from "./SheetIndexedBase";

export interface RowIndexedProps extends SheetIndexedProps {
  rowIndex: number;
}

export class RowIndexedBase extends SheetIndexedBase {
  readonly rowIndex: number;
  constructor({ rowIndex, ...rest }: RowIndexedProps) {
    super(rest);
    this.rowIndex = rowIndex;
  }
  get rowIndexedProps(): RowIndexedProps {
    return {
      rowIndex: this.rowIndex,
      ...this.sheetIndexedProps,
    };
  }
}
