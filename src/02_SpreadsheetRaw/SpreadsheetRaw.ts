import type { OpaqueRawRequest } from "../00_base/GoogleSheetsAPI";
import type { GridFetchRange, SpreadsheetSnapshot } from "../00_base/RawSource";
import { SpreadsheetBaseRaw } from "./ClassBases/SpreadsheetBaseRaw";
import {
  emptySheetChanges,
  emptySheetWriteQueue,
  emptySpreadsheetWriteQueue,
  emptyUpdateRequests,
  type FindReplaceProps,
  type RowChangesToSave,
  type SheetChangesToSave,
  type SheetStateRaw,
} from "./ClassTypes/StateRaw";
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

interface SheetRowRef {
  sheetGid: number;
  rowIndex: number;
}

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
export class SpreadsheetRaw extends SpreadsheetBaseRaw {
  static init(): SpreadsheetRaw {
    return new SpreadsheetRaw(SpreadsheetBaseRaw.initSpreadsheetRawProps());
  }
  gidIsActive(sheetGid: number): boolean {
    return this.activeSheetGids.includes(sheetGid);
  }
  get activeSheetGids(): number[] {
    return Array.from(this.spreadsheetStateRaw.sheets.keys());
  }
  get activeSheets(): SheetRaw[] {
    return Array.from(this.activeSheetGids, (sheetGid) => this.sheet(sheetGid));
  }
  sheet(sheetGid: number): SheetRaw {
    return new SheetRaw({
      spreadsheetStateRaw: this.spreadsheetStateRaw,
      sheetGid: sheetGid,
    });
  }
  sheetMeta(sheetGid: number): SheetMetaRaw {
    return new SheetMetaRaw({
      spreadsheetStateRaw: this.spreadsheetStateRaw,
      sheetGid: sheetGid,
    });
  }
  sheets(...sheetGids: number[]): SheetRaw[] {
    return sheetGids.map((sheetGid) => this.sheet(sheetGid));
  }
  ensureAllSheetPropertiesAreFetched() {
    if (!this.spreadsheetStateRaw.allSheetPropertiesAreFetched) {
      this._fetchAndIntegrateAllSheetProperties();
    }
  }
  fetchAllSheetProperties() {
    this._fetchAndIntegrateAllSheetProperties();
    this._reportTablePlacement({ misplacedTables: [], absentTables: [] });
    return { activeSheetGids: this.activeSheetGids };
  }
  private _fetchAndIntegrateAllSheetProperties() {
    const data = this.spreadsheetStateRaw.rawSource.fetchSheetProperties(
      this.spreadsheetId,
    );
    this._addDataToState(data);
    this.spreadsheetStateRaw.allSheetPropertiesAreFetched = true;
  }
  fetchAllGathered(includeProgrammaticFacts = false): void {
    this._fetchGatheredConditionalFormatRules();
    this._fetchGatheredProtectedRanges();
    // An empty dataFilters list would fetch the whole spreadsheet's grid data.
    if (this.fetcherGridRanges.length === 0) return;
    const data = this._fetchByGridRanges(includeProgrammaticFacts);
    this._addDataToState(data);
    this._finalizeGatheredFetches();
    this.spreadsheetStateRaw.fetchQueue.gridRanges = [];
  }
  // One sheet by GID without Table-placement finalize, so a moved Table can wait for overlay.
  fetchSheetUsedGrid(sheetGid: number): void {
    const data = this._fetchByGridRanges(false, [{ sheetId: sheetGid }]);
    const sheets = data.sheets.filter((sheet) => sheet.sheetGid === sheetGid);
    if (sheets.length === 0) {
      throw new Error(`Sheet gid ${sheetGid} was missing from the Sheets get.`);
    }
    this._addDataToState({ sheets });
  }
  // A sheet outside the config never promised to follow the layout.
  private _tablePlacement(sheetGid: number): TablePlacement {
    const state = this.spreadsheetStateRaw.sheets.get(sheetGid);
    if (!state) {
      return { kind: "none" };
    }
    if (state.working.hasExtraTables) {
      return { kind: "extra" };
    }
    if (
      state.working.knownTable === null ||
      !this.schema.isInSheetGids(sheetGid)
    ) {
      return { kind: "none" };
    }
    const { startRowIndex, startColumnIndex } =
      this.sheet(sheetGid).activeTable;
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
    this.spreadsheetStateRaw.sheets.forEach((state, sheetGid) => {
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
      const toFinalize = state.fetchQueue.toFinalize;
      this._finalizeFetchedCells(sheet, state);
      if (toFinalize.rows.size === 0 && toFinalize.columns.size === 0) {
        return;
      }
      if (state.working.knownTable === null) {
        absentTables.push({ sheetGid });
        return;
      }
      if (toFinalize.rows.has(this.schema.colIdRowIndex)) {
        state.working.hasFetchedColumnIds = true;
      }
      toFinalize.rows.forEach((rowIndex) => {
        sheet.rowCommon(rowIndex).ensureFullActiveDataCells();
      });
      toFinalize.columns.forEach((colIndex) => {
        sheet.column(colIndex).ensureFullActiveDataCells();
      });
      this._ensureFetchedActiveFacts(sheet, state);
      toFinalize.rows.clear();
      toFinalize.columns.clear();
    });
    this._reportTablePlacement({ misplacedTables, absentTables });
  }
  private _finalizeFetchedCells(sheet: SheetRaw, state: SheetStateRaw): void {
    state.fetchQueue.toFinalize.cells.forEach((colIndexes, rowIndex) => {
      const row = sheet.rowCommon(rowIndex);
      row.ensureStateExists();
      colIndexes.forEach((colIndex) => {
        row.cell(colIndex).ensureActive();
      });
    });
    state.fetchQueue.toFinalize.cells.clear();
  }
  // After the backfills above, so a blank fact is sampled rather than built.
  private _ensureFetchedActiveFacts(
    sheet: SheetRaw,
    state: SheetStateRaw,
  ): void {
    if (state.fetchQueue.toFinalize.rows.has(this.schema.topDataRowIdx)) {
      sheet.meta.ensureTableColumnsActiveFacts();
    }
    state.fetchQueue.toFinalize.columns.forEach((colIndex) => {
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
      sentences.push(
        this._misplacedTableSentence(reclassified.misplacedTables),
      );
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
    this.spreadsheetStateRaw.sheets.forEach((state, sheetGid) => {
      if (
        !state.working.hasExtraTables ||
        !this.schema.isInSheetGids(sheetGid)
      ) {
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
  // effectiveFormat) and column validation values/declared types (from
  // tables.columnProperties) are read only by ColumnConfigOperator's
  // programmatic value correction — every other caller only ever needs effectiveValue, so
  // those fields are left out of the default fetch to avoid fetching them
  // (and, for dataValidationRule, an unbounded list of validation values)
  // wastefully on every ordinary read.
  private _fetchByGridRanges(
    includeProgrammaticFacts: boolean,
    gridRanges: GridFetchRange[] = this.fetcherGridRanges,
  ): SpreadsheetSnapshot {
    return this.spreadsheetStateRaw.rawSource.fetchGrid(
      this.spreadsheetId,
      gridRanges,
      {
        includeProgrammaticFacts,
      },
    );
  }
  private _fetchGatheredConditionalFormatRules(): void {
    const gatheringGids = Array.from(this.sheetsStateRaw.entries())
      .filter(([, state]) => state.fetchQueue.gatherConditionalFormats)
      .map(([sheetGid]) => sheetGid);
    if (gatheringGids.length === 0) return;
    this.spreadsheetStateRaw.rawSource
      .fetchConditionalFormatRules(this.spreadsheetId)
      .filter(({ sheetGid }) => gatheringGids.includes(sheetGid))
      .forEach(({ sheetGid, rules }) =>
        this.sheet(sheetGid).integrateConditionalFormatRules(rules),
      );
  }
  private _fetchGatheredProtectedRanges(): void {
    const gatheringGids = Array.from(this.sheetsStateRaw.entries())
      .filter(([, state]) => state.fetchQueue.gatherProtectedRanges)
      .map(([sheetGid]) => sheetGid);
    if (gatheringGids.length === 0) return;
    this.spreadsheetStateRaw.rawSource
      .fetchProtectedRanges(this.spreadsheetId)
      .filter(({ sheetGid }) => gatheringGids.includes(sheetGid))
      .forEach(({ sheetGid, protections }) =>
        this.sheet(sheetGid).integrateProtectedRanges(protections),
      );
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
    const sheetGidsWithConditionalFormatMutations =
      this._sheetGidsWithConditionalFormatMutations();
    const sheetGidsWithProtectedRangeMutations =
      this._sheetGidsWithProtectedRangeMutations();
    const hasFindReplace = this.updateRequests.findReplace.length > 0;
    this._sendUpdateRequests();
    // Row indexes only actually shift once the deletes have been sent.
    sheetGidsWithRowDeletes.forEach((sheetGid) =>
      this.sheet(sheetGid).markRowIndexesStale(),
    );
    sheetGidsWithConditionalFormatMutations.forEach((sheetGid) =>
      this.sheet(sheetGid).markConditionalFormatIndexesStale(),
    );
    sheetGidsWithProtectedRangeMutations.forEach((sheetGid) =>
      this.sheet(sheetGid).markProtectedRangesStale(),
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
    this.sheetsStateRaw.forEach((_, sheetGid) =>
      this.sheet(sheetGid).invalidateCellState(),
    );
  }
  // Abandons queued writes while local state still reflects them — terminal step only.
  discardQueuedChanges(): this {
    this.spreadsheetStateRaw.writeQueue = emptySpreadsheetWriteQueue();
    this.sheetsStateRaw.forEach((state) => {
      state.writeQueue = emptySheetWriteQueue();
    });
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
    this.sheetsStateRaw.forEach((state, sheetGid) => {
      this._gatherSheetRequests(sheetGid, state.writeQueue.sheet);
      for (const [rowIndex, change] of state.writeQueue.rows) {
        this._gatherRowRequests(change, { sheetGid, rowIndex });
      }
      state.writeQueue.sheet = emptySheetChanges();
      state.writeQueue.rows = new Map();
    });
  }
  private _gatherRowRequests(
    change: RowChangesToSave,
    { sheetGid, rowIndex }: SheetRowRef,
  ) {
    if (change.append && change.delete) {
      return;
    } else if (change.delete) {
      this.updateRequests.delete.push({
        kind: "deleteRows",
        sheetId: sheetGid,
        startIndex: rowIndex,
        endIndex: rowIndex + 1,
      });
    } else {
      const row = this.sheet(sheetGid).rowCommon(rowIndex);
      if (change.append) {
        row.gatherAppendRequest();
      }
      for (const [colIndex, cellChange] of change.update) {
        row.cell(colIndex).gatherUpdateRequest(cellChange);
      }
    }
  }
  private _gatherSheetRequests(sheetGid: number, change: SheetChangesToSave) {
    if (change.insertColumn !== null) {
      this.sheet(sheetGid).gatherInsertColumnRequest(change.insertColumn);
    }
    if (change.sort !== null) {
      this.sheet(sheetGid).gatherSortRequest(change.sort);
    }
    change.fills.forEach((fill) => {
      this.sheet(sheetGid).gatherFillRequest(fill);
    });
  }
  private _sheetGidsWithConditionalFormatMutations(): Set<number> {
    const sheetGids = new Set<number>();
    this.updateRequests.deleteConditionalFormat.forEach((operation) => {
      if (operation.kind !== "deleteConditionalFormatRule") {
        throw new Error(
          "Queued deleteConditionalFormat is not a deleteConditionalFormatRule operation.",
        );
      }
      sheetGids.add(operation.sheetId);
    });
    this.updateRequests.addConditionalFormat.forEach((operation) => {
      if (operation.kind !== "addConditionalFormatRule") {
        throw new Error(
          "Queued addConditionalFormat is not an addConditionalFormatRule operation.",
        );
      }
      const sheetId = operation.rule.ranges[0]?.sheetId;
      if (sheetId === undefined) {
        throw new Error(
          "Queued addConditionalFormatRule has no range sheetId.",
        );
      }
      sheetGids.add(sheetId);
    });
    return sheetGids;
  }
  private _sheetGidsWithProtectedRangeMutations(): Set<number> {
    const sheetGids = new Set<number>();
    this.updateRequests.deleteProtectedRange.forEach((operation) => {
      if (operation.kind !== "deleteProtectedRange") {
        throw new Error(
          "Queued deleteProtectedRange is not a deleteProtectedRange operation.",
        );
      }
      sheetGids.add(operation.sheetId);
    });
    this.updateRequests.addProtectedRange.forEach((operation) => {
      if (operation.kind !== "addProtectedRange") {
        throw new Error(
          "Queued addProtectedRange is not an addProtectedRange operation.",
        );
      }
      sheetGids.add(operation.protection.range.sheetId);
    });
    return sheetGids;
  }
  private _sendUpdateRequests() {
    const surs = this.spreadsheetStateRaw.writeQueue.updateRequests;
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
      ...this._deleteConditionalFormatOperationsDescending(),
      ...surs.addConditionalFormat,
      ...surs.deleteProtectedRange,
      ...surs.addProtectedRange,
      // Outside the ordering rules the queue was built around, so last.
      ...surs.raw,
    ];
    this.spreadsheetStateRaw.rawSource.flush(this.spreadsheetId, operations);
    this.spreadsheetStateRaw.writeQueue.updateRequests = emptyUpdateRequests();
  }
  // Deletes within one batchUpdate apply sequentially and each shifts the
  // row indices below it, so same-sheet deletes must go highest-index-first
  // or a later request's pre-computed startIndex lands on the wrong row.
  private _deleteOperationsDescending() {
    return [...this.spreadsheetStateRaw.writeQueue.updateRequests.delete].sort(
      (a, b) => {
        if (a.kind !== "deleteRows" || b.kind !== "deleteRows") {
          throw new Error("Queued delete is not a deleteRows operation.");
        }
        return b.startIndex - a.startIndex;
      },
    );
  }
  private _deleteConditionalFormatOperationsDescending() {
    return [
      ...this.spreadsheetStateRaw.writeQueue.updateRequests
        .deleteConditionalFormat,
    ].sort((a, b) => {
      if (
        a.kind !== "deleteConditionalFormatRule" ||
        b.kind !== "deleteConditionalFormatRule"
      ) {
        throw new Error(
          "Queued deleteConditionalFormat is not a deleteConditionalFormatRule operation.",
        );
      }
      if (a.sheetId !== b.sheetId) return a.sheetId - b.sheetId;
      return b.index - a.index;
    });
  }
}
