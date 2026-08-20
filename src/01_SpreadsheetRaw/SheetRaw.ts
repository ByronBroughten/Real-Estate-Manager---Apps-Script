import { type CellValueName, type UniformRowName } from "../00_base/base";
import type { Value } from "../02_generatedTraits/06_valueSchemas";
import { SchemaBase } from "../03_SpreadsheetIndexed/SchemaBase";
import { valS } from "../utils/validation";
import { DataColumnRaw } from "./ClassBases/DataColumnRaw";
import { DataRowRaw } from "./ClassBases/DataRowRaw";
import { SheetCommon } from "./ClassBases/SheetCommon";
import { ColumnRaw } from "./ColumnRaw";

import type {
    GoogleCellValue
} from "../00_base/AppsScriptTypes";
import {
    isPreFetchType,
    type SheetChangeProps,
    type SheetChangesToSave
} from "./ClassTypes/RawState";
import { SpreadsheetRaw } from "./SpreadsheetRaw";
import { UniformRow } from "./UniformRow";

export type SheetRawRow = DataRowRaw | UniformRow;

export class SheetRaw extends SheetCommon {
  get ss(): SpreadsheetRaw {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  get schema(): SchemaBase {
    return new SchemaBase();
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
  dataRowRaw(rowIdx: number): DataRowRaw {
    return new DataRowRaw({
      rowIndex: rowIdx,
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
    const rowName = this.schema.uniformRowNameByIndex(rowIndex);
    if (!rowName) {
      throw new Error(
        `Row index ${rowIndex} does not correspond to a known uniform row name.`,
      );
    }
    return this.uniformRow(rowName);
  }
  row(rowIdx: number): DataRowRaw | UniformRow {
    if (this.schema.isUniformRowIndex(rowIdx)) {
      return this.uniformRowByIndex(rowIdx);
    } else {
      return this.dataRowRaw(rowIdx);
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
  get dataRows(): DataRowRaw[] {
    return this.activeDataRowIndexes.map((index) => this.dataRow(index));
  }
  get topDataRow(): DataRowRaw {
    return this.row(this.schema.topDataRowIdx) as DataRowRaw;
  }
  dataRow(index: number): DataRowRaw {
    this.schema.validateDataRowIndex(index);
    return this.row(index) as DataRowRaw;
  }
  get activeRows(): SheetRawRow[] {
    return this.activeRowIndexes.map((rowIndex) => this.row(rowIndex));
  }
  gatherFetchGridRanges() {
    this.preFetchGridRanges.forEach((pf) => {
      if (isPreFetchType(pf, "fullRow")) {
        this.prepFetchFullRow(pf.row);
      } else if (isPreFetchType(pf, "fullDataColumn")) {
        this.column(pf.column);
      } else if (isPreFetchType(pf, "singleCell")) {
        this.prepFetchSingleCell(pf.row, pf.column);
      } else {
        throw new Error(`Unknown pre-fetch type: ${pf}`);
      }
    });
  }
  prepFetchFullRow(rowIndex: number): SheetRaw {
    this.sheetState.indexesOfFullRowsToFetch.add(rowIndex);
    return this.gatherFetchRange({
      ...this.schema.oneRowSpecifier(rowIndex),
      startColumnIndex: 0,
    });
  }
  prepFetch()

  prepFetchFullRowNext(rowIndex: number) {
    this.preFetchGridRanges.push({ type: "fullRow", row: rowIndex });
  }

  }

  gatherFetchRange(gr: SheetGridRangeProps): SheetRaw {
    if (
      gr.startColumnIndex !== undefined &&
      gr.startRowIndex >= this.schema.topDataRowIdx
    ) {
      this.sheetState.indexesOfColDataToFetch.add(gr.startColumnIndex);
    }
    if (
      gr.endRowIndex === gr.startRowIndex + 1 &&
      gr.startColumnIndex === 0 &&
      gr.endColumnIndex === undefined
    ) {
      this.sheetState.indexesOfFullRowsToFetch.add(gr.startRowIndex);
    }
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
          const rowIdx = rowIdxBase + (colData.startRow ?? 0);
          const cellData = colCell?.values?.[colIdxOffset] as
            | GoogleCellValue
            | undefined;
          // Undefined is allowed because it means the cell is empty, and Google's API doesn't send empty cells.
          this.row(rowIdx).integrateState(colIndex, cellData);
        });
      });
    });
  }
  get allDataRows(): DataRowRaw[] {
    return this.fullDataRowIndexes.map((rowIndex) => this.dataRow(rowIndex));
  }
  finalizeFetchedData() {
    this.allDataRows.forEach((row) => row.ensureStateExists());
    this._finalizeFetchedFullRows();
    this._finalizeFetchedDataColumns();
  }
  private _finalizeFetchedFullRows(): void {
    this.sheetState.indexesOfFullRowsToFetch.forEach((rowIndex) => {
      this.fullDataColIndexes.forEach((colIndex) => {
        const row = this.row(rowIndex);
        if (!row.hasValue(colIndex)) {
          row.integrateEmptyState(colIndex);
        }
      });
    });
    this.sheetState.indexesOfFullRowsToFetch.clear();
  }
  private _finalizeFetchedDataColumns(): void {
    this.sheetState.indexesOfColDataToFetch.forEach((colIndex) => {
      this.allDataRows.forEach((row) => {
        if (!row.hasValue(colIndex)) {
          row.integrateEmptyState(colIndex);
        }
      });
    });
    this.sheetState.indexesOfColDataToFetch.clear();
  }
  addMissingColumnIds(idPrefix: string): number {
    let addedCount = 0;
    this.fullDataColIndexes.forEach((colIndex) => {
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
  prepFetchHeaderRowUsingSheetProperties(): UniformRow<"header"> {
    return this.prepFetchFullUniformRow("header");
  }
  fetchHeaderRowUsingSheetProperties(): UniformRow<"header"> {
    const row = this.prepFetchHeaderRowUsingSheetProperties();
    this.ss.fetchAllPrepped();
    return row;
  }
  prepFetchFullUniformRow<UN extends UniformRowName>(
    rowName: UN,
  ): UniformRow<UN> {
    this.prepFetchFullRow(this.schema.uniformRowIndex(rowName));
    return this.uniformRow(rowName);
  }
  prepFetchUniformRowsUsingSheetProperties(
    rowNames: UniformRowName[],
  ): SheetRaw {
    rowNames.forEach((rowName) => this.prepFetchFullUniformRow(rowName));
    return this;
  }
  columnByHeader<VN extends CellValueName = CellValueName>(
    header: string,
    valueName?: VN,
  ): ColumnRaw<VN> {
    const colIndex = this.headerRow.colIndexOfValue(header);
    return this.column(colIndex, valueName);
  }
  prepFetchDataColumnsUsingHeaders<HD extends string>(
    ...headers: HD[]
  ): Record<HD, DataColumnRaw> {
    return headers.reduce(
      (acc, header) => {
        acc[header] = this.columnByHeader(header).data.prepFetchAllDataCells();
        return acc;
      },
      {} as Record<HD, DataColumnRaw>,
    );
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
  appendDataRow(): DataRowRaw {
    const idx = this.activeTable.endRowIndex;
    return this.dataRow(idx).append();
  }
  appendDataRowValues(colValues: Map<number, Value>): DataRowRaw {
    const row = this.appendDataRow();
    for (const [colIndex, value] of colValues.entries()) {
      row.updateValue(colIndex, value);
    }
    return row;
  }
  DELETE_ACTIVE_DATA_ROWS(
    startRowIdx: number,
    numRows: number = this.rowCount - startRowIdx,
  ): SheetRaw {
    this.rowStates
      .entries()
      .filter(
        ([rowIdx]) => rowIdx >= startRowIdx && rowIdx < startRowIdx + numRows,
      )
      .forEach(([rowIdx]) => {
        const row = this.dataRow(rowIdx);
        row.delete();
      });
    return this;
  }
  removeRowsExcept(...rowIdxesToKeep: number[]): void {
    const allRowIdxs = Array.from(this.rowStates.keys());
    allRowIdxs.forEach((rowIdx) => {
      if (!rowIdxesToKeep.includes(rowIdx)) {
        this.row(rowIdx).remove();
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
    this.column(columnIndex).insert(props);
    this.addSheetChangeToSave({
      action: "insertColumn",
      startColumnIndex: columnIndex,
    });
    return columnIndex;
  }
  prepFetchPropertiesOnly(): SheetRaw {
    // getByDataFilter only returns a sheet's `tables` metadata for filters whose
    // gridRange overlaps the table. The table always starts at the header row,
    // so pre-activate it and request one of its cells to reliably pull properties.
    this.uniformRow("header");
    this.gatherFetchRange({
      ...this.schema.oneRowSpecifier(this.schema.headerRowIndex),
      startColumnIndex: this.schema.startTableColIndex,
      endColumnIndex: this.schema.startTableColIndex + 1,
    });
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
  copyAndDeleteLastActiveDataRow() {
    // I'd want to insert rather than append.
    // Can I append at the not last row? Probably not.
    // Is there a way for me to verify that rows or values are fetched?
    const lastRowIdx = this.lastRowIdx;
    const lastRow = this.dataRow(lastRowIdx);
    const newRow = this.appendDataRow();
    this.fullDataColIndexes.forEach((colIndex) => {
      const value = lastRow.value(colIndex);
      newRow.updateValue(colIndex, value);
    });
    lastRow.delete();
  }
}
