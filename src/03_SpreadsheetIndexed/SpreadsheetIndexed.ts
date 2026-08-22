import { SpreadsheetRaw } from "../01_SpreadsheetRaw/SpreadsheetRaw";
import { type ColumnIndexed } from "./ColumnIndexed";
import { SheetIndexed } from "./SheetIndexed";
import { SpreadsheetIndexedBase } from "./SpreadsheetIndexedBase";
import { SpreadsheetSchemaIndexed } from "./SpreadsheetSchemaIndexed";

export class SpreadsheetIndexed extends SpreadsheetIndexedBase {
  get schema(): SpreadsheetSchemaIndexed {
    return new SpreadsheetSchemaIndexed();
  }
  get raw(): SpreadsheetRaw {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  sheet(sheetGid: number): SheetIndexed {
    return new SheetIndexed({
      ...this.spreadsheetIndexedProps,
      sheetGid,
    });
  }
  column(sheetGid: number, columnId: string): ColumnIndexed {
    return this.sheet(sheetGid).column(columnId);
  }
  get activeSheets(): SheetIndexed[] {
    return this.raw.activeSheetGids.map((sheetGid) => this.sheet(sheetGid));
  }
  get sheetsPreppedForFetch() {
    return this.raw.activeSheetGids
      .map((sheetGid) => this.sheet(sheetGid))
      .filter((sheet) => sheet.isPreppedToFetch);
  }
  fetchAllPrepped() {
    const sheetsPreppedForFetch = this.sheetsPreppedForFetch;
    sheetsPreppedForFetch.forEach((sheet) => {
      sheet.raw.gatherFetchProperties();
      sheet.raw.gatherFetchAllColumnIds();
    });
    this.raw.fetchAllPrepped();
    sheetsPreppedForFetch.forEach((sheet) => {
      sheet.gatherFetchDataPrepped();
    });
    this.raw.fetchAllPrepped();
    sheetsPreppedForFetch.forEach((sheet) => {
      sheet.finalizeFetchedData();
    });
  }
}
