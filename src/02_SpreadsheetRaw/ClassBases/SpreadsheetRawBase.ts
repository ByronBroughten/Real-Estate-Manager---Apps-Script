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
  spreadsheetStateRaw: StateRaw;
}

export class SpreadsheetRawBase {
  protected spreadsheetStateRaw: StateRaw;
  constructor(props: SpreadsheetRawProps) {
    this.spreadsheetStateRaw = props.spreadsheetStateRaw;
  }
  protected get sheetsStateRaw(): SheetsStateRaw {
    return this.spreadsheetStateRaw.sheets;
  }
  get schema(): SpreadsheetSchema {
    return new SpreadsheetSchema();
  }
  get spreadsheetId(): string {
    const cached = this.spreadsheetStateRaw.spreadsheetId;
    if (cached !== null) return cached;
    const ssId = AppsScript.projectProperties("realEstateSpreadsheetId");
    if (!ssId) {
      throw new Error(
        "Spreadsheet ID not found in project properties. Please set the 'realEstateSpreadsheetId' property.",
      );
    }
    this.spreadsheetStateRaw.spreadsheetId = ssId;
    return ssId;
  }
  get fetcherGridRanges(): GridRangeProps[] {
    return this.spreadsheetStateRaw.fetcherGridRanges;
  }
  get allChangesToSave(): ChangesToSave {
    return this.spreadsheetStateRaw.changesToSave;
  }
  get updateRequests(): StateRaw["updateRequests"] {
    return this.spreadsheetStateRaw.updateRequests;
  }
  get spreadsheetRawProps(): SpreadsheetRawProps {
    return {
      spreadsheetStateRaw: this.spreadsheetStateRaw,
    };
  }
  static initSpreadsheetRawProps(): SpreadsheetRawProps {
    return {
      spreadsheetStateRaw: {
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
