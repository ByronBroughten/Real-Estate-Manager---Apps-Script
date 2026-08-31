import { ssConfigGet } from "../01_generatedConfigs/spreadsheetConfigTypes";
import { SpreadsheetIndexed } from "../03_SpreadsheetIndexed/SpreadsheetIndexed";
import {
  SpreadsheetNamedBase,
  type SpreadsheetNamedProps,
} from "../04_SpreadsheetNamed/ClassBases/SpreadsheetNamedBase";
import { baseEndpoints, type Endpoints } from "./baseEndpoints";

export type EventOrigin = {
  colIndex: number;
  sheetGid: number;
};

interface ApiProps extends SpreadsheetNamedProps {
  endpoints: Endpoints;
}
export class Api extends SpreadsheetNamedBase {
  readonly endpoints: Endpoints;
  constructor({ endpoints, ...rest }: ApiProps) {
    super(rest);
    this.endpoints = {
      ...endpoints,
      ...baseEndpoints,
    };
  }
  static init(endpoints: Endpoints): Api {
    return new Api({
      endpoints,
      ...SpreadsheetNamedBase.initSpreadsheetNamedProps(),
    });
  }
  get ssi(): SpreadsheetIndexed {
    return new SpreadsheetIndexed(this.spreadsheetIndexedProps);
  }
  static eventIndexToBase0(eventIndex: number): number {
    return eventIndex - 1;
  }
  static isSuspectedApiCall(e: GoogleAppsScript.Events.SheetsOnEdit): boolean {
    if (
      e.value === "TRUE" &&
      Api.eventIndexToBase0(e.range.getRow()) ===
        ssConfigGet("actionRowIndexBase0")
    ) {
      return true;
    } else {
      return false;
    }
  }
  getEventOrigin(e: GoogleAppsScript.Events.SheetsOnEdit): EventOrigin {
    return {
      colIndex: Api.eventIndexToBase0(e.range.getColumn()),
      sheetGid: e.range.getSheet().getSheetId(),
    };
  }
  handleSheetOnEditEvent(e: GoogleAppsScript.Events.SheetsOnEdit): void {
    const { colIndex, sheetGid } = this.getEventOrigin(e);
    if (!this.baseSchema.isInSheetGids(sheetGid)) {
      return;
    }
    const sheet = this.ssi.sheet(sheetGid).fetchOnlyColumnId(colIndex);
    const columnId = sheet.columnIdByIndex(colIndex);
    if (columnId === "") {
      return;
    }
    const { fullName } = sheet.schema.column(columnId);
    this.endpoints[fullName]?.();
  }
}
