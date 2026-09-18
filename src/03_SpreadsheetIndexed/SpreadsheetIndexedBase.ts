import {
  SpreadsheetRawBase,
  type SpreadsheetRawProps,
} from "../02_SpreadsheetRaw/ClassBases/SpreadsheetRawBase";
import type { StateIndexed } from "./ClassTypes/StateIndexed";

export interface SpreadsheetIndexedProps extends SpreadsheetRawProps {
  indexedState: StateIndexed;
}

export class SpreadsheetIndexedBase extends SpreadsheetRawBase {
  protected indexedState: StateIndexed;
  constructor({ indexedState, ...rest }: SpreadsheetIndexedProps) {
    super(rest);
    this.indexedState = indexedState;
  }
  get spreadsheetIndexedProps(): SpreadsheetIndexedProps {
    return {
      ...this.spreadsheetRawProps,
      indexedState: this.indexedState,
    };
  }
  static initSpreadsheetIndexedProps(): SpreadsheetIndexedProps {
    return {
      ...SpreadsheetRawBase.initSpreadsheetRawProps(),
      indexedState: {
        sheets: new Map(),
      },
    };
  }
  get indexedSheetsState(): StateIndexed["sheets"] {
    return this.indexedState.sheets;
  }
}
