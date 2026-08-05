import type { TableName } from "../../0. spreadsheetMetaData/4.0 tableAttributes";
import { SpreadsheetSchema } from "../../1. SpreadsheetSchema/SpreadsheetSchema";
import {
  SpreadsheetRawBase,
  type SpreadsheetRawProps,
} from "../../2. AppsScriptRaw/ClassBases/SpreadsheetRawBase";
import { SpreadsheetRaw } from "../../2. AppsScriptRaw/SpreadsheetRaw";

export type SheetRowToRowIdx = Record<string, number>;
export type SpreadsheetNamedState = {
  [TN in TableName]: SheetRowToRowIdx;
};
export interface SpreadsheetNamedProps extends SpreadsheetRawProps {
  namedState: SpreadsheetNamedState;
}
export class SpreadsheetNamedBase extends SpreadsheetRawBase {
  protected namedState: SpreadsheetNamedState;
  constructor({ namedState, ...rest }: SpreadsheetNamedProps) {
    super(rest);
    this.namedState = namedState;
  }
  get spreadsheetSchema(): SpreadsheetSchema {
    return new SpreadsheetSchema();
  }
  get spreadsheetNamedProps(): SpreadsheetNamedProps {
    return {
      rawState: this.rawState,
      namedState: this.namedState,
    };
  }
  static initSpreadsheetNamedProps(): SpreadsheetNamedProps {
    return {
      rawState: SpreadsheetRaw.initRawState(),
      namedState: {} as SpreadsheetNamedState,
    };
  }
}
