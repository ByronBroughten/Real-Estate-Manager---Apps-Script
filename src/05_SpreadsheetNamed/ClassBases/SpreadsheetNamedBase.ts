import {
  SpreadsheetRawBase,
  type SpreadsheetRawProps,
} from "../../01_SpreadsheetRaw/ClassBases/SpreadsheetRawBase";
import type { GridRangeProps } from "../../01_SpreadsheetRaw/ClassTypes/RawState";
import { SpreadsheetRaw } from "../../01_SpreadsheetRaw/SpreadsheetRaw";
import { SpreadsheetSchema } from "../SpreadsheetSchemaNamed";
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
