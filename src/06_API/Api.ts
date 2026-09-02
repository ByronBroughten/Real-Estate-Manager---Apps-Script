import type { ColumnFullNameSimple } from "../01_generatedConfigs/columnConfigsTypes";
import { ssConfigGet } from "../01_generatedConfigs/spreadsheetConfigTypes";
import { SpreadsheetIndexed } from "../03_SpreadsheetIndexed/SpreadsheetIndexed";
import {
  SpreadsheetNamedBase,
  type SpreadsheetNamedProps,
} from "../04_SpreadsheetNamed/ClassBases/SpreadsheetNamedBase";
import {
  baseEndpoints,
  type Endpoints,
  type RunnerEndpointName,
  type SelectorEndpointName,
} from "./baseEndpoints";

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
    const sheet = this.ssi.sheet(sheetGid).ensureColumnIdsAreFetched();
    if (!sheet.isTableColIndex(colIndex)) {
      return;
    }
    const columnId = sheet.columnIdByIndex(colIndex);
    if (columnId === "") {
      return;
    }
    const { fullName } = sheet.schema.column(columnId);
    this._runEndpoint(fullName, e.value === "TRUE");
  }
  // A selector's checkbox is its input, not a button, so unchecking runs it too.
  private _runEndpoint(
    fullName: ColumnFullNameSimple,
    isChecked: boolean,
  ): void {
    if (this._isSelectorEndpointName(fullName)) {
      this.endpoints[fullName]?.({
        ...this.spreadsheetNamedProps,
        isSelected: isChecked,
      });
    } else if (isChecked && this._isRunnerEndpointName(fullName)) {
      this.endpoints[fullName]?.(this.spreadsheetNamedProps);
    }
  }
  private _isSelectorEndpointName(
    fullName: ColumnFullNameSimple,
  ): fullName is SelectorEndpointName {
    return fullName.endsWith(ssConfigGet("selectorEndpointSuffix"));
  }
  private _isRunnerEndpointName(
    fullName: ColumnFullNameSimple,
  ): fullName is RunnerEndpointName {
    return fullName.endsWith(ssConfigGet("runnerEndpointSuffix"));
  }
}
