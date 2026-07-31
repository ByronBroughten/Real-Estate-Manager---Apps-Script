import type { TableName } from "../../0. spreadsheetMetaData/4.0 tableAttributes";
import type { SpreadsheetSchema } from "../../1. SpreadsheetSchema/SpreadsheetSchema";
import {
  SpreadsheetRawBase,
  type SpreadsheetRawProps,
} from "../../2. AppsScriptRaw/ClassBases/SpreadsheetRawBase";
import type { SheetState } from "./SheetNamedBase";

export type SpreadsheetState = {
  [TN in TableName]: SheetState<TN>;
};

export interface NamedState {
  spreadsheetTables: SpreadsheetState;
  spreadsheetSchema: SpreadsheetSchema;
  colIdToIdx: Record<string, number>;
  rowIdToIdx: Record<string, number>;
}

export interface SpreadsheetNamedProps extends SpreadsheetRawProps {
  namedState: NamedState;
}

export class SpreadsheetNamedBase extends SpreadsheetRawBase {
  protected namedState: NamedState;
  constructor({ namedState, ...rest }: SpreadsheetNamedProps) {
    super(rest);
    this.namedState = namedState;
  }
  get spreadsheetTables() {
    return this.namedState.spreadsheetTables;
  }
  get spreadsheetSchema() {
    return this.namedState.spreadsheetSchema;
  }
  get spreadsheetProps(): SpreadsheetNamedProps {
    return {
      rawState: this.rawState,
      namedState: this.namedState,
    };
  }
}
