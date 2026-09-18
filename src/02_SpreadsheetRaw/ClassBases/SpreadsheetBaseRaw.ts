import { AppsScript } from "../../00_base/AppsScript";
import { installedRawSource } from "../../00_base/RawSource";
import type { GridRangeProps } from "../ClassTypes/AccessorsRaw";
import {
  emptySpreadsheetFetchQueue,
  emptySpreadsheetWriteQueue,
  type SheetsStateRaw,
  type StateRaw,
} from "../ClassTypes/StateRaw";
import { SchemaBase } from "../Schema/SchemaBase";

export interface SpreadsheetRawProps {
  spreadsheetStateRaw: StateRaw;
}

export class SpreadsheetBaseRaw {
  protected spreadsheetStateRaw: StateRaw;
  constructor(props: SpreadsheetRawProps) {
    this.spreadsheetStateRaw = props.spreadsheetStateRaw;
  }
  protected get sheetsStateRaw(): SheetsStateRaw {
    return this.spreadsheetStateRaw.sheets;
  }
  get schema(): SchemaBase {
    return new SchemaBase();
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
    return this.spreadsheetStateRaw.fetchQueue.gridRanges;
  }
  get updateRequests(): StateRaw["writeQueue"]["updateRequests"] {
    return this.spreadsheetStateRaw.writeQueue.updateRequests;
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
        fetchQueue: emptySpreadsheetFetchQueue(),
        writeQueue: emptySpreadsheetWriteQueue(),
        sheets: new Map(),
      },
    };
  }
}
