import { SpreadsheetSchemaRaw } from "../1.1 SpreadsheetSchemaRaw/SpreadsheetSchemaRaw";
import { valS } from "../utils/validation";
import { SpreadsheetRawBase } from "./ClassBases/SpreadsheetRawBase";
import type { RowRaw } from "./RowRaw";
import { SheetRaw } from "./SheetRaw";
import type { GoogleSpreadsheet } from "./Types/AppsScriptTypes";
import type {
  FetchRowsRawProps,
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
  fetchRows(...propArr: FetchRowsRawProps[]): void {
    this._gatherGridRanges(propArr);
    this._doGetByDataFilter();
  }
  // fetchRowsSpecific(props: InitSpecificRowsPropsRaw): void {
  //   this._gatherSpecificRowGridRanges(props);
  //   this._doGetByDataFilter();
  // }
  // private _gatherSpecificRowGridRanges({
  //   rowIdexes,
  //   sheets,
  // }: InitSpecificRowsPropsRaw): void {
  //   rowIdexes.forEach((rowIdx) => {
  //     for (const sheetId of sheets.keys()) {
  //       this.sheet(sheetId).gatherGetRequests({
  //         startRowIndex: rowIdx,
  //         rowCount: 1,
  //         columnSpecifier: sheets[sheetId],
  //       });
  //     }
  //   });
  // }
  private _doGetByDataFilter(): void {
    const data = this._getByDataFilter();
    this._addDataToState(data);
    this.rawState.getterGridRanges = [];
  }
  loadSheetPropertiesGetGids(): number[] {
    const data = Sheets.Spreadsheets.get(this.spreadsheetId, {
      includeGridData: true,
      fields: "sheets(properties(sheetId,title),tables(name,tableId))",
    });
    this._addDataToState(data);
    return data.sheets.map((s) =>
      valS.assertDefined(s.properties.sheetId, "sheetId"),
    );
  }
  private _getByDataFilter(): GoogleSpreadsheet {
    return Sheets.Spreadsheets.getByDataFilter(
      this._makeGetterResource(),
      this.spreadsheetId,
      {
        fields:
          "sheets(properties(sheetId,title),tables(name,tableId),data(startColumn,startRow,columnMetadata(hiddenByUser),rowData(values(effectiveValue))))",
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
  private _gatherGridRanges(props: FetchRowsRawProps[]): void {
    props.forEach(({ startRowIndex, rowCount, sheetColumns }) => {
      for (const sheetId of sheetColumns.keys()) {
        this.sheet(sheetId).gatherGetRequests({
          startRowIndex,
          rowCount,
          startColumnIndexes: sheetColumns[sheetId],
        });
      }
    });
  }
  private _addDataToState(gss: GoogleSpreadsheet) {
    gss.sheets.forEach((gSheet) => {
      const sheetGid = valS.assertDefined(gSheet.properties.sheetId, "sheetId");
      const sheet = this.sheet(sheetGid);
      sheet.initSheetState(gSheet);
    });
  }
  batchUpdateGSheets() {
    this._gatherUpdateRequests();
    this._sendUpdateRequests();
    this._handleInvalidatedRowIndexes();
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
    const requests = this.rawState.updateRequests;
    if (change.append && change.delete) {
      return;
    } else if (change.delete) {
      requests.delete.push(change.delete);
      const { sheetGid } = this.schema.idsFromSheetRowId(sheetRowId);
      this.rawState.sheetsInvalidateIdxesOnUpdate.add(sheetGid);
    } else {
      const row = this.rowBySheetRowId(sheetRowId);
      if (change.append) {
        requests.append.push(row.appendRequest);
      }
      for (const columnName of change.update) {
        requests.update.push(row.updateRequest(columnName));
      }
    }
  }
  private _gatherSheetRequests(sheetRowId: number, change: SheetChangesToSave) {
    const requests = this.rawState.updateRequests;
    if (change.sort) {
      const sheet = this.sheet(sheetRowId);
      requests.sort.push(sheet.sortRequest(change.sort));
    }
  }
  private _sendUpdateRequests() {
    const surs = this.rawState.updateRequests;
    Sheets.Spreadsheets.batchUpdate(
      {
        requests: [
          ...surs.append,
          ...surs.update,
          ...surs.delete,
          ...surs.sort,
        ],
      },
      this.spreadsheetId,
    );
    this.rawState.updateRequests = SpreadsheetRaw.initSortedUpdateRequests();
  }
  private _handleInvalidatedRowIndexes() {
    this.rawState.sheetsInvalidateIdxesOnUpdate.forEach((sheetGid) => {
      this.sheet(sheetGid).invalidateRowIndexes();
    });
    this.rawState.sheetsInvalidateIdxesOnUpdate.clear();
  }
}
