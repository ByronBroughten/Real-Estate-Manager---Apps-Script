import { SpreadsheetSchemaRaw } from "../1.1 SpreadsheetSchemaRaw/SpreadsheetSchemaRaw";
import { valS } from "../utils/validation";
import { SpreadsheetRawBase } from "./ClassBases/SpreadsheetRawBase";
import type { RowRaw } from "./RowRaw";
import { SheetRaw } from "./SheetRaw";
import type { GoogleSpreadsheet } from "./Types/AppsScriptTypes";
import type {
  GridRangeProps,
  RowChangesToSave,
  SheetChangesToSave,
} from "./Types/RawState";

export class SpreadsheetRaw extends SpreadsheetRawBase {
  static init(): SpreadsheetRaw {
    return new SpreadsheetRaw({
      rawState: SpreadsheetRaw.initRawState(),
    });
  }
  get schema() {
    return new SpreadsheetSchemaRaw();
  }
  get activeSheetGids(): MapIterator<number> {
    return this.rawState.sheets.keys();
  }
  get activeSheets(): SheetRaw[] {
    return Array.from(this.activeSheetGids, (sheetGid) => this.sheet(sheetGid));
  }
  sheet(sheetGid: number): SheetRaw {
    return new SheetRaw({
      rawState: this.rawState,
      sheetGid: sheetGid,
    });
  }
  rowBySheetRowId(sheetRowId: string): RowRaw {
    const { sheetGid, rowIdx } = this.schema.idsFromSheetRowId(sheetRowId);
    return this.sheet(sheetGid).row(rowIdx);
  }
  fetchAllSheets() {
    const response = Sheets.Spreadsheets.get(this.spreadsheetId, {
      fields: "sheets(properties(sheetId,title),tables(tableId,range))",
    });
    this._addDataToState(response);
  }
  fetchSheets(...propArr: GridRangeProps[]): void {
    this.getterGridRanges.push(...propArr);
    this._doGetByDataFilter();
  }
  private _doGetByDataFilter(): void {
    const data = this._getByDataFilter();
    this._addDataToState(data);
    this.rawState.getterGridRanges = [];
  }
  private _getByDataFilter(): GoogleSpreadsheet {
    return Sheets.Spreadsheets.getByDataFilter(
      this._makeGetterResource(),
      this.spreadsheetId,
      {
        fields:
          "sheets(" +
          "properties(sheetId,title)," +
          "tables(tableId,range)," +
          "data(startColumn,startRow,rowData(values(effectiveValue)))" +
          ")",
      },
    );
  }
  private _makeGetterResource() {
    return {
      dataFilters: this.rawState.getterGridRanges.map((gr) => ({
        gridRange: gr,
      })),
      includeGridData: true,
    };
  }
  private _addDataToState(gss: GoogleSpreadsheet) {
    gss.sheets.forEach((gSheet) => {
      const sheetGid = valS.assertDefined(gSheet.properties.sheetId, "sheetId");
      const sheet = this.sheet(sheetGid);
      sheet.integrateSheetState(gSheet);
    });
  }
  batchUpdateGSheets() {
    this._gatherUpdateRequests();
    this._sendUpdateRequests();
  }
  private _gatherUpdateRequests() {
    const changes = this.allChangesToSave;
    for (const [sheetRowId, change] of changes.entries()) {
      if (change.level === "sheet" && typeof sheetRowId === "number") {
        this._gatherSheetRequests(sheetRowId, change);
      } else if (change.level === "row" && typeof sheetRowId === "string") {
        this._gatherRowRequests(sheetRowId, change);
      } else {
        throw new Error(
          `Invalid change level "${change.level}" with sheetRowId  "${sheetRowId}".`,
        );
      }
    }
    this.rawState.changesToSave = new Map();
  }
  private _gatherRowRequests(sheetRowId: string, change: RowChangesToSave) {
    if (change.append && change.delete) {
      return;
    } else if (change.delete) {
      this.updateRequests.delete.push(change.delete);
      const { sheetGid } = this.schema.idsFromSheetRowId(sheetRowId);
      this.sheet(sheetGid).invalidateRowIndexes();
    } else {
      const row = this.rowBySheetRowId(sheetRowId);
      if (change.append) {
        row.gatherAppendRequest();
      }
      for (const columnName of change.update) {
        row.gatherUpdateRequest(columnName);
      }
    }
  }
  private _gatherSheetRequests(sheetRowId: number, change: SheetChangesToSave) {
    if (change.insertColumn !== null) {
      this.sheet(sheetRowId).gatherInsertColumnRequest(change.insertColumn);
    }
    if (change.sort !== null) {
      this.sheet(sheetRowId).gatherSortRequest(change.sort);
    }
  }
  private _sendUpdateRequests() {
    const surs = this.rawState.updateRequests;
    Sheets.Spreadsheets.batchUpdate(
      {
        requests: [
          ...surs.append,
          ...surs.insertColumn,
          ...surs.update,
          ...surs.delete,
          ...surs.sort,
        ],
      },
      this.spreadsheetId,
    );
    this.rawState.updateRequests = SpreadsheetRaw.initSortedUpdateRequests();
  }
  fetchOneRowAllSheets(columnIndex: number): void {
    this.fetchAllSheets();
    this.fetchSheets(
      ...this.activeSheets.map((sheet) => sheet.wholeRowGridRange(columnIndex)),
    );
  }
  ensureIdColumnOnAllTables() {
    this.fetchOneRowAllSheets(this.schema.headerRowIdx);
    const sheetsWithoutIdColumn = this.activeSheets.filter((sheet) => {
      return sheet.headerRow.activeValueArr.includes("ID") === false;
    });
    let fixedCount = 0;
    for (const sheet of sheetsWithoutIdColumn) {
      sheet.insertColumnAt(0);
      sheet.headerRow.setValue(0, "ID");
      fixedCount++;
    }
    Logger.log(`Added an "ID" header column to ${fixedCount} table(s).`);
  }
  fillMissingRowIds() {
    this.fetchOneRowAllSheets(this.schema.headerRowIdx);
    this.activeSheets.forEach((sheet) => {
      const headers = sheet.headerRow.activeValueArr;
      if (headers.includes("ID") === false) {
        throw new Error(
          `Cannot fill missing row IDs in sheet "${sheet.sheetGid}" because it does not have an "ID" column.`,
        );
      }
      const idColIdx = headers.indexOf("ID");
      const idCol = sheet.column(idColIdx);
      idCol.fillEmptyDataCellsWithDefaultValues();
    });
  }
  addMissingColumnIds(): void {
    this.fetchOneRowAllSheets(this.schema.colIdRowIdx);
    let sheetUpdatedCount = 0;
    this.activeSheets.forEach((sheet) => {
      sheet.addMissingColumnIds();
      sheetUpdatedCount++;
    });
    Logger.log(
      `ensureColumnIds: added missing column ID(s) in ${sheetUpdatedCount} sheets.`,
    );
  }
}
