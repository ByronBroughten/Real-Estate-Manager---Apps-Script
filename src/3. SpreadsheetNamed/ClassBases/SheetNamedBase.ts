import type { TableName } from "../../0. spreadsheetMetaData/4.0 tableAttributes";
import {
  SpreadsheetNamedBase,
  type SheetRowToRowIdx,
  type SpreadsheetNamedProps,
} from "./SpreadsheetNamedBase";

export interface SheetNamedProps<
  TN extends TableName,
> extends SpreadsheetNamedProps {
  tableName: TN;
}

export class SheetNamedBase<TN extends TableName> extends SpreadsheetNamedBase {
  readonly tableName: TN;
  constructor({ tableName, ...props }: SheetNamedProps<TN>) {
    super(props);
    this.tableName = tableName;
  }
  get sheetState(): SheetRowToRowIdx {
    return this.namedState[this.tableName];
  }
  get sheetProps(): SheetNamedProps<TN> {
    return {
      tableName: this.tableName,
      ...this.spreadsheetProps,
    };
  }
}
