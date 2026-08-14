import type { TableValues } from "../../1.0 Configs/3.0 columnConfigs";
import type { SheetName } from "../../1.0 Configs/sheetConfigsTypes";
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
