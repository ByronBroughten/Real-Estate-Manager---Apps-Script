import { SheetIndexedBase, type SheetIndexedProps } from "./SheetIndexedBase";

interface ColumnIndexedBaseProps extends SheetIndexedProps {
  columnId: string;
}

export class ColumnIndexedBase extends SheetIndexedBase {
  readonly columnId: string;
  constructor(props: ColumnIndexedBaseProps) {
    super(props);
    this.columnId = props.columnId;
  }
  get columnIndexedProps(): ColumnIndexedBaseProps {
    return {
      ...this.sheetIndexedProps,
      columnId: this.columnId,
    };
  }
}
