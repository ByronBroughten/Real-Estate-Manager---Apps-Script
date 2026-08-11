import type { CellValue } from "../1.0 Configs/0.0 ConfigPrecursors";
import { ColumnRawBase } from "./ClassBases/ColumnRawBase";
import { SheetRaw } from "./SheetRaw";
import { SpreadsheetRaw } from "./SpreadsheetRaw";

export class ColumnRaw extends ColumnRawBase {
  get ss() {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  get sheet() {
    return new SheetRaw(this.sheetRawProps);
  }
  get dataValueArr(): CellValue[] {
    return this.sheet.dataRows.map((row) => row.value(this.colIndex));
  }
  get fetchDataRange() {
    return {
      sheetId: this.sheetGid,
      startRowIndex: this.sheetSchema.topDataRowIdx,
      endRowIndex: this.sheet.activeTable.endRowIndex,
      startColumnIndex: this.colIndex,
      endColumnIndex: this.colIndex + 1,
    };
  }
  gatherFetchDataRange() {
    this.ss.gatherFetchRanges(this.fetchDataRange);
    return this;
  }
  fetchData(): ColumnRaw {
    this.ss.fetchSheets(this.fetchDataRange);
    return this;
  }
  validateIndexNotStale(): void {
    const { lastNotStaleColumnIdx } = this.sheetState;
    if (
      lastNotStaleColumnIdx !== null &&
      this.colIndex > lastNotStaleColumnIdx
    ) {
      throw new Error(
        `Column index ${this.colIndex} is stale. Last not stale column index is ${lastNotStaleColumnIdx}.`,
      );
    }
  }
}
