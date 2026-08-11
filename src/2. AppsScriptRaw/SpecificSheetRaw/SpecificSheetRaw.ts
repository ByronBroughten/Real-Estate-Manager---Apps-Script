import type { ColumnRaw } from "../ColumnRaw";
import { SpreadsheetRaw } from "../SpreadsheetRaw";
import { SpecificSheetRawBase } from "./Base/SpecificSheetRawBase";

export class SpecificSheetRaw<
  HS extends string,
> extends SpecificSheetRawBase<HS> {
  get ss() {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  get sheet() {
    return this.ss.sheet(this.sheetGid);
  }
  fetchColumnOfHeader(header: HS): ColumnRaw {
    return this.sheet.fetchColumnOfHeader(header);
  }
  fetchColumnsOfHeaders<H extends HS>(...headers: H[]): Record<H, ColumnRaw> {
    return this.sheet.fetchColumnsOfHeaders(...headers);
  }
}
