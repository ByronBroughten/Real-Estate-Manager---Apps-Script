import { SheetSchema } from "../../01_SpreadsheetSchema/SheetSchema";
import { SheetBaseIndexed, type SheetIndexedProps } from "./SheetBaseIndexed";

export interface RowIndexedProps extends SheetIndexedProps {
  rowIndex: number;
}

export class RowBaseIndexed extends SheetBaseIndexed {
  readonly rowIndex: number;
  constructor({ rowIndex, ...rest }: RowIndexedProps) {
    super(rest);
    this.rowIndex = rowIndex;
  }
  get schema(): SheetSchema {
    return SheetSchema.fromSheetGid(this.sheetGid);
  }
  get rowIndexedProps(): RowIndexedProps {
    return {
      rowIndex: this.rowIndex,
      ...this.sheetIndexedProps,
    };
  }
}
