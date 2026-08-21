import type { GoogleSpreadsheet } from "../00_base/AppsScriptTypes";
import { SchemaBase } from "../03_SpreadsheetIndexed/SchemaBase";
import { valS } from "../utils/validation";
import { SpreadsheetRawBase } from "./ClassBases/SpreadsheetRawBase";
import type {
  RowChangesToSave,
  SheetChangesToSave,
} from "./ClassTypes/RawState";
import { SheetRaw, type SheetRawRow } from "./SheetRaw";

export class SpreadsheetRaw extends SpreadsheetRawBase {
  static init(): SpreadsheetRaw {
    return new SpreadsheetRaw(SpreadsheetRawBase.initSpreadsheetRawProps());
  }
  private get sheetsService(): GoogleAppsScript.Sheets {
    return valS.assert(Sheets, "Sheets (enable the Advanced Sheets Service)");
  }
  get schema() {
    return new SchemaBase();
  }
  get activeSheetGids(): Set<number> {
    return new Set(this.rawState.sheets.keys());
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
  rowBySheetRowId(sheetRowId: string): SheetRawRow {
    const { sheetGid, rowIdx } = this.schema.idsFromSheetRowId(sheetRowId);
    return this.sheet(sheetGid).row(rowIdx);
  }
  ensureAllSheetPropertiesAreFetched() {
    if (!this.rawState.allSheetPropertiesAreFetched) {
      this.fetchAllPreppedSheetProperties();
    }
  }
  fetchAllPreppedSheetProperties() {
    const response = this.sheetsService.Spreadsheets.get(this.spreadsheetId, {
      fields: "sheets(properties(sheetId,title),tables(tableId,range))",
    });
    this._addDataToState(response);
    this.rawState.allSheetPropertiesAreFetched = true;
    return { activeSheetGids: this.activeSheetGids };
  }
  fetchAllPrepped(): void {
    const data = this._fetchByDataFilter();
    this._addDataToState(data);
    this.rawState.fetcherGridRanges = [];
  }
  private _fetchByDataFilter(): GoogleSpreadsheet {
    return this.sheetsService.Spreadsheets.getByDataFilter(
      this._makeFetchResource(),
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
  private _makeFetchResource() {
    return {
      dataFilters: this.fetcherGridRanges.map((gr) => ({
        gridRange: gr,
      })),
      includeGridData: true,
    };
  }
  private _addDataToState(gss: GoogleSpreadsheet) {
    valS.assert(gss.sheets, "gss.sheets").forEach((gSheet) => {
      const properties = valS.assert(gSheet.properties, "gSheet.properties");
      const sheetGid = valS.assert(properties.sheetId, "sheetId");
      const sheet = this.sheet(sheetGid);

      sheet.integrateSheetState(gSheet);
    });
    this.activeSheets.forEach((sheet) => {
      sheet.finalizeFetchedData();
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
      for (const colIndex of change.update) {
        row.gatherUpdateRequest(colIndex);
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
    const requests = [
      ...surs.append,
      ...surs.insertColumn,
      ...surs.update,
      ...surs.delete,
      ...surs.sort,
    ];
    if (requests.length > 0) {
      this.sheetsService.Spreadsheets.batchUpdate(
        { requests },
        this.spreadsheetId,
      );
    }
    this.rawState.updateRequests = SpreadsheetRaw.initSortedUpdateRequests();
  }
}
