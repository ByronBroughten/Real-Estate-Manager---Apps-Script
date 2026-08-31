import type {
  GoogleSpreadsheet,
  GoogleUpdateRequest,
} from "../00_base/AppsScriptTypes";
import { Val } from "../utils/Val";
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
    return Val.assert(Sheets, "Sheets (enable the Advanced Sheets Service)");
  }
  get schema() {
    return this.baseSchema;
  }
  gidIsActive(sheetGid: number): boolean {
    return this.activeSheetGids.includes(sheetGid);
  }
  get activeSheetGids(): number[] {
    return Array.from(this.rawState.sheets.keys());
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
    const { sheetGid, rowIndex } = this.schema.idsFromSheetRowId(sheetRowId);
    return this.sheet(sheetGid).row(rowIndex);
  }
  ensureAllSheetPropertiesAreFetched() {
    if (!this.rawState.allSheetPropertiesAreFetched) {
      this.fetchAllSheetProperties();
    }
  }
  fetchAllSheetProperties() {
    const data = this.sheetsService.Spreadsheets.get(this.spreadsheetId, {
      fields: "sheets(properties(sheetId,title),tables(tableId,range))",
    });
    this._addDataToState(data);
    this.rawState.allSheetPropertiesAreFetched = true;
    return { activeSheetGids: this.activeSheetGids };
  }
  fetchAllGathered(includeProgrammaticFacts = false): void {
    const data = this._fetchByDataFilter(includeProgrammaticFacts);
    this._addDataToState(data);
    this._finalizeGatheredFetches();
    this.rawState.fetcherGridRanges = [];
  }
  // Backfills cells for every full row/column fetched this cycle so a
  // Sheets response that omits empty cells (or whole blank rows) never
  // leaves them looking merely "not yet fetched" to callers.
  private _finalizeGatheredFetches(): void {
    const missingTables: { sheetGid: number; title: string | null }[] = [];
    this.rawState.sheets.forEach((state, sheetGid) => {
      if (
        state.rowIndexesToFinalize.size === 0 &&
        state.colIndexesToFinalize.size === 0
      ) {
        return;
      }
      if (state.activeTable === null) {
        missingTables.push({ sheetGid, title: state.title });
        return;
      }
      const sheet = this.sheet(sheetGid);
      state.rowIndexesToFinalize.forEach((rowIndex) => {
        sheet.row(rowIndex).ensureFullActiveDataCells();
      });
      state.colIndexesToFinalize.forEach((colIndex) => {
        sheet.data.column(colIndex).ensureFullActiveDataCells();
      });
      state.rowIndexesToFinalize.clear();
      state.colIndexesToFinalize.clear();
    });
    if (missingTables.length > 0) {
      const names = missingTables
        .map(({ sheetGid, title }) => `"${title ?? "(untitled)"}" (gid ${sheetGid})`)
        .join(", ");
      throw new Error(
        `${missingTables.length} sheet(s) need a full row/column fetch but have no Table object — apply Insert > Table over their data range in Sheets: ${names}`,
      );
    }
  }
  // isFormula/numberFormatType (from rowData.values.userEnteredValue/
  // effectiveFormat) and columnValidationValues (from tables.columnProperties
  // .dataValidationRule) are read only by ColumnConfigOperator's programmatic
  // value correction — every other caller only ever needs effectiveValue, so
  // those fields are left out of the default fetch to avoid fetching them
  // (and, for dataValidationRule, an unbounded list of validation values)
  // wastefully on every ordinary read.
  private _fetchByDataFilter(
    includeProgrammaticFacts: boolean,
  ): GoogleSpreadsheet {
    const withProgrammaticFacts =
      "sheets(" +
      "properties(sheetId,title)," +
      "tables(tableId,range,columnProperties(columnIndex,dataValidationRule(condition(values(userEnteredValue)))))," +
      "data(startColumn,startRow,columnMetadata,rowData(values(effectiveValue,userEnteredValue,effectiveFormat(numberFormat(type)))))" +
      ")";
    const withoutProgrammaticFacts =
      "sheets(" +
      "properties(sheetId,title)," +
      "tables(tableId,range)," +
      "data(startColumn,startRow,columnMetadata,rowData(values(effectiveValue)))" +
      ")";
    return this.sheetsService.Spreadsheets.getByDataFilter(
      this._makeFetchResource(),
      this.spreadsheetId,
      {
        fields: includeProgrammaticFacts
          ? withProgrammaticFacts
          : withoutProgrammaticFacts,
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
    Val.assert(gss.sheets, "gss.sheets").forEach((gSheet) => {
      const properties = Val.assert(gSheet.properties, "gSheet.properties");
      const sheetGid = Val.assert(properties.sheetId, "sheetId");
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
        row.cell(colIndex).gatherUpdateRequest();
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
      ...this._deleteRequestsDescending(),
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
  // Deletes within one batchUpdate apply sequentially and each shifts the
  // row indices below it, so same-sheet deletes must go highest-index-first
  // or a later request's pre-computed startIndex lands on the wrong row.
  private _deleteRequestsDescending(): GoogleUpdateRequest[] {
    return [...this.rawState.updateRequests.delete].sort(
      (a, b) => this._deleteRequestStartIndex(b) - this._deleteRequestStartIndex(a),
    );
  }
  private _deleteRequestStartIndex(request: GoogleUpdateRequest): number {
    return Val.assert(
      request.deleteDimension?.range?.startIndex,
      "deleteDimension.range.startIndex",
    );
  }
}
