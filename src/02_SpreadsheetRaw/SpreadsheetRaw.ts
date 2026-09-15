import type { OpaqueRawRequest } from "../00_base/GoogleSheetsAPI";
import type { GridFetchRange, SpreadsheetSnapshot } from "../00_base/RawSource";
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
interface TablePlacementObservations {
  misplacedTables: MisplacedTable[];
  absentTables: SheetIdentity[];
}
type TablePlacement =
  | { kind: "extra" }
  | (MisplacedTable & { kind: "misplaced" })
  | { kind: "none" }
  | { kind: "well-placed" };

/**
 * Spreadsheet-level Raw: GID+index fetch and the two Sheets chokepoints
 * (`fetchAllGathered` / `fetchSheetUsedGrid` via RawSource.fetchGrid,
 * `fetchAllSheetProperties` via RawSource.fetchSheetProperties,
 * `_sendUpdateRequests` via RawSource.flush). Sheet/row/column by index
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
      this._fetchAndIntegrateAllSheetProperties();
    }
  }
  fetchAllSheetProperties() {
    this._fetchAndIntegrateAllSheetProperties();
    this._reportTablePlacement({ misplacedTables: [], absentTables: [] });
    return { activeSheetGids: this.activeSheetGids };
  }
  private _fetchAndIntegrateAllSheetProperties() {
    const data = this.rawState.rawSource.fetchSheetProperties(this.spreadsheetId);
    this._addDataToState(data);
    this.rawState.allSheetPropertiesAreFetched = true;
  }
  fetchAllGathered(includeProgrammaticFacts = false): void {
    // An empty dataFilters list would fetch the whole spreadsheet's grid data.
    if (this.fetcherGridRanges.length === 0) return;
    const data = this._fetchByGridRanges(includeProgrammaticFacts);
    this._addDataToState(data);
    this._finalizeGatheredFetches();
    this.rawState.fetcherGridRanges = [];
  }
  // One sheet by GID without Table-placement finalize, so a moved Table can wait for overlay.
  fetchSheetUsedGrid(sheetGid: number): void {
    const data = this._fetchByGridRanges(false, [{ sheetId: sheetGid }]);
    const sheets = data.sheets.filter((sheet) => sheet.sheetGid === sheetGid);
    if (sheets.length === 0) {
      throw new Error(
        `Sheet gid ${sheetGid} was missing from the Sheets get.`,
      );
    }
    this._addDataToState({ sheets });
  }
  // A sheet outside the config never promised to follow the layout.
  private _tablePlacement(sheetGid: number): TablePlacement {
    const state = this.rawState.sheets.get(sheetGid);
    if (!state) {
      return { kind: "none" };
    }
    if (state.hasExtraTables) {
      return { kind: "extra" };
    }
    if (state.knownTable === null || !this.schema.isInSheetGids(sheetGid)) {
      return { kind: "none" };
    }
    const { startRowIndex, startColumnIndex } = this.sheet(sheetGid).activeTable;
    if (this.schema.isTableStart(startRowIndex, startColumnIndex)) {
      return { kind: "well-placed" };
    }
    return { kind: "misplaced", sheetGid, startRowIndex, startColumnIndex };
  }
  // Backfills cells for every range fetched this cycle so a Sheets
  // response that omits empty cells (or whole blank rows) never leaves
  // them looking merely "not yet fetched" to callers.
  private _finalizeGatheredFetches(): void {
    const misplacedTables: MisplacedTable[] = [];
    const absentTables: SheetIdentity[] = [];
    this.rawState.sheets.forEach((state, sheetGid) => {
      // Above the early return, so a range that arrived incidentally is still judged.
      const placement = this._tablePlacement(sheetGid);
      if (placement.kind === "extra") {
        return;
      }
      if (placement.kind === "misplaced") {
        misplacedTables.push(placement);
        return;
      }
      const sheet = this.sheet(sheetGid);
      this._finalizeFetchedCells(sheet, state);
      if (
        state.rowIndexesToFinalize.size === 0 &&
        state.colIndexesToFinalize.size === 0
      ) {
        return;
      }
      if (state.knownTable === null) {
        absentTables.push({ sheetGid });
        return;
      }
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
    this._reportTablePlacement({ misplacedTables, absentTables });
  }
  private _finalizeFetchedCells(sheet: SheetRaw, state: RawSheetState): void {
    state.cellsToFinalize.forEach((colIndexes, rowIndex) => {
      const row = sheet.rowCommon(rowIndex);
      row.ensureStateExists();
      colIndexes.forEach((colIndex) => {
        row.cell(colIndex).ensureActive();
      });
    });
    state.cellsToFinalize.clear();
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
  private _reportTablePlacement({
    misplacedTables,
    absentTables,
  }: TablePlacementObservations): void {
    if (absentTables.length > 0) {
      // The probe is built from the constants under test, so a moved Table looks absent.
      this.ensureAllSheetPropertiesAreFetched();
    }
    const reclassified = this._reclassifyAbsentTables({
      misplacedTables,
      absentTables,
    });
    const extraTables = this._sheetsWithExtraTables();
    if (
      reclassified.misplacedTables.length === 0 &&
      reclassified.absentTables.length === 0 &&
      extraTables.length === 0
    ) {
      return;
    }
    const sentences: string[] = [];
    if (reclassified.misplacedTables.length > 0) {
      sentences.push(this._misplacedTableSentence(reclassified.misplacedTables));
    }
    if (reclassified.absentTables.length > 0) {
      sentences.push(this._absentTableSentence(reclassified.absentTables));
    }
    if (extraTables.length > 0) {
      sentences.push(this._extraTablesSentence(extraTables));
    }
    throw new Error(sentences.join(" "));
  }
  private _reclassifyAbsentTables({
    misplacedTables,
    absentTables,
  }: TablePlacementObservations): TablePlacementObservations {
    const stillMisplaced = [...misplacedTables];
    const stillAbsent: SheetIdentity[] = [];
    absentTables.forEach((absentTable) => {
      const placement = this._tablePlacement(absentTable.sheetGid);
      if (placement.kind === "extra") {
        return;
      }
      if (placement.kind === "misplaced") {
        stillMisplaced.push(placement);
        return;
      }
      stillAbsent.push(absentTable);
    });
    return { misplacedTables: stillMisplaced, absentTables: stillAbsent };
  }
  private _sheetsWithExtraTables(): SheetIdentity[] {
    const extraTables: SheetIdentity[] = [];
    this.rawState.sheets.forEach((state, sheetGid) => {
      if (!state.hasExtraTables || !this.schema.isInSheetGids(sheetGid)) {
        return;
      }
      extraTables.push({ sheetGid });
    });
    return extraTables;
  }
  private _extraTablesSentence(extraTables: SheetIdentity[]): string {
    const names = extraTables
      .map((extraTable) => this._sheetLabel(extraTable))
      .join(", ");
    return `${extraTables.length} sheet(s) have more than one Table — delete the extras so each sheet has exactly one: ${names}`;
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
  private _fetchByGridRanges(
    includeProgrammaticFacts: boolean,
    gridRanges: GridFetchRange[] = this.fetcherGridRanges,
  ): SpreadsheetSnapshot {
    return this.rawState.rawSource.fetchGrid(this.spreadsheetId, gridRanges, {
      includeProgrammaticFacts,
    });
  }
  private _addDataToState(snapshot: SpreadsheetSnapshot) {
    snapshot.sheets.forEach((sheetSnapshot) => {
      const sheet = this.sheet(sheetSnapshot.sheetGid);
      sheet.integrateSheetState(sheetSnapshot);
    });
  }
  batchUpdateGSheets() {
    this._gatherUpdateRequests();
    const sheetGidsWithRowDeletes = this._sheetGidsWithRowDeletes();
    const hasFindReplace = this.updateRequests.findReplace.length > 0;
    this._sendUpdateRequests();
    // Row indexes only actually shift once the deletes have been sent.
    sheetGidsWithRowDeletes.forEach((sheetGid) =>
      this.sheet(sheetGid).markRowIndexesStale(),
    );
    if (hasFindReplace) this._invalidateFetchedCellState();
  }
  // Matches by content rather than by coordinate, so no local mirror is possible.
  findReplace({ scope, ...terms }: FindReplaceProps): this {
    this.updateRequests.findReplace.push({
      kind: "findReplace",
      terms,
      scope,
    });
    return this;
  }
  // The one bypass of the type layer; using it obliges filing an issue (README).
  gatherRawRequest(request: OpaqueRawRequest): this {
    this.updateRequests.raw.push({ kind: "raw", request });
    return this;
  }
  // Scope can be allSheets, so one rule: every sheet's fetched cells go stale.
  private _invalidateFetchedCellState(): void {
    this.rawSheetsState.forEach((_, sheetGid) =>
      this.sheet(sheetGid).invalidateCellState(),
    );
  }
  // Abandons queued writes while local state still reflects them — terminal step only.
  discardQueuedChanges(): this {
    this.rawState.changesToSave = new Map();
    this.rawState.updateRequests = SpreadsheetRaw.initSortedUpdateRequests();
    return this;
  }
  private _sheetGidsWithRowDeletes(): Set<number> {
    return new Set(
      this.updateRequests.delete.map((operation) => {
        if (operation.kind !== "deleteRows") {
          throw new Error("Queued delete is not a deleteRows operation.");
        }
        return operation.sheetId;
      }),
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
      const { sheetGid, rowIndex } = this.schema.idsFromSheetRowId(sheetRowId);
      this.updateRequests.delete.push({
        kind: "deleteRows",
        sheetId: sheetGid,
        startIndex: rowIndex,
        endIndex: rowIndex + 1,
      });
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
    const operations = [
      ...surs.append,
      ...surs.insertColumn,
      // Fills go before updates, so a per-cell write on a filled column wins.
      ...surs.fill,
      ...surs.update,
      // Reads the text as it stands mid-batch, so it must follow what writes it.
      ...surs.findReplace,
      ...this._deleteOperationsDescending(),
      ...surs.sort,
      // Outside the ordering rules the queue was built around, so last.
      ...surs.raw,
    ];
    this.rawState.rawSource.flush(this.spreadsheetId, operations);
    this.rawState.updateRequests = SpreadsheetRaw.initSortedUpdateRequests();
  }
  // Deletes within one batchUpdate apply sequentially and each shifts the
  // row indices below it, so same-sheet deletes must go highest-index-first
  // or a later request's pre-computed startIndex lands on the wrong row.
  private _deleteOperationsDescending() {
    return [...this.rawState.updateRequests.delete].sort((a, b) => {
      if (a.kind !== "deleteRows" || b.kind !== "deleteRows") {
        throw new Error("Queued delete is not a deleteRows operation.");
      }
      return b.startIndex - a.startIndex;
    });
  }
}
