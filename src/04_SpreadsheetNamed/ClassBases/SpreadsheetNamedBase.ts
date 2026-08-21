import type { GridRangeProps } from "../../01_SpreadsheetRaw/ClassTypes/AccessorsRaw";
import {
  SpreadsheetIndexedBase,
  type SpreadsheetIndexedProps,
} from "../../03_SpreadsheetIndexed/SpreadsheetIndexedBase";
import type { SpreadsheetNamedState } from "../Types/NamedState";

export interface SpreadsheetNamedProps extends SpreadsheetIndexedProps {
  namedState: SpreadsheetNamedState;
}

export class SpreadsheetNamedBase extends SpreadsheetIndexedBase {
  protected namedState: SpreadsheetNamedState;
  constructor({ namedState, ...rest }: SpreadsheetNamedProps) {
    super(rest);
    this.namedState = namedState;
  }
  get spreadsheetNamedProps(): SpreadsheetNamedProps {
    return {
      ...super.spreadsheetIndexedProps,
      namedState: this.namedState,
    };
  }
  get gridRangeFetchProps(): GridRangeProps[] {
    return this.namedState.gridRangeFetchProps;
  }
  static initSpreadsheetNamedProps(): SpreadsheetNamedProps {
    return {
      ...SpreadsheetIndexedBase.initSpreadsheetIndexedProps(),
      namedState: {
        gridRangeFetchProps: [],
      },
    };
  }
}
