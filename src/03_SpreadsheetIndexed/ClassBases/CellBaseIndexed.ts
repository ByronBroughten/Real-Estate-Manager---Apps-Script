import type { ValueName } from "../../01_generatedConfigs/valueSchemas";
import type { ColumnIndexedProps } from "./ColumnBaseIndexed";
import { ColumnBaseIndexed } from "./ColumnBaseIndexed";

export interface CellIndexedProps<
  VN extends ValueName = ValueName,
> extends ColumnIndexedProps<VN> {
  rowIndex: number;
}

export class CellBaseIndexed<
  VN extends ValueName = ValueName,
> extends ColumnBaseIndexed<VN> {
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
