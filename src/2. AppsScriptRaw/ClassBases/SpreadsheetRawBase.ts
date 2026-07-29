import {
  configGet,
  type SpreadsheetConfig,
} from "../../0. spreadsheetMetaData/1. spreadsheetConfig";
import type { RawSheetsState, RawState } from "../Types/RawState";

export interface SpreadsheetRawProps {
  rawState: RawState;
}

export class SpreadsheetRawBase {
  protected rawState: RawState;
  constructor(props: SpreadsheetRawProps) {
    this.rawState = props.rawState;
  }
  configGet<K extends keyof SpreadsheetConfig>(key: K): SpreadsheetConfig[K] {
    return configGet(key);
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
      sheets: new Map(),
      newRowIdxCounterNegative: 0,
    };
  }
}
