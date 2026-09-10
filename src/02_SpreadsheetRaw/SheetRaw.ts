import type {
  GoogleCellValue,
  GoogleSheet,
  GoogleSheetData,
} from "../00_base/AppsScriptTypes";
import type { CellValueName } from "../00_base/base";
import type { Value } from "../01_generatedConfigs/valueSchemas";
import { Arr } from "../utils/Arr";
import { Val } from "../utils/Val";
import { cellChangeFieldMask, cellChangeToCellData } from "./CellRaw";
import type { RowCommonRaw } from "./ClassBases/RowCommonRaw";
import { SheetCommonRaw } from "./ClassBases/SheetCommonRaw";
import { type ColumnFill, type SortParameters } from "./ClassTypes/RawState";
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
  get rowIndexesAreValid(): boolean {
    return this.sheetState.rowIndexesAreValid;
  }
  get hasFetchedProperties(): boolean {
    return this.sheetState.activeTable !== null;
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
      if (change.delete === null) return;
      if (
        this.schema.idsFromSheetRowId(sheetRowId).sheetGid !== this.sheetGid
      ) {
        return;
      }
      count++;
    });
    return count;
  }
  invalidateRowIndexes(): void {
    this.sheetState.rowIndexesAreValid = false;
  }
  validateRowIndexes(): void {
    this.sheetState.rowIndexesAreValid = true;
  }
  ensureColIndexIsStale(colIndex: number): void {
    this.sheetState.firstStaleColIndex = Math.min(
      this.sheetState.firstStaleColIndex ?? Infinity,
      colIndex,
    );
  }
  row(rowIndex: number): RowRaw {
    return new RowRaw({
      rowIndex,
      ...this.sheetRawProps,
    });
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
    return this.column<VN>(this.meta.headerRow.colIndexOfValue(header));
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
  gatherFetchProperties(): this {
    // getByDataFilter only returns a sheet's `tables` metadata for filters whose
    // gridRange overlaps the table. The table always starts at the header row,
    // so pre-activate it and request one of its cells to reliably pull properties.
    this.meta.headerRow.firstTableCell().gatherFetchRange();
    return this;
  }
  hasQueuedFullRowFetch(rowIndex: number): boolean {
    return this.sheetState.rowIndexesToFinalize.has(rowIndex);
  }
  integrateSheetState(sheet: GoogleSheet): void {
    this._initSheetState(sheet);
    if (sheet.data) {
      this._integrateSheetData(sheet.data);
    }
  }
  private _integrateSheetData(sheetData: GoogleSheetData): void {
    const colsData = Val.assert(sheetData, "sheetData");
    colsData.forEach((colData) => {
      // Payload doesn't include default values of 0
      const colIdxBase = colData.startColumn ?? 0;
      const columns = colData.columnMetadata || [];
      (colData.rowData || []).forEach((colCell, rowIdxBase) => {
        const rowIndex = rowIdxBase + (colData.startRow ?? 0);
        const row = this.rowCommon(rowIndex);
        row.ensureStateExists();
        columns.forEach((_, colIdxOffset) => {
          const colIndex = colIdxBase + colIdxOffset;
          const cellData = colCell?.values?.[colIdxOffset] as
            GoogleCellValue | undefined;
          // Undefined is allowed because it means the cell is empty, and Google's API doesn't send empty cells.
          row.cell(colIndex).integrateGState(cellData);
          // The column's live isFormula/numberFormatType facts are
          // sampled from this one representative row, not tracked per row.
          if (rowIndex === this.schema.topDataRowIdx) {
            this.meta.column(colIndex).integrateActiveFacts(cellData);
          }
        });
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
  // One repeatCell per contiguous run, so a fill costs one request, not one per row.
  gatherFillRequest({
    colIndex,
    startRowIndex,
    endRowIndex,
    ...change
  }: ColumnFill): void {
    this.updateRequests.fill.push({
      repeatCell: {
        range: {
          sheetId: this.sheetGid,
          startRowIndex,
          endRowIndex,
          startColumnIndex: colIndex,
          endColumnIndex: colIndex + 1,
        },
        cell: cellChangeToCellData(change),
        // Anything the mask covers but `cell` omits gets cleared, so keep it narrow.
        fields: cellChangeFieldMask(change),
      },
    });
  }
  gatherInsertColumnRequest(startColumnIndex: number): void {
    this.updateRequests.insertColumn.push({
      insertDimension: {
        range: {
          sheetId: this.sheetGid,
          dimension: "COLUMNS",
          startIndex: startColumnIndex,
          endIndex: startColumnIndex + 1,
        },
        inheritFromBefore: false, // Let the formatting and column header colors be natural.
      },
    });
    if (startColumnIndex === this.activeTable.endColumnIndex) {
      this.activeTable.endColumnIndex++;
    } else {
      this.ensureColIndexIsStale(startColumnIndex);
    }
  }
  gatherSortRequest({ colIdxToSortBy, sortOrder }: SortParameters): void {
    this.updateRequests.sort.push({
      sortRange: {
        range: {
          sheetId: this.sheetGid,
          startRowIndex: this.schema.topDataRowIdx,
          startColumnIndex: 0,
        }, // skip header, unbounded end = rest of sheet
        sortSpecs: [{ dimensionIndex: colIdxToSortBy, sortOrder }],
      },
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
