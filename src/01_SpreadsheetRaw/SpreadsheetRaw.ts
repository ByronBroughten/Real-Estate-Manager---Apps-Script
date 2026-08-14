import type { GoogleSpreadsheet } from "../00_rawPrecursors/AppsScriptTypes";
import type { UniformRowName } from "../00_rawPrecursors/base";
import { SchemaBase } from "../04_SpreadsheetIndexed/SchemaBase";
import { valS } from "../utils/validation";
import { SpreadsheetRawBase } from "./ClassBases/SpreadsheetRawBase";
import type {
  GridRangeProps,
  RowChangesToSave,
  SheetChangesToSave,
} from "./ClassTypes/RawState";
import { ColumnConfigRaw } from "./ColumnConfigRaw";
import { SheetConfigRaw } from "./SheetConfigRaw";
import { SheetRaw, type SheetRawRow } from "./SheetRaw";

export class SpreadsheetRaw extends SpreadsheetRawBase {
  static init(): SpreadsheetRaw {
    return new SpreadsheetRaw({
      rawState: SpreadsheetRaw.initRawState(),
    });
  }
  get sheetConfig(): SheetConfigRaw {
    // This should perhaps live elsewhere.
    return new SheetConfigRaw(this.spreadsheetRawProps);
  }
  get columnConfig(): ColumnConfigRaw {
    return new ColumnConfigRaw(this.spreadsheetRawProps);
  }
  get schema() {
    return new SchemaBase();
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
  rowBySheetRowId(sheetRowId: string): SheetRawRow {
    const { sheetGid, rowIdx } = this.schema.idsFromSheetRowId(sheetRowId);
    return this.sheet(sheetGid).row(rowIdx);
  }
  fetchFullUniformRowAllActiveSheets(rowName: UniformRowName): void {
    this.prepFetchFullUniformRowsAllActiveSheets(rowName);
    this.fetchAll();
  }
  prepFetchFullUniformRowsAllActiveSheets(...rowNames: UniformRowName[]): void {
    this.ensureAllSheetPropertiesAreFetched();
    this.activeSheets.forEach((sheet) => {
      sheet.prepFetchFullUniformRows(rowNames);
    });
  }
  ensureAllSheetPropertiesAreFetched() {
    if (!this.rawState.allSheetPropertiesAreFetched) {
      this.fetchAllSheetProperties();
    }
  }
  fetchAllSheetProperties() {
    const response = Sheets.Spreadsheets.get(this.spreadsheetId, {
      fields: "sheets(properties(sheetId,title),tables(tableId,range))",
    });
    this._addDataToState(response);
    this.rawState.allSheetPropertiesAreFetched = true;
    return { activeSheetGids: new Set(this.activeSheetGids) };
  }
  gatherFetchRanges(...propArr: GridRangeProps[]) {
    this.getterGridRanges.push(...propArr);
  }
  fetchAll(): void {
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
}
