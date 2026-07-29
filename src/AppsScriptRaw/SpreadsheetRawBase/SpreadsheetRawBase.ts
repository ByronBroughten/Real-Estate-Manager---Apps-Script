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
  get requests() {
    return this.rawState.requests;
  }
  get spreadsheetRawProps(): SpreadsheetRawProps {
    return {
      rawState: this.rawState,
    };
  }
  static initRawState(): RawState {
    return {
      gss: SpreadsheetApp.getActiveSpreadsheet(),
      requests: [],
    };
  }
}
