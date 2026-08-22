import type { ValueName } from "../02_generatedTraits/06_valueSchemas";
import type { ColumnIndexedProps } from "./ColumnIndexedBase";
import { ColumnIndexedBase } from "./ColumnIndexedBase";

export interface CellIndexedProps<
  VN extends ValueName = ValueName,
> extends ColumnIndexedProps<VN> {
  rowIndex: number;
}

export class CellIndexedBase<
  VN extends ValueName = ValueName,
> extends ColumnIndexedBase<VN> {
  readonly rowIndex: number;
  constructor({ rowIndex, ...props }: CellIndexedProps<VN>) {
    super(props);
    this.rowIndex = rowIndex;
  }
  get cellIndexedProps(): CellIndexedProps<VN> {
    return {
      rowIndex: this.rowIndex,
      ...this.columnIndexedProps,
    };
  }
}
