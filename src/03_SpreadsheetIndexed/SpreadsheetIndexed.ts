import { SpreadsheetRaw } from "../02_SpreadsheetRaw/SpreadsheetRaw";
import { type ColumnIndexed } from "./ColumnIndexed";
import { SheetIndexed } from "./SheetIndexed";
import {
  SheetMetaIndexed,
  type GatherDataPrerequisitesProps,
} from "./SheetMetaIndexed";
import { SpreadsheetIndexedBase } from "./SpreadsheetIndexedBase";

export class SpreadsheetIndexed extends SpreadsheetIndexedBase {
  get raw(): SpreadsheetRaw {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  sheet(sheetGid: number): SheetIndexed {
    return new SheetIndexed({
      ...this.spreadsheetIndexedProps,
      sheetGid,
    });
  }
  sheetMeta(sheetGid: number): SheetMetaIndexed {
    return new SheetMetaIndexed({
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
  get sheetsPreppedForFetch(): SheetMetaIndexed[] {
    return Array.from(this.indexedSheetsState.keys())
      .map((sheetGid) => this.sheetMeta(sheetGid))
      .filter((sheet) => sheet.isPreppedToFetch);
  }
  fetchAllPrepped({
    includeProgrammaticFacts = false,
    ...props
  }: GatherDataPrerequisitesProps = {}) {
    const sheetsPreppedForFetch = this.sheetsPreppedForFetch;
    sheetsPreppedForFetch.forEach((sheet) => {
      sheet._gatherDataPrerequisites(props);
    });
    this.raw.fetchAllGathered(includeProgrammaticFacts);
    sheetsPreppedForFetch.forEach((sheet) => {
      sheet.gatherFetchDataPrepped();
    });
    this.raw.fetchAllGathered(includeProgrammaticFacts);
    sheetsPreppedForFetch.forEach((sheet) => {
      sheet.clearPreFetchGridRanges();
    });
  }
}
