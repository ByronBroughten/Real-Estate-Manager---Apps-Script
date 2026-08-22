import type { CellValueName } from "../00_base/base";
import { SheetIndexedBase, type SheetIndexedProps } from "./SheetIndexedBase";

export interface ColumnIndexedProps<
  VN extends CellValueName = CellValueName,
> extends SheetIndexedProps {
  columnId: string;
  valueName?: VN;
}

export class ColumnIndexedBase<
  VN extends CellValueName = CellValueName,
> extends SheetIndexedBase {
  readonly columnId: string;
  readonly valueName?: VN;
  constructor({ columnId, valueName, ...props }: ColumnIndexedProps<VN>) {
    super(props);
    this.columnId = columnId;
    this.valueName = valueName;
  }
  get columnIndexedProps(): ColumnIndexedProps<VN> {
    return {
      ...this.sheetIndexedProps,
      columnId: this.columnId,
      valueName: this.valueName,
    };
  }
}
