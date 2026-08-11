import type { SheetName } from "../../1.0 Configs/2.0 sheetConfigs";
import type { RowIdsToIndexes } from "../Types/NamedState";
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
  get sheetState(): RowIdsToIndexes {
    return this.namedState.sheetRowIdsToIndexes[this.sheetName];
  }
  get sheetNamedProps(): SheetNamedProps<TN> {
    return {
      sheetName: this.sheetName,
      ...this.spreadsheetNamedProps,
    };
  }
}
