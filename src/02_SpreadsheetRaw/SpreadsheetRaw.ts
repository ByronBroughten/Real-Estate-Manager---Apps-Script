import type {
  GoogleSpreadsheet,
  GoogleUpdateRequest,
} from "../00_base/AppsScriptTypes";
import { Val } from "../utils/Val";
import { SpreadsheetRawBase } from "./ClassBases/SpreadsheetRawBase";
import type {
  FindReplaceProps,
  RawSheetState,
  RowChangesToSave,
  SheetChangesToSave,
} from "./ClassTypes/RawState";
import type { RowCommonRaw } from "./ClassBases/RowCommonRaw";
import { SheetMetaRaw } from "./SheetMetaRaw";
import { SheetRaw } from "./SheetRaw";

interface SheetIdentity {
  sheetGid: number;
}
interface MisplacedTable extends SheetIdentity {
  startRowIndex: number;
  startColumnIndex: number;
}

/**
 * Spreadsheet-level Raw: GID+index fetch and the two Sheets chokepoints
 * (`fetchAllGathered`, `_sendUpdateRequests`). Sheet/row/column by index
 * live on SheetRaw / RowRaw / ColumnRaw in this folder.
 * Column-by-name and columnId resolution are Indexed/Named.
 * Schema classes that resolve columns share SpreadsheetSchema.ts here
 * because they must sit below both consumer tiers.
 * docs/architecture/round-trips.md, schema-classes.md, class-chains.md
 */
export class SpreadsheetRaw extends SpreadsheetRawBase {
  static init(): SpreadsheetRaw {
    return new SpreadsheetRaw(SpreadsheetRawBase.initSpreadsheetRawProps());
  }
  private get sheetsService(): GoogleAppsScript.Sheets {
    return Val.assert(Sheets, "Sheets (enable the Advanced Sheets Service)");
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
  sheetMeta(sheetGid: number): SheetMetaRaw {
    return new SheetMetaRaw({
      rawState: this.rawState,
      sheetGid: sheetGid,
    });
  }
  sheets(...sheetGids: number[]): SheetRaw[] {
    return sheetGids.map((sheetGid) => this.sheet(sheetGid));
  }
  rowBySheetRowId(sheetRowId: string): RowCommonRaw {
    const { sheetGid, rowIndex } = this.schema.idsFromSheetRowId(sheetRowId);
    return this.sheet(sheetGid).rowCommon(rowIndex);
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
    // An empty dataFilters list would fetch the whole spreadsheet's grid data.
    if (this.fetcherGridRanges.length === 0) return;
    const data = this._fetchByDataFilter(includeProgrammaticFacts);
    this._addDataToState(data);
    this._finalizeGatheredFetches();
    this.rawState.fetcherGridRanges = [];
  }
  // Backfills cells for every full row/column fetched this cycle so a
  // Sheets response that omits empty cells (or whole blank rows) never
  // leaves them looking merely "not yet fetched" to callers.
  private _finalizeGatheredFetches(): void {
    const misplacedTables: MisplacedTable[] = [];
    const absentTables: SheetIdentity[] = [];
    this.rawState.sheets.forEach((state, sheetGid) => {
      // Above the early return, so a range that arrived incidentally is still judged.
      const misplacedTable = this._misplacedTable(sheetGid);
      if (misplacedTable !== null) {
        misplacedTables.push(misplacedTable);
        return;
      }
      if (
        state.rowIndexesToFinalize.size === 0 &&
        state.colIndexesToFinalize.size === 0
      ) {
        return;
      }
      if (state.activeTable === null) {
        absentTables.push({ sheetGid });
        return;
      }
      const sheet = this.sheet(sheetGid);
      if (state.rowIndexesToFinalize.has(this.schema.colIdRowIndex)) {
        state.hasFetchedColumnIds = true;
      }
      state.rowIndexesToFinalize.forEach((rowIndex) => {
        sheet.rowCommon(rowIndex).ensureFullActiveDataCells();
      });
      state.colIndexesToFinalize.forEach((colIndex) => {
        sheet.column(colIndex).ensureFullActiveDataCells();
      });
      this._ensureFetchedActiveFacts(sheet, state);
      state.rowIndexesToFinalize.clear();
      state.colIndexesToFinalize.clear();
    });
    this._reportTablePlacement(misplacedTables, absentTables);
  }
  // After the backfills above, so a blank fact is sampled rather than built.
  private _ensureFetchedActiveFacts(
    sheet: SheetRaw,
    state: RawSheetState,
  ): void {
    if (state.rowIndexesToFinalize.has(this.schema.topDataRowIdx)) {
      sheet.meta.ensureTableColumnsActiveFacts();
    }
    state.colIndexesToFinalize.forEach((colIndex) => {
      if (!sheet.isTableColIndex(colIndex)) return;
      sheet.meta.column(colIndex).ensureActiveFacts();
    });
  }
  // A sheet outside the config never promised to follow the layout.
  private _misplacedTable(sheetGid: number): MisplacedTable | null {
    const state = this.rawState.sheets.get(sheetGid);
    const table = state?.activeTable;
    if (!state || !table || !this.schema.isInSheetGids(sheetGid)) {
      return null;
    }
    const { startRowIndex, startColumnIndex } = table;
    if (this.schema.isTableStart(startRowIndex, startColumnIndex)) {
      return null;
    }
    return { sheetGid, startRowIndex, startColumnIndex };
  }
  private _reportTablePlacement(
    misplacedTables: MisplacedTable[],
    absentTables: SheetIdentity[],
  ): void {
    if (misplacedTables.length === 0 && absentTables.length === 0) return;
    if (absentTables.length > 0) {
      // The probe is built from the constants under test, so a moved Table looks absent.
      this.ensureAllSheetPropertiesAreFetched();
    }
    const allMisplaced = [...misplacedTables];
    const stillAbsent: SheetIdentity[] = [];
    absentTables.forEach((absentTable) => {
      const movedTable = this._misplacedTable(absentTable.sheetGid);
      if (movedTable === null) {
        stillAbsent.push(absentTable);
      } else {
        allMisplaced.push(movedTable);
      }
    });
    const sentences: string[] = [];
    if (allMisplaced.length > 0) {
      sentences.push(this._misplacedTableSentence(allMisplaced));
    }
    if (stillAbsent.length > 0) {
      sentences.push(this._absentTableSentence(stillAbsent));
    }
    throw new Error(sentences.join(" "));
  }
  private _misplacedTableSentence(misplacedTables: MisplacedTable[]): string {
    const positions = misplacedTables
      .map(
        (misplacedTable) =>
          `${this._sheetLabel(misplacedTable)} starts at ${this.schema.positionLabel(
            misplacedTable.startRowIndex,
            misplacedTable.startColumnIndex,
          )} but must start at ${this.schema.tableStartLabel}`,
      )
      .join("; ");
    return `${misplacedTables.length} sheet(s) have a Table that does not start where the layout requires — move each Table to where it must start, and do not rebuild it: ${positions}`;
  }
  private _absentTableSentence(absentTables: SheetIdentity[]): string {
    const names = absentTables
      .map((absentTable) => this._sheetLabel(absentTable))
      .join(", ");
    return `${absentTables.length} sheet(s) need a full row/column fetch but have no Table object — apply Insert > Table over their data range in Sheets: ${names}`;
  }
  private _sheetLabel({ sheetGid }: SheetIdentity): string {
    return this.sheet(sheetGid).sheetLabel;
  }
  // isFormula/numberFormatType (from rowData.values.userEnteredValue/
  // effectiveFormat) and columnValidationValues/columnDeclaredTypes (from
  // tables.columnProperties) are read only by ColumnConfigOperator's
  // programmatic value correction — every other caller only ever needs effectiveValue, so
  // those fields are left out of the default fetch to avoid fetching them
  // (and, for dataValidationRule, an unbounded list of validation values)
  // wastefully on every ordinary read.
  private _fetchByDataFilter(
    includeProgrammaticFacts: boolean,
  ): GoogleSpreadsheet {
    const withProgrammaticFacts =
      "sheets(" +
      "properties(sheetId,title)," +
      "tables(tableId,range,columnProperties(columnIndex,columnType,dataValidationRule(condition(values(userEnteredValue)))))," +
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
    const sheetGidsWithRowDeletes = this._sheetGidsWithRowDeletes();
    const hasFindReplace = this.updateRequests.findReplace.length > 0;
    this._sendUpdateRequests();
    // Row indexes only actually shift once the deletes have been sent.
    sheetGidsWithRowDeletes.forEach((sheetGid) =>
      this.sheet(sheetGid).invalidateRowIndexes(),
    );
    if (hasFindReplace) this._invalidateFetchedCellState();
  }
  // Matches by content rather than by coordinate, so no local mirror is possible.
  findReplace({ scope, ...terms }: FindReplaceProps): this {
    this.updateRequests.findReplace.push({
      findReplace: { ...terms, ...scope },
    });
    return this;
  }
  // Scope can be allSheets, so one rule: every sheet's fetched cells go stale.
  private _invalidateFetchedCellState(): void {
    this.rawSheetsState.forEach((_, sheetGid) =>
      this.sheet(sheetGid).invalidateCellState(),
    );
  }
  // The one bypass of the type layer; using it obliges filing an issue (README).
  gatherRawRequest(request: GoogleUpdateRequest): this {
    this.updateRequests.raw.push(request);
    return this;
  }
  // Abandons queued writes while local state still reflects them — terminal step only.
  discardQueuedChanges(): this {
    this.rawState.changesToSave = new Map();
    this.rawState.updateRequests = SpreadsheetRaw.initSortedUpdateRequests();
    return this;
  }
  private _sheetGidsWithRowDeletes(): Set<number> {
    return new Set(
      this.updateRequests.delete.map((request) =>
        Val.assert(
          request.deleteDimension?.range?.sheetId,
          "deleteDimension.range.sheetId",
        ),
      ),
    );
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
    } else {
      const row = this.rowBySheetRowId(sheetRowId);
      if (change.append) {
        row.gatherAppendRequest();
      }
      for (const [colIndex, cellChange] of change.update) {
        row.cell(colIndex).gatherUpdateRequest(cellChange);
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
    change.fills.forEach((fill) => {
      this.sheet(sheetRowId).gatherFillRequest(fill);
    });
  }
  private _sendUpdateRequests() {
    const surs = this.rawState.updateRequests;
    const requests = [
      ...surs.append,
      ...surs.insertColumn,
      // Fills go before updates, so a per-cell write on a filled column wins.
      ...surs.fill,
      ...surs.update,
      // Reads the text as it stands mid-batch, so it must follow what writes it.
      ...surs.findReplace,
      ...this._deleteRequestsDescending(),
      ...surs.sort,
      // Outside the ordering rules the queue was built around, so last.
      ...surs.raw,
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
      (a, b) =>
        this._deleteRequestStartIndex(b) - this._deleteRequestStartIndex(a),
    );
  }
  private _deleteRequestStartIndex(request: GoogleUpdateRequest): number {
    return Val.assert(
      request.deleteDimension?.range?.startIndex,
      "deleteDimension.range.startIndex",
    );
  }
}
