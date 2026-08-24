import { type CellValueName, type UniformRowName } from "../00_base/base";
import { Arr } from "../utils/Arr";
import { valS } from "../utils/validation";
import { DataRowRaw } from "./ClassBases/DataRowRaw";
import { SheetCommonRaw } from "./ClassBases/SheetCommonRaw";
import { ColumnRaw } from "./ColumnRaw";
import { DataSheetRaw } from "./DataSheetRaw";

import type {
  GoogleCellValue,
  GoogleGridRange,
  GoogleSheet,
  GoogleSheetData,
} from "../00_base/AppsScriptTypes";
import type { SheetGridRangeProps } from "./ClassTypes/AccessorsRaw";
import {
  type SheetChangeProps,
  type SheetChangesToSave,
  type SortParameters,
} from "./ClassTypes/RawState";
import { SpreadsheetRaw } from "./SpreadsheetRaw";
import { UniformRow } from "./UniformRow";

export type SheetRawRow = DataRowRaw | UniformRow;

export class SheetRaw extends SheetCommonRaw {
  get ss(): SpreadsheetRaw {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  get data(): DataSheetRaw {
    return new DataSheetRaw(this.sheetRawProps);
  }
  get rowIndexesAreValid(): boolean {
    return this.sheetState.rowIndexesAreValid;
  }
  invalidateRowIndexes(): void {
    this.sheetState.rowIndexesAreValid = false;
  }
  validateRowIndexes(): void {
    this.sheetState.rowIndexesAreValid = true;
  }
  get firstStaleColIndex(): number | null {
    return this.sheetState.firstStaleColIndex;
  }
  ensureColIndexIsStale(colIndex: number): void {
    this.sheetState.firstStaleColIndex = Math.min(
      this.sheetState.firstStaleColIndex ?? Infinity,
      colIndex,
    );
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
  get fullTableColIndexes(): number[] {
    return Arr.indexesFromUntil(
      this.schema.startTableColIndex,
      this.activeTable.endColumnIndex,
    );
  }
  get rowCount(): number {
    return this.sheetState.rowStates.size;
  }
  get headerRow(): UniformRow<"header"> {
    return this.uniformRow("header");
  }
  get actionRow(): UniformRow<"action"> {
    return this.uniformRow("action");
  }
  get colIdRow(): UniformRow<"columnId"> {
    return this.uniformRow("columnId");
  }
  dataRowRaw(rowIndex: number): DataRowRaw {
    return new DataRowRaw({
      rowIndex: rowIndex,
      ...this.sheetRawProps,
    });
  }
  uniformRow<UN extends UniformRowName>(uniformRowName: UN): UniformRow<UN> {
    return new UniformRow({
      ...this.sheetRawProps,
      rowIndex: this.schema.uniformRowIndex(uniformRowName),
      uniformRowName,
    });
  }
  uniformRowByIndex(rowIndex: number): UniformRow {
    return this.uniformRow(this.schema.uniformRowNameByIndex(rowIndex));
  }
  row(rowIndex: number): DataRowRaw | UniformRow {
    if (this.schema.isUniformRowIndex(rowIndex)) {
      return this.uniformRowByIndex(rowIndex);
    } else {
      return this.dataRowRaw(rowIndex);
    }
  }
  column<VN extends CellValueName = CellValueName>(
    colIndex: number,
    valueName?: VN,
  ): ColumnRaw<VN> {
    return new ColumnRaw({
      colIndex,
      valueName,
      ...this.sheetRawProps,
    });
  }
  get activeRows(): SheetRawRow[] {
    return this.activeRowIndexes.map((rowIndex) => this.row(rowIndex));
  }
  gatherFetchRange(gr: SheetGridRangeProps): SheetRaw {
    this.rawState.fetcherGridRanges.push({
      sheetId: this.sheetGid,
      ...gr,
    });
    return this;
  }
  get emptyGridRange(): GoogleGridRange {
    return { sheetId: this.sheetGid, startRowIndex: 0, endRowIndex: 0 };
  }
  integrateSheetState(sheet: GoogleSheet): void {
    this._initSheetState(sheet);
    if (sheet.data) {
      this._integrateSheetRowStates(sheet.data);
    }
  }
  private _integrateSheetRowStates(sheetData: GoogleSheetData): void {
    const colsData = valS.assert(sheetData, "sheetData");
    colsData.forEach((colData) => {
      // Payload doesn't include default values of 0
      const colIdxBase = colData.startColumn ?? 0;
      const columns = colData.columnMetadata || [];
      (colData.rowData || []).forEach((colCell, rowIdxBase) => {
        columns.forEach((_, colIdxOffset) => {
          const colIndex = colIdxBase + colIdxOffset;
          const rowIndex = rowIdxBase + (colData.startRow ?? 0);
          const cellData = colCell?.values?.[colIdxOffset] as
            | GoogleCellValue
            | undefined;
          // Undefined is allowed because it means the cell is empty, and Google's API doesn't send empty cells.
          this.row(rowIndex).cell(colIndex).integrateGState(cellData);
        });
      });
    });
  }
  addMissingColumnIds(idPrefix: string): number {
    let addedCount = 0;
    this.fullTableColIndexes.forEach((colIndex) => {
      const colIdValue = this.colIdRow.uniformValue(colIndex);
      if (!colIdValue) {
        this.colIdRow.updateValue(colIndex, this.makeColumnId(idPrefix));
        addedCount++;
      }
    });
    return addedCount;
  }
  makeColumnId(idPrefix: string): string {
    return this.schema.makeColIdFromPrefix(idPrefix);
  }
  makeRowId(idPrefix: string): string {
    return this.schema.makeRowIdFromPrefix(idPrefix);
  }
  gatherFetchRanges(props: SheetGridRangeProps[]): SheetRaw {
    props.forEach((props) => this.gatherFetchRange(props));
    return this;
  }
  columnByHeader<VN extends CellValueName = CellValueName>(
    header: string,
    valueName?: VN,
  ): ColumnRaw<VN> {
    const colIndex = this.headerRow.colIndexOfValue(header);
    return this.column(colIndex, valueName);
  }
  ensureColumnsOfHeadersExist(idPrefix: string, ...headers: string[]): number {
    const missingHeaders = this.headerRow.returnMissingValues(...headers);
    return missingHeaders.reduce((acc, header) => {
      this.insertColumnAtEnd({
        idPrefix,
        header,
      });
      return acc + 1;
    }, 0);
  }
  get lastRowIdx(): number {
    return Math.max(...this.rowStates.keys());
  }
  removeRowsExcept(...rowIdxesToKeep: number[]): void {
    const allRowIdxs = Array.from(this.rowStates.keys());
    allRowIdxs.forEach((rowIndex) => {
      if (!rowIdxesToKeep.includes(rowIndex)) {
        this.row(rowIndex).remove();
      }
    });
  }
  get changesToSave(): SheetChangesToSave {
    this._ensureChnagesToSaveExists();
    return this.allChangesToSave.get(this.sheetGid) as SheetChangesToSave;
  }
  private _ensureChnagesToSaveExists(): void {
    const sheetChangesToSave = this.rawState.changesToSave;
    const sheetGid = this.sheetGid;
    if (!sheetChangesToSave.has(sheetGid)) {
      sheetChangesToSave.set(sheetGid, {
        level: "sheet",
        sort: null,
        insertColumn: null,
      });
    }
  }
  requestSortGSheet({ colIdxToSortBy, sortOrder }: SortParameters): void {
    this.addSheetChangeToSave({
      action: "sort",
      colIdxToSortBy,
      sortOrder,
    });
  }
  addSheetChangeToSave(props: SheetChangeProps): SheetRaw {
    const changes = this.changesToSave;
    switch (props.action) {
      case "sort":
        changes.sort = {
          colIdxToSortBy: props.colIdxToSortBy,
          sortOrder: props.sortOrder,
        };
        break;
      case "insertColumn":
        changes.insertColumn = props.startColumnIndex;
        break;
      default:
        throw new Error(
          `Invalid action: ${(props as SheetChangeProps).action}. Must be one of "sort" or "insertColumn".`,
        );
    }
    return this;
  }
  insertColumnAtEnd(props: { idPrefix: string; header: string }): number {
    const columnIndex = this.activeTable.endColumnIndex;
    this.column(columnIndex).initUniformCells(props);
    this.addSheetChangeToSave({
      action: "insertColumn",
      startColumnIndex: columnIndex,
    });
    return columnIndex;
  }
  gatherFetchColumnIds(): SheetRaw {
    this.uniformRow("columnId").gatherFetchFull();
    return this;
  }
  fetchColumnIds(): SheetRaw {
    this.gatherFetchColumnIds();
    this.ss.fetchAllGathered();
    return this;
  }
  gatherFetchProperties(): SheetRaw {
    // getByDataFilter only returns a sheet's `tables` metadata for filters whose
    // gridRange overlaps the table. The table always starts at the header row,
    // so pre-activate it and request one of its cells to reliably pull properties.
    this.uniformRow("header").firstTableCell().gatherFetchRange();
    return this;
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
}
