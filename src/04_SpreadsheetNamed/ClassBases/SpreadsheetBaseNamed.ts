import {
  SpreadsheetBaseIndexed,
  type SpreadsheetIndexedProps,
} from "../../03_SpreadsheetIndexed/ClassBases/SpreadsheetBaseIndexed";

export interface SpreadsheetNamedProps extends SpreadsheetIndexedProps {}

export class SpreadsheetBaseNamed extends SpreadsheetBaseIndexed {
  get spreadsheetNamedProps(): SpreadsheetNamedProps {
    return {
      ...this.spreadsheetIndexedProps,
    };
  }
  static initSpreadsheetNamedProps(): SpreadsheetNamedProps {
    return SpreadsheetBaseIndexed.initSpreadsheetIndexedProps();
  }
}
