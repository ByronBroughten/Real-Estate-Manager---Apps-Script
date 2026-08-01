import type { RawSheetsState, RawState } from "../Types/RawState";

export interface SpreadsheetRawProps {
  rawState: RawState;
}

export class SpreadsheetRawBase {
  protected rawState: RawState;
  constructor(props: SpreadsheetRawProps) {
    this.rawState = props.rawState;
  }
  get gss() {
    return this.rawState.gss;
  }
  protected get sheetsState(): RawSheetsState {
    return this.rawState.sheets;
  }
  get spreadsheetId() {
    return this.gss.getId();
  }
  get updateRequests() {
    return this.rawState.updateRequests;
  }
  get spreadsheetRawProps(): SpreadsheetRawProps {
    return {
      rawState: this.rawState,
    };
  }
  static initRawState(): RawState {
    return {
      gss: SpreadsheetApp.getActiveSpreadsheet(),
      updateRequests: [],
      getterGridRanges: [],
      sheets: new Map(),
    };
  }
}
