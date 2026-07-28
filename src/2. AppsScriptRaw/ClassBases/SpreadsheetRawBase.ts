export type BatchUpdateRequest = GoogleAppsScript.Sheets.Schema.Request;

export interface RawSheetState {
  title: string;
  tableName: string;
  tableId: string;
  endRowIdxBase0: number;
}
export interface RawSheetsState {
  [sheetGid: string]: RawSheetState;
}
export interface RawState {
  gss: GoogleAppsScript.Spreadsheet.Spreadsheet;
  requests: BatchUpdateRequest[];
  sheets: RawSheetsState;
}

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
      sheets: {},
    };
  }
}
