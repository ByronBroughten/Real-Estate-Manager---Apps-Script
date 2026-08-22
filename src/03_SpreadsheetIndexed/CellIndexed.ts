import type { CellValueName } from "../00_base/base";
import type { ColumnIndexedProps } from "./ColumnIndexedBase";
import { ColumnIndexedBase } from "./ColumnIndexedBase";

export interface CellIndexedProps<
  VN extends CellValueName = CellValueName,
> extends ColumnIndexedProps<VN> {
  rowIndex: number;
}

export class CellIndexedBase<
  VN extends CellValueName = CellValueName,
> extends ColumnIndexedBase<VN> {
  readonly rowIndex: number;
  constructor({ rowIndex, ...props }: CellIndexedProps<VN>) {
    super(props);
    this.rowIndex = rowIndex;
  }
}
