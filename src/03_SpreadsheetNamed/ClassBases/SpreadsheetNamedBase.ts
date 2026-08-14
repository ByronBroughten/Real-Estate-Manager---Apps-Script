import {
  SpreadsheetRawBase,
  type SpreadsheetRawProps,
} from "../../2. AppsScriptRaw/ClassBases/SpreadsheetRawBase";
import { SpreadsheetRaw } from "../../2. AppsScriptRaw/SpreadsheetRaw";
import type { GridRangeProps } from "../../2. AppsScriptRaw/Types/RawState";
import { SpreadsheetSchema } from "../../2.0 Schemas/SpreadsheetSchemaNamed";
import type { SpreadsheetNamedState } from "../Types/NamedState";

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
  get gridRangeFetchProps(): GridRangeProps[] {
    return this.namedState.gridRangeFetchProps;
  }
  static initSpreadsheetNamedProps(): SpreadsheetNamedProps {
    return {
      rawState: SpreadsheetRaw.initRawState(),
      namedState: {
        gridRangeFetchProps: [],
      },
    };
  }
}
