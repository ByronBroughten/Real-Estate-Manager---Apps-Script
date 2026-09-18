import type { SheetName } from "../../01_generatedConfigs/sheetConfigsTypes";
import { SheetSchema } from "../../02_SpreadsheetRaw/SpreadsheetSchema";
import { SheetNamedBase, type SheetNamedProps } from "./SheetNamedBase";

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
  get schema(): SheetSchema<TN> {
    return SheetSchema.fromSheetName(this.sheetName);
  }
  get rowNamedProps(): RowNamedProps<TN> {
    return {
      ...this.sheetNamedProps,
      rowIndex: this.rowIndex,
    };
  }
}
