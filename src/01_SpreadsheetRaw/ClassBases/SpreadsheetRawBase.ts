import { AppsScript } from "../../00_base/AppsScript";
import type { GoogleGridRange } from "../../00_base/AppsScriptTypes";
import {
  type ChangesToSave,
  type RawSheetsState,
  type RawState,
} from "../ClassTypes/RawState";

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
    const ssId = AppsScript.projectProperties("realEstateSpreadsheetId");
    if (!ssId) {
      throw new Error(
        "Spreadsheet ID not found in project properties. Please set the 'realEstateSpreadsheetId' property.",
      );
    }
    return ssId;
  }
  get getterGridRanges(): GoogleGridRange[] {
    return this.rawState.getterGridRanges;
  }
  get allChangesToSave(): ChangesToSave {
    return this.rawState.changesToSave;
  }
  get updateRequests(): RawState["updateRequests"] {
    return this.rawState.updateRequests;
  }
  get spreadsheetRawProps(): SpreadsheetRawProps {
    return {
      rawState: this.rawState,
    };
  }
  static initSpreadsheetRawProps(): SpreadsheetRawProps {
    return {
      rawState: {
        allSheetPropertiesAreFetched: false,
        getterGridRanges: [],
        changesToSave: new Map(),
        updateRequests: this.initSortedUpdateRequests(),
        sheets: new Map(),
      },
    };
  }
  static initSortedUpdateRequests(): RawState["updateRequests"] {
    return {
      append: [],
      update: [],
      delete: [],
      sort: [],
      insertColumn: [],
    };
  }
}
