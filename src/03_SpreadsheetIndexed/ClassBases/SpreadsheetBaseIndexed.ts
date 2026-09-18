import {
  SpreadsheetBaseRaw,
  type SpreadsheetRawProps,
} from "../../02_SpreadsheetRaw/ClassBases/SpreadsheetBaseRaw";
import type { StateIndexed } from "../ClassTypes/StateIndexed";

export interface SpreadsheetIndexedProps extends SpreadsheetRawProps {
  spreadsheetStateIndexed: StateIndexed;
}

export class SpreadsheetBaseIndexed extends SpreadsheetBaseRaw {
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
      ...SpreadsheetBaseRaw.initSpreadsheetRawProps(),
      spreadsheetStateIndexed: {
        sheets: new Map(),
      },
    };
  }
  get sheetsStateIndexed(): StateIndexed["sheets"] {
    return this.spreadsheetStateIndexed.sheets;
  }
}
