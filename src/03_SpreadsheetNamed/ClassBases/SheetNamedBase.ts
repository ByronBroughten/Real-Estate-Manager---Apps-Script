import type { SheetName } from "../../01_configs/02_sheetConfigsTypes";
import {
  SpreadsheetNamedBase,
  type SpreadsheetNamedProps,
} from "./SpreadsheetNamedBase";

export interface SheetNamedProps<
  TN extends SheetName,
> extends SpreadsheetNamedProps {
  sheetName: TN;
}

export class SheetNamedBase<TN extends SheetName> extends SpreadsheetNamedBase {
  readonly sheetName: TN;
  constructor({ sheetName, ...props }: SheetNamedProps<TN>) {
    super(props);
    this.sheetName = sheetName;
  }
  get sheetNamedProps(): SheetNamedProps<TN> {
    return {
      sheetName: this.sheetName,
      ...this.spreadsheetNamedProps,
    };
  }
}
