import {
  SpreadsheetRawBase,
  type RawSheetState,
  type SpreadsheetRawProps,
} from "./SpreadsheetRawBase";

export interface SheetRawProps extends SpreadsheetRawProps {
  gid: number;
}

export class SheetRawNotFoundError extends Error {
  constructor(gid: number) {
    super(`Sheet with gid "${gid}" not found.`);
  }
}

export class SheetRawBase extends SpreadsheetRawBase {
  readonly gid: number;
  constructor({ gid, ...rest }: SheetRawProps) {
    super(rest);
    this.gid = gid;
    if (!this.sheetState[this.gid]) {
      throw new SheetRawNotFoundError(this.gid);
    }
  }
  get title(): string {
    return this.sheetState.title;
  }
  get tableName(): string {
    return this.sheetState.tableName;
  }
  get tableId(): string {
    return this.sheetState.tableId;
  }
  get sheetState(): RawSheetState {
    return this.sheetState[this.gid];
  }
  get sheetRawProps(): SheetRawProps {
    return {
      gid: this.gid,
      rawState: this.rawState,
    };
  }
}
