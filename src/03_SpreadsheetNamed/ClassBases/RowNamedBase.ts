import type { SheetName } from "../../01_configs/02_sheetConfigsTypes";
import type { TableValues } from "../../01_configs/03_columnConfigs";
import { SheetNamedBase, type SheetNamedProps } from "./SheetNamedBase";

export type RowState<TN extends SheetName> = TableValues<TN>;

export interface RowProps<TN extends SheetName> extends SheetNamedProps<TN> {
  rowIndex: number;
}

export class RowNamedBase<TN extends SheetName> extends SheetNamedBase<TN> {
  readonly rowIndex: number;
  constructor({ rowIndex, ...props }: RowProps<TN>) {
    super(props);
    this.rowIndex = rowIndex;
  }
}
