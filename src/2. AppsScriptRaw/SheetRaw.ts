import { SheetRawBase } from "./ClassBases/SheetRawBase";
import { RowRaw } from "./RowRaw";
import { SpreadsheetRaw } from "./SpreadsheetRaw";
import type { DataFilter, GridRange } from "./Types/AppsScriptTypes";

interface MakeGetRequestProps {
  startRowIdxBase0: number;
  howManyRows: number;
  columnIdxsBase0: number;
  howManyColumns: number;
}

interface MakeGetRequestsProps {
  startRowIdxBase0: number;
  howManyRows: number;
  columnIdxsBase0: number[];
}

export class SheetRaw extends SheetRawBase {
  get spreadsheet(): SpreadsheetRaw {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  get gs(): GoogleAppsScript.Spreadsheet.Sheet {
    return this.gss.getSheetById(this.gid);
  }
  get emptyGridRange(): GridRange {
    return { sheetId: this.gid, startRowIndex: 0, endRowIndex: 0 };
  }
  row(idxBase0: number): RowRaw {
    return new RowRaw({
      idxBase0,
      ...this.sheetRawProps,
    });
  }
  makeGetRequest({
    startRowIdxBase0,
    howManyRows,
    columnIdxsBase0,
    howManyColumns,
  }: MakeGetRequestProps): DataFilter {
    return {
      gridRange: {
        sheetId: this.gid,
        startRowIndex: startRowIdxBase0,
        endRowIndex: startRowIdxBase0 + howManyRows,
        startColumnIndex: columnIdxsBase0,
        endColumnIndex: columnIdxsBase0 + howManyColumns,
      },
    };
  }
  makeGetRequests({
    startRowIdxBase0,
    howManyRows,
    columnIdxsBase0,
  }: MakeGetRequestsProps): DataFilter[] {
    return columnIdxsBase0.map((columnIdxBase0) =>
      this.makeGetRequest({
        startRowIdxBase0,
        howManyRows,
        columnIdxsBase0: columnIdxBase0,
        howManyColumns: 1,
      }),
    );
  }
  makeGetDataRequest(howMany: number, columnIdxsBase0: number[]): DataFilter {
    return this.makeGetRequest(this.configGet("topBodyRowIdxBase0"), howMany);
  }
  appendRow(rowData: unknown[]) {
    this.gs.appendRow(rowData);
  }
  deleteRows(startIdxBase1: number, howMany: number) {
    this.gs.deleteRows(startIdxBase1, howMany);
  }
}
