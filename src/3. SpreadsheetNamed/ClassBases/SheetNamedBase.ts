import type { TableName } from "../../0. spreadsheetMetaData/4.0 tableAttributes";
import {
  SpreadsheetNamedBase,
  type SheetRowToRowIdx,
  type SpreadsheetNamedProps,
} from "./SpreadsheetNamedBase";

export interface SheetNamedProps<
  TN extends TableName,
> extends SpreadsheetNamedProps {
  sheetName: TN;
}

export class SheetNamedBase<TN extends TableName> extends SpreadsheetNamedBase {
  readonly sheetName: TN;
  constructor({ sheetName, ...props }: SheetNamedProps<TN>) {
    super(props);
    this.sheetName = sheetName;
  }
  get sheetState(): SheetRowToRowIdx {
    return this.namedState[this.sheetName];
  }
  get sheetProps(): SheetNamedProps<TN> {
    return {
      sheetName: this.sheetName,
      ...this.spreadsheetProps,
    };
  }
}
