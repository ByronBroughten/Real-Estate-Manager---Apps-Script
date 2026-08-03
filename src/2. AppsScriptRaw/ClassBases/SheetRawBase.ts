import { SheetSchemaRaw } from "../../1.1 SpreadsheetSchemaRaw/SheetSchemaRaw";
import type { RawSheetState } from "../Types/RawState";
import {
  SpreadsheetRawBase,
  type SpreadsheetRawProps,
} from "./SpreadsheetRawBase";

export interface SheetRawProps extends SpreadsheetRawProps {
  sheetGid: number;
}

export class SheetRawNotFoundError extends Error {
  constructor(sheetGid: number) {
    super(`Sheet with sheetGid "${sheetGid}" not found.`);
  }
}

export class SheetRawBase extends SpreadsheetRawBase {
  readonly sheetGid: number;
  constructor({ sheetGid, ...rest }: SheetRawProps) {
    super(rest);
    this.sheetGid = sheetGid;
  }
  get sheetSchema() {
    return new SheetSchemaRaw(this.sheetGid);
  }
  get sheetState(): RawSheetState {
    return this.sheetState[this.sheetGid];
  }
  get rowStates(): RawSheetState["rowStates"] {
    return this.sheetState.rowStates;
  }
  get rowCount(): number {
    return this.sheetState.rowStates.size;
  }
  get dataRowCount(): number {
    return this.rowCount - this.sheetSchema.topBodyRowIdx;
  }
  get sheetRawProps(): SheetRawProps {
    return {
      sheetGid: this.sheetGid,
      rawState: this.rawState,
    };
  }
}
