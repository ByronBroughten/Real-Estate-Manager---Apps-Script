import type { TableName } from "../../appSchema/0. sheetMetaData/4.0 tableAttributes";
import type { SpreadsheetSchema } from "../../appSchema/SpreadsheetSchema";
import {
  SpreadsheetRawBase,
  type SpreadsheetRawProps,
} from "../RawHandlers/RawHandlerBases/SpreadsheetRawBase";
import type { SheetState } from "./SheetNamedBase";

export type SpreadsheetState = {
  [TN in TableName]: SheetState<TN>;
};

export interface NamedState {
  spreadsheetTables: SpreadsheetState;
  spreadsheetSchema: SpreadsheetSchema;
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
