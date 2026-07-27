import {
  SpreadsheetRawBase,
  type SpreadsheetRawProps,
} from "./SpreadsheetRawBase";

export interface SheetRawProps extends SpreadsheetRawProps {
  gid: number;
}

export class SheetRawBase extends SpreadsheetRawBase {
  readonly gid: number;
  constructor({ gid, ...rest }: SheetRawProps) {
    (super(rest), (this.gid = gid));
  }
  get sheetRawProps(): SheetRawProps {
    return {
      gid: this.gid,
      rawState: this.rawState,
    };
  }
}
