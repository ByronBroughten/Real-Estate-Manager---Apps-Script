import type { TableName } from "../../0. spreadsheetMetaData/4.0 tableAttributes";
import type { TableValues } from "../../0. spreadsheetMetaData/5. allColumnAttributes";
import { SheetNamedBase, type SheetNamedProps } from "./SheetNamedBase";

export type RowState<TN extends TableName> = TableValues<TN>;

export interface RowProps<TN extends TableName> extends SheetNamedProps<TN> {
  id: string;
}

export class RowBase<TN extends TableName> extends SheetNamedBase<TN> {
  readonly id: string;
  constructor({ id, ...props }: RowProps<TN>) {
    super(props);
    this.id = id;
  }
  get rowState(): RowState<TN> {
    return this.sheetState.bodyRows[this.id];
  }
  get rowIdxBase1(): number {
    const { topBodyRowIdxBase1 } = this;
    const baseIdx = this.sheetState.bodyRowOrder.indexOf(this.id);
    return baseIdx + topBodyRowIdxBase1;
  }
}
