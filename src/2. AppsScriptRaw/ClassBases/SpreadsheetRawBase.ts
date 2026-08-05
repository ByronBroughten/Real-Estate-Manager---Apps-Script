import { AppScriptRaw } from "../AppsScriptRaw";
import type { RawSheetsState, RawState } from "../Types/RawState";

export interface SpreadsheetRawProps {
  rawState: RawState;
}

export class SpreadsheetRawBase {
  protected rawState: RawState;
  constructor(props: SpreadsheetRawProps) {
    this.rawState = props.rawState;
  }
  protected get sheetsState(): RawSheetsState {
    return this.rawState.sheets;
  }
  get spreadsheetId(): string {
    const ssId = AppScriptRaw.projectProperties("realEstateSpreadsheetId");
    if (!ssId) {
      throw new Error(
        "Spreadsheet ID not found in project properties. Please set the 'realEstateSpreadsheetId' property.",
      );
    }
    return ssId;
  }
  get getterGridRanges() {
    return this.rawState.changesToSave;
  }
  get allChangesToSave() {
    return this.rawState.changesToSave;
  }
  get spreadsheetRawProps(): SpreadsheetRawProps {
    return {
      rawState: this.rawState,
    };
  }
  static initSortedUpdateRequests(): RawState["updateRequests"] {
    return {
      append: [],
      update: [],
      delete: [],
      sort: [],
    };
  }
  static initRawState(): RawState {
    return {
      getterGridRanges: [],
      changesToSave: new Map(),
      updateRequests: this.initSortedUpdateRequests(),
      sheets: new Map(),
      sheetsInvalidateIdxesOnUpdate: new Set(),
    };
  }
}
