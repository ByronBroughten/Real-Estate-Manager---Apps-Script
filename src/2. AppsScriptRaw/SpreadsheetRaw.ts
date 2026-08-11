import { SpreadsheetSchemaRaw } from "../1.1 SpreadsheetSchemaRaw/SpreadsheetSchemaRaw";
import { valS } from "../utils/validation";
import { SpreadsheetRawBase } from "./ClassBases/SpreadsheetRawBase";
import type { RowRaw } from "./RowRaw";
import { SheetConfig } from "./SheetConfig";
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
  get sheetConfig(): SheetConfig {
    return new SheetConfig({
      sheetGid: this.schema.config("sheetConfigGid"),
      ...this.spreadsheetRawProps,
    });
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
  sheets(...sheetGids: number[]): SheetRaw[] {
    return sheetGids.map((sheetGid) => this.sheet(sheetGid));
  }
  rowBySheetRowId(sheetRowId: string): RowRaw {
    const { sheetGid, rowIdx } = this.schema.idsFromSheetRowId(sheetRowId);
    return this.sheet(sheetGid).row(rowIdx);
  }
  fetchAllSheetHeaders() {
    this.fetchAllSheetsOneRow(this.schema.headerRowIdx);
  }
  fetchAllActiveSheetHeaders() {
    this.fetchAllSheetsOneRow(this.schema.headerRowIdx);
  }
  fetchAllSheetsOneRow(rowIndex: number): void {
    this.fetchAllSheetProperties(); // Needed for active sheet ids.
    (this.activeSheets.forEach((sheet) =>
      sheet.gatherOneRowGetRequest(rowIndex),
    ),
      this.fetchSheets());
  }
  fetchAllSheetProperties() {
    const response = Sheets.Spreadsheets.get(this.spreadsheetId, {
      fields: "sheets(properties(sheetId,title),tables(tableId,range))",
    });
    this._addDataToState(response);
    return { activeSheetGids: new Set(this.activeSheetGids) };
  }
  fetchSheetProperties(...sheetGids: number[]): void {
    this.sheets(...sheetGids).forEach((sheet) => {
      sheet.gatherPropertiesGetRequest();
    });
    this.fetchSheets();
  }
  gatherFetchRanges(...propArr: GridRangeProps[]) {
    this.getterGridRanges.push(...propArr);
  }
  fetchSheets(...propArr: GridRangeProps[]): void {
    this.gatherFetchRanges(...propArr);
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
  addMissingColumnIds(): void {
    this.fetchAllSheetsOneRow(this.schema.colIdRowIdx);
    let sheetUpdatedCount = 0;
    this.activeSheets.forEach((sheet) => {
      sheet.addMissingColumnIds();
      sheetUpdatedCount++;
    });
    Logger.log(
      `ensureColumnIds: added missing column ID(s) in ${sheetUpdatedCount} sheets.`,
    );
  }
  // get sheetConfigHeaders(): ValueConfig["sheetConfigHeader"] {
  //   return this.schema.valueConfig("sheetConfigHeader");
  // }
  private ensureSheetConfigHeaders() {
    // depreciated; the sheets are the source of truth for config headers.
    const sheetConfig = this.sheet(this.schema.config("sheetConfigGid"));
    const sheetConfigHeaders = this.schema.valueConfig("sheetConfigHeader");
    const numFixed = sheetConfig.ensureColumnsOfHeadersExist(
      ...sheetConfigHeaders,
    );
    if (numFixed > 0) {
      Logger.log(
        `Added ${numFixed} missing header(s) to the "${sheetConfig.schema.sheetName}" sheet.`,
      );
    }
  }
  // ensureIdColumnOnAllTables() {
  //   this.fetchAllSheetsOneRow(this.schema.headerRowIdx);
  //   let headersAdded = 0;
  //   this.activeSheets.forEach((sheet) => {
  //     headersAdded + sheet.ensureColumnsOfHeadersExist("ID");
  //   });
  //   if (headersAdded > 0) {
  //     Logger.log(`Added an "ID" header column to ${headersAdded} table(s).`);
  //   }
  // }
  columnSchemaPrep() {
    this.addMissingColumnIds();
  }

  updateColumnAttributes() {}
  copyAndDeleteLastRows() {}
}

class ValueConfig extends SpreadsheetRawBase {
  // Should update before running the table operations
  // Also, should update based on values in column schema, not all values
}
