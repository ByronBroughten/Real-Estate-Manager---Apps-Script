import {
  SpreadsheetRawBase,
  type SpreadsheetRawProps,
} from "../02_SpreadsheetRaw/ClassBases/SpreadsheetRawBase";
import { SpreadsheetSchemaNamed } from "../04_SpreadsheetNamed/SpreadsheetSchemaNamed";
import type { IndexedState } from "./ClassTypes/IndexedState";

export interface SpreadsheetIndexedProps extends SpreadsheetRawProps {
  indexedState: IndexedState;
}

export class SpreadsheetIndexedBase extends SpreadsheetRawBase {
  protected indexedState: IndexedState;
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
  get indexedSheetsState(): IndexedState["sheets"] {
    return this.indexedState.sheets;
  }
  get ssSchema(): SpreadsheetSchemaNamed {
    return new SpreadsheetSchemaNamed();
  }
}
