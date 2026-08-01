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

  get sheetState(): RawSheetState {
    return this.sheetState[this.sheetGid];
  }
  get sheetRawProps(): SheetRawProps {
    return {
      sheetGid: this.sheetGid,
      rawState: this.rawState,
    };
  }
}
