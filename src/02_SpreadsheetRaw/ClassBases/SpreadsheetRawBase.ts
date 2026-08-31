import { AppsScript } from "../../00_base/AppsScript";
import { SchemaBase } from "../BaseSchema";
import type { GridRangeProps } from "../ClassTypes/AccessorsRaw";
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
  protected get rawSheetsState(): RawSheetsState {
    return this.rawState.sheets;
  }
  get baseSchema(): SchemaBase {
    return new SchemaBase();
  }
  get spreadsheetId(): string {
    const cached = this.rawState.spreadsheetId;
    if (cached !== null) return cached;
    const ssId = AppsScript.projectProperties("realEstateSpreadsheetId");
    if (!ssId) {
      throw new Error(
        "Spreadsheet ID not found in project properties. Please set the 'realEstateSpreadsheetId' property.",
      );
    }
    this.rawState.spreadsheetId = ssId;
    return ssId;
  }
  get fetcherGridRanges(): GridRangeProps[] {
    return this.rawState.fetcherGridRanges;
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
        spreadsheetId: null,
        fetcherGridRanges: [],
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
