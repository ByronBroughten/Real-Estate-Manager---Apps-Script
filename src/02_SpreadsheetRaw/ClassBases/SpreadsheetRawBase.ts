import { AppsScript } from "../../00_base/AppsScript";
import { installedRawSource } from "../../00_base/RawSource";
import { SpreadsheetSchema } from "../SpreadsheetSchema";
import type { GridRangeProps } from "../ClassTypes/AccessorsRaw";
import {
  type ChangesToSave,
  type SheetsStateRaw,
  type StateRaw,
} from "../ClassTypes/StateRaw";

export interface SpreadsheetRawProps {
  spreadsheetState: StateRaw;
}

export class SpreadsheetRawBase {
  protected spreadsheetState: StateRaw;
  constructor(props: SpreadsheetRawProps) {
    this.spreadsheetState = props.spreadsheetState;
  }
  protected get sheetsState(): SheetsStateRaw {
    return this.spreadsheetState.sheets;
  }
  get schema(): SpreadsheetSchema {
    return new SpreadsheetSchema();
  }
  get spreadsheetId(): string {
    const cached = this.spreadsheetState.spreadsheetId;
    if (cached !== null) return cached;
    const ssId = AppsScript.projectProperties("realEstateSpreadsheetId");
    if (!ssId) {
      throw new Error(
        "Spreadsheet ID not found in project properties. Please set the 'realEstateSpreadsheetId' property.",
      );
    }
    this.spreadsheetState.spreadsheetId = ssId;
    return ssId;
  }
  get fetcherGridRanges(): GridRangeProps[] {
    return this.spreadsheetState.fetcherGridRanges;
  }
  get allChangesToSave(): ChangesToSave {
    return this.spreadsheetState.changesToSave;
  }
  get updateRequests(): StateRaw["updateRequests"] {
    return this.spreadsheetState.updateRequests;
  }
  get spreadsheetRawProps(): SpreadsheetRawProps {
    return {
      spreadsheetState: this.spreadsheetState,
    };
  }
  static initSpreadsheetRawProps(): SpreadsheetRawProps {
    return {
      spreadsheetState: {
        allSheetPropertiesAreFetched: false,
        spreadsheetId: null,
        rawSource: installedRawSource(),
        fetcherGridRanges: [],
        changesToSave: new Map(),
        updateRequests: this.initSortedUpdateRequests(),
        sheets: new Map(),
      },
    };
  }
  static initSortedUpdateRequests(): StateRaw["updateRequests"] {
    return {
      append: [],
      update: [],
      delete: [],
      sort: [],
      insertColumn: [],
      fill: [],
      findReplace: [],
      deleteConditionalFormat: [],
      addConditionalFormat: [],
      deleteProtectedRange: [],
      addProtectedRange: [],
      raw: [],
    };
  }
}
