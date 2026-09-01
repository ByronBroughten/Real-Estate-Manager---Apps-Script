import type { CellValueName } from "../../00_base/base";
import type { RawRowState } from "../ClassTypes/RawState";
import { ColumnRawBase, type ColumnRawProps } from "./ColumnRawBase";
export interface CellRawProps<
  VN extends CellValueName = CellValueName,
> extends ColumnRawProps<VN> {
  rowIndex: number;
  valueName?: VN;
}

export class CellRawBase<
  VN extends CellValueName = CellValueName,
> extends ColumnRawBase<VN> {
  readonly rowIndex: number;
  valueName?: VN;
  constructor({ rowIndex, valueName, ...rest }: CellRawProps<VN>) {
    super(rest);
    this.rowIndex = rowIndex;
    this.valueName = valueName;
  }
  get rowState(): RawRowState {
    return this.getRowState(this.rowIndex);
  }
  get cellRawProps(): CellRawProps<VN> {
    return {
      rowIndex: this.rowIndex,
      ...this.columnRawProps,
    };
  }
}
