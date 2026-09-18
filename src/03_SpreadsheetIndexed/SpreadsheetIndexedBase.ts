import {
  SpreadsheetRawBase,
  type SpreadsheetRawProps,
} from "../02_SpreadsheetRaw/ClassBases/SpreadsheetRawBase";
import type { StateIndexed } from "./ClassTypes/StateIndexed";

export interface SpreadsheetIndexedProps extends SpreadsheetRawProps {
  spreadsheetStateIndexed: StateIndexed;
}

export class SpreadsheetIndexedBase extends SpreadsheetRawBase {
  protected spreadsheetStateIndexed: StateIndexed;
  constructor({ spreadsheetStateIndexed, ...rest }: SpreadsheetIndexedProps) {
    super(rest);
    this.spreadsheetStateIndexed = spreadsheetStateIndexed;
  }
  get spreadsheetIndexedProps(): SpreadsheetIndexedProps {
    return {
      ...this.spreadsheetRawProps,
      spreadsheetStateIndexed: this.spreadsheetStateIndexed,
    };
  }
  static initSpreadsheetIndexedProps(): SpreadsheetIndexedProps {
    return {
      ...SpreadsheetRawBase.initSpreadsheetRawProps(),
      spreadsheetStateIndexed: {
        sheets: new Map(),
      },
    };
  }
  get sheetsStateIndexed(): StateIndexed["sheets"] {
    return this.spreadsheetStateIndexed.sheets;
  }
}
