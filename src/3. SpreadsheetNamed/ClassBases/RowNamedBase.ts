import type { SheetName } from "../../0. spreadsheetMetaData/4.0 tableAttributes";
import type { TableValues } from "../../0. spreadsheetMetaData/5. allColumnAttributes";
import { SheetNamedBase, type SheetNamedProps } from "./SheetNamedBase";

export type RowState<TN extends SheetName> = TableValues<TN>;

export interface RowProps<TN extends SheetName> extends SheetNamedProps<TN> {
  id: string;
}

export class RowNamedBase<TN extends SheetName> extends SheetNamedBase<TN> {
  readonly id: string;
  constructor({ id, ...props }: RowProps<TN>) {
    super(props);
    this.id = id;
  }
  get rowState(): RowState<TN> {
    return this.sheetState.bodyRows[this.id];
  }
}
