import type { SheetName } from "../../02_generatedTraits/02_sheetTraitsTypes";
import type { SheetDataValues } from "../../02_generatedTraits/03_columnTraits";
import { SheetNamedBase, type SheetNamedProps } from "./SheetNamedBase";

export type RowState<TN extends SheetName> = SheetDataValues<TN>;

export interface RowNamedProps<
  TN extends SheetName,
> extends SheetNamedProps<TN> {
  rowIndex: number;
}

export class RowNamedBase<TN extends SheetName> extends SheetNamedBase<TN> {
  readonly rowIndex: number;
  constructor({ rowIndex, ...props }: RowNamedProps<TN>) {
    super(props);
    this.rowIndex = rowIndex;
  }
  get rowNamedProps(): RowNamedProps<TN> {
    return {
      ...this.sheetNamedProps,
      rowIndex: this.rowIndex,
    };
  }
}
