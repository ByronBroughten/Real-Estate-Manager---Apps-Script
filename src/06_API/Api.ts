import { GoogleSheetsAPI } from "../00_Source/GoogleSheets/GoogleSheetsAPI";
import {
  hasInstalledRawSource,
  installRawSource,
} from "../00_Source/RawSource/RawSource";
import { ssConfigGet } from "../01_SpreadsheetSchema/spreadsheetConfigTypes";
import type { ColumnSchema } from "../01_SpreadsheetSchema/ColumnSchema";
import { SpreadsheetSchema } from "../01_SpreadsheetSchema/SpreadsheetSchema";
import { SpreadsheetIdentified } from "../03_SpreadsheetIdentified/SpreadsheetIdentified";
import {
  SpreadsheetBaseNamed,
  type SpreadsheetNamedProps,
} from "../04_SpreadsheetNamed/ClassBases/SpreadsheetBaseNamed";
import { frameworkEndpoints } from "./frameworkEndpoints";
import { EndpointRun } from "./EndpointRun";
import type { Endpoints } from "./Endpoints";

export type EventOrigin = {
  colIndex: number;
  sheetGid: number;
};

interface ApiProps extends SpreadsheetNamedProps {
  endpoints: Endpoints;
}
export class Api extends SpreadsheetBaseNamed {
  readonly endpoints: Endpoints;
  constructor({ endpoints, ...rest }: ApiProps) {
    super(rest);
    this.endpoints = {
      ...endpoints,
      ...frameworkEndpoints,
    };
  }
  static init(endpoints: Endpoints): Api {
    if (!hasInstalledRawSource()) {
      installRawSource(GoogleSheetsAPI.forAppsScript());
    }
    return new Api({
      endpoints,
      ...SpreadsheetBaseNamed.initSpreadsheetNamedProps(),
    });
  }
  get schema(): SpreadsheetSchema {
    return new SpreadsheetSchema();
  }
  get ssi(): SpreadsheetIdentified {
    return new SpreadsheetIdentified(this.spreadsheetIdentifiedProps);
  }
  static eventIndexToBase0(eventIndex: number): number {
    return eventIndex - 1;
  }
  static isSuspectedApiCall(e: GoogleAppsScript.Events.SheetsOnEdit): boolean {
    return (
      (e.value === "TRUE" || e.value === "FALSE") &&
      Api.eventIndexToBase0(e.range.getRow()) ===
        ssConfigGet("actionRowIndexBase0")
    );
  }
  getEventOrigin(e: GoogleAppsScript.Events.SheetsOnEdit): EventOrigin {
    return {
      colIndex: Api.eventIndexToBase0(e.range.getColumn()),
      sheetGid: e.range.getSheet().getSheetId(),
    };
  }
  handleSheetOnEditEvent(e: GoogleAppsScript.Events.SheetsOnEdit): void {
    const { colIndex, sheetGid } = this.getEventOrigin(e);
    if (!this.schema.isInSheetGids(sheetGid)) {
      return;
    }
    const sheet = this.ssi.sheetMeta(sheetGid).ensureColumnIdsAreFetched();
    if (!sheet.isTableColIndex(colIndex)) {
      return;
    }
    const columnId = sheet.columnIdByIndex(colIndex);
    if (columnId === "") {
      return;
    }
    this._runEndpoint(sheet.schema.columnById(columnId), e.value === "TRUE");
  }
  // An entry that doesn't run on uncheck is a button, so only ticking fires it.
  private _runEndpoint(entryColumn: ColumnSchema, isChecked: boolean): void {
    const endpoint = this.endpoints[entryColumn.fullName];
    if (!endpoint) {
      return;
    }
    if (!isChecked && !endpoint.runOnUncheck) {
      return;
    }
    // The full name is only known at runtime, so the run widens to every sheet.
    new EndpointRun({
      ...this.spreadsheetNamedProps,
      sheetName: entryColumn.sheetName,
      entryColumnName: entryColumn.columnName,
      endpoint,
    }).run(isChecked);
  }
}
