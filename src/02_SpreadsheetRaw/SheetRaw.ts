import type { SheetSnapshot } from "../00_base/RawSource";
import type { CellValueName } from "../00_base/base";
import type { Value } from "../01_generatedConfigs/valueSchemas";
import { Arr } from "../utils/Arr";
import { assertValueAndFormulaExclusive } from "./CellRaw";
import type { RowCommonRaw } from "./ClassBases/RowCommonRaw";
import { SheetCommonRaw } from "./ClassBases/SheetCommonRaw";
import {
  type ColumnFill,
  type FindReplaceTerms,
  type SortParameters,
} from "./ClassTypes/RawState";
import { ColumnRaw } from "./ColumnRaw";
import { RowRaw } from "./RowRaw";
import { SheetMetaRaw } from "./SheetMetaRaw";
import { SpreadsheetRaw } from "./SpreadsheetRaw";

export class SheetRaw extends SheetCommonRaw {
  get ss(): SpreadsheetRaw {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  get meta(): SheetMetaRaw {
    return new SheetMetaRaw(this.sheetRawProps);
  }
  get rowIndexesAreStale(): boolean {
    return (
      this.sheetState.knownTable !== null && this.activeTable.rowIndexesAreStale
    );
  }
  get hasFetchedProperties(): boolean {
    return this.sheetState.knownTable !== null;
  }
  get title(): string {
    if (this.sheetState.title === null) {
      throw new Error(
        `Sheet title is null for sheetGid ${this.sheetGid}. Ensure that the sheet properties have been fetched.`,
      );
    }
    return this.sheetState.title;
  }
  get activeRowIndexes(): number[] {
    const indexes = Array.from(this.sheetState.rowStates.keys());
    return Arr.sortAscending(indexes);
  }
  get activeRowCount(): number {
    return this.sheetState.rowStates.size;
  }
  get lastActiveRowIndex(): number {
    return Math.max(...this.rowStates.keys());
  }
  get rowIndexesActive(): number[] {
    return this.activeRowIndexes.filter((rowIndex) =>
      this.schema.isDataRowIndex(rowIndex),
    );
  }
  get rowIndexesFull(): number[] {
    return Arr.indexesFromUntil(
      this.schema.topDataRowIdx,
      this.activeTable.endRowIndex,
    );
  }
  get rowsFull(): RowRaw[] {
    return this.rowIndexesFull.map((rowIndex) => this.row(rowIndex));
  }
  get rows(): RowRaw[] {
    return this.rowIndexesActive.map((index) => this.row(index));
  }
  get topRow(): RowRaw {
    return this.row(this.schema.topDataRowIdx);
  }
  get rowCount(): number {
    return this.activeRowCount - this.schema.topDataRowIdx;
  }
  // The one place the invariant's threshold is written, so no tier can drift from it.
  get isDownToLastDataRow(): boolean {
    return this.dataRowCountAfterFlush <= 1;
  }
  // Local row state holds only fetched rows, so the table's extent is the source.
  get dataRowCountAfterFlush(): number {
    const { endRowIndex } = this.activeTable;
    return (
      endRowIndex - this.schema.topDataRowIdx - this._queuedRowDeleteCount()
    );
  }
  private _queuedRowDeleteCount(): number {
    let count = 0;
    this.allChangesToSave.forEach((change, sheetRowId) => {
      if (change.level !== "row" || typeof sheetRowId !== "string") return;
      if (!change.delete) return;
      if (
        this.schema.idsFromSheetRowId(sheetRowId).sheetGid !== this.sheetGid
      ) {
        return;
      }
      count++;
    });
    return count;
  }
  get cellStateIsStale(): boolean {
    return this.sheetState.cellStateIsStale;
  }
  markRowIndexesStale(): void {
    this.activeTable.markRowIndexesStale();
  }
  invalidateCellState(): void {
    this.sheetState.rowStates.clear();
    this.sheetState.cellStateIsStale = true;
  }
  findReplace(terms: FindReplaceTerms): this {
    this.ss.findReplace({ ...terms, scope: { sheetId: this.sheetGid } });
    return this;
  }
  clearRowIndexStale(): void {
    this.activeTable.clearRowIndexStale();
  }
  ensureColIndexIsStale(colIndex: number): void {
    this.activeTable.ensureColIndexIsStale(colIndex);
  }
  row(rowIndex: number): RowRaw {
    return new RowRaw({
      rowIndex,
      ...this.sheetRawProps,
    });
  }
  // Every guess this sheet's columns made from a sample had none behind it.
  topDataRowIsBlank(): boolean {
    if (this.topRow.rowIsActive()) {
      return this.fullTableColIndexes.every(
        (colIndex) => this.topRow.valueOrEmpty(colIndex) === "",
      );
    }
    // A queued-delete top row has no cells; column facts still describe the live sheet.
    return this.fullTableColIndexes.every(
      (colIndex) => this.meta.column(colIndex).activeTopValue === "",
    );
  }
  // Either kind of row, for callers that only touch what the two share.
  rowCommon(rowIndex: number): RowCommonRaw {
    if (this.schema.isUniformRowIndex(rowIndex)) {
      return this.meta.uniformRowByIndex(rowIndex);
    } else {
      return this.row(rowIndex);
    }
  }
  column<VN extends CellValueName = CellValueName>(
    colIndex: number,
  ): ColumnRaw<VN> {
    return new ColumnRaw<VN>({
      colIndex,
      ...this.sheetRawProps,
    });
  }
  columnByHeader<VN extends CellValueName = CellValueName>(
    header: string,
  ): ColumnRaw<VN> {
    return this.column<VN>(this.meta.tableHeaderRow.colIndexOfValue(header));
  }
  gatherFetchDataColumnsUsingHeaders<HD extends string>(
    ...headers: HD[]
  ): Record<HD, ColumnRaw> {
    return headers.reduce(
      (acc, header) => {
        acc[header] = this.columnByHeader(header).gatherFetchFull();
        return acc;
      },
      {} as Record<HD, ColumnRaw>,
    );
  }
  gatherFetchProperties(startTableColIndex: number): this {
    // The live start is unknown until this probe comes back, so aim the layout constant.
    this.meta.tableHeaderRow.cell(startTableColIndex).gatherFetchRange();
    return this;
  }
  hasQueuedFullRowFetch(rowIndex: number): boolean {
    return this.sheetState.rowIndexesToFinalize.has(rowIndex);
  }
  integrateSheetState(sheet: SheetSnapshot): void {
    this._initSheetState(sheet);
    this.sheetState.cellStateIsStale = false;
    if (sheet.gridBlocks) {
      this._integrateSheetData(sheet.gridBlocks);
    }
  }
  private _integrateSheetData(
    gridBlocks: NonNullable<SheetSnapshot["gridBlocks"]>,
  ): void {
    gridBlocks.forEach((block) => {
      const colIdxBase = block.startColumn;
      block.rows.forEach((rowSnapshot, rowIdxBase) => {
        const rowIndex = rowIdxBase + block.startRow;
        const row = this.rowCommon(rowIndex);
        row.ensureStateExists();
        for (let colIdxOffset = 0; colIdxOffset < block.columnCount; colIdxOffset++) {
          const colIndex = colIdxBase + colIdxOffset;
          const cellData = rowSnapshot.cells[colIdxOffset];
          if (row.rowIsActive()) {
            row.cell(colIndex).integrateSnapshot(cellData);
          }
          if (
            rowIndex === this.schema.topDataRowIdx &&
            this.isTableColIndex(colIndex)
          ) {
            this.meta.column(colIndex).integrateActiveFacts(cellData);
          }
        }
      });
    });
  }
  // The uniform rows survive, or every later column-index resolution breaks.
  removeRowsExcept(...rowIdxesToKeep: number[]): void {
    const allRowIdxs = Array.from(this.rowStates.keys());
    allRowIdxs.forEach((rowIndex) => {
      if (this.schema.isUniformRowIndex(rowIndex)) return;
      if (!rowIdxesToKeep.includes(rowIndex)) {
        this.rowCommon(rowIndex).remove();
      }
    });
    this.sheetState.isPrunedToSelection = true;
  }
  // A whole-column fill ignores active rows, so it would rewrite what a prune excluded.
  validateNotPrunedToSelection(): void {
    if (this.sheetState.isPrunedToSelection) {
      throw new Error(
        `Sheet ${this.sheetGid} has been pruned to a selection. A whole-column write would reach the rows the prune excluded.`,
      );
    }
  }
  requestSortGSheet({ colIdxToSortBy, sortOrder }: SortParameters): void {
    this.addSheetChangeToSave({
      action: "sort",
      colIdxToSortBy,
      sortOrder,
    });
  }
  // Value/colour fills stay one repeatCell; a formula fill is pasteData so Sheets parses it.
  gatherFillRequest({
    colIndex,
    startRowIndex,
    endRowIndex,
    formula,
    ...change
  }: ColumnFill): void {
    assertValueAndFormulaExclusive(change.value, formula);
    this.updateRequests.fill.push({
      kind: "fill",
      sheetId: this.sheetGid,
      colIndex,
      startRowIndex,
      endRowIndex,
      ...change,
      ...(formula !== undefined ? { formula } : {}),
    });
  }
  gatherInsertColumnRequest(startColumnIndex: number): void {
    this.updateRequests.insertColumn.push({
      kind: "insertColumn",
      sheetId: this.sheetGid,
      startColumnIndex,
    });
    if (startColumnIndex === this.activeTable.endColumnIndex) {
      this.activeTable.growEndColumnIndex();
    } else {
      this.ensureColIndexIsStale(startColumnIndex);
    }
  }
  gatherSortRequest({ colIdxToSortBy, sortOrder }: SortParameters): void {
    this.updateRequests.sort.push({
      kind: "sort",
      sheetId: this.sheetGid,
      startRowIndex: this.schema.topDataRowIdx,
      startColumnIndex: 0,
      colIdxToSortBy,
      sortOrder,
    });
  }
  appendDataRow(): RowRaw {
    const idx = this.activeTable.endRowIndex;
    return this.row(idx).append();
  }
  appendDataRowValues(colValues: Map<number, Value>): RowRaw {
    const row = this.appendDataRow();
    for (const [colIndex, value] of colValues.entries()) {
      row.updateValue(colIndex, value);
    }
    return row;
  }
}
