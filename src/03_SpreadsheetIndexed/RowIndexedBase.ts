import { SheetIndexedBase, type SheetIndexedProps } from "./SheetIndexedBase";
import { SheetSchemaIndexed } from "./SheetSchemaIndexed";

export interface RowIndexedProps extends SheetIndexedProps {
  rowIndex: number;
}

export class RowIndexedBase extends SheetIndexedBase {
  readonly rowIndex: number;
  constructor({ rowIndex, ...rest }: RowIndexedProps) {
    super(rest);
    this.rowIndex = rowIndex;
  }
  get schema(): SheetSchemaIndexed {
    return new SheetSchemaIndexed(this.sheetGid);
  }
  get rowIndexedProps(): RowIndexedProps {
    return {
      rowIndex: this.rowIndex,
      ...this.sheetIndexedProps,
    };
  }
}
