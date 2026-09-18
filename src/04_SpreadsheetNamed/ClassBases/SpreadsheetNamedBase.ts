import {
  SpreadsheetIndexedBase,
  type SpreadsheetIndexedProps,
} from "../../03_SpreadsheetIndexed/SpreadsheetIndexedBase";

export interface SpreadsheetNamedProps extends SpreadsheetIndexedProps {}

export class SpreadsheetNamedBase extends SpreadsheetIndexedBase {
  get spreadsheetNamedProps(): SpreadsheetNamedProps {
    return {
      ...this.spreadsheetIndexedProps,
    };
  }
  static initSpreadsheetNamedProps(): SpreadsheetNamedProps {
    return SpreadsheetIndexedBase.initSpreadsheetIndexedProps();
  }
}
