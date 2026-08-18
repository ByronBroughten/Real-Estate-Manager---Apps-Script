import { type CellValueName, type UniformRowName } from "../00_base/base";
import type { Value } from "../02_generatedTraits/06_valueSchemas";
import { SchemaBase } from "../03_SpreadsheetIndexed/SchemaBase";
import { valS } from "../utils/validation";
import { SheetRawBase } from "./ClassBases/SheetRawBase";
import { ColumnRaw } from "./ColumnRaw";
import { RowRaw } from "./RowRaw";

import type {
  GoogleCellValue,
  GoogleGridRange,
  GoogleSheet,
  GoogleSheetData,
} from "../00_base/AppsScriptTypes";
import type { SheetGridRangeProps } from "./ClassTypes/AccessorsRaw";
import type {
  SheetChangeProps,
  SheetChangePropsObj,
  SheetChangesToSave,
  SortParameters,
} from "./ClassTypes/RawState";
import { SpreadsheetRaw } from "./SpreadsheetRaw";
import { UniformRow } from "./UniformRow";

export type SheetRawRow = RowRaw | UniformRow;

export class SheetRaw extends SheetRawBase {
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
  rowRaw(rowIdx: number): RowRaw {
    return new RowRaw({
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
  row(rowIdx: number): RowRaw | UniformRow {
    if (this.schema.isUniformRowIndex(rowIdx)) {
      return this.uniformRowByIndex(rowIdx);
    } else {
      this.rowRaw(rowIdx);
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
  get dataRows(): RowRaw[] {
    return this.activeDataRowIndexes.map((index) => this.dataRow(index));
  }
  get topDataRow(): RowRaw {
    return this.row(this.schema.topDataRowIdx) as RowRaw;
  }
  dataRow(index: number): RowRaw {
    this.schema.validateDataRowIndex(index);
    return this.row(index) as RowRaw;
  }
  get activeRows(): SheetRawRow[] {
    return this.activeRowIndexes.map((rowIndex) => this.row(rowIndex));
  }
  get activeColumnIdxs(): number[] {
    return this.activeRows[0].activeColIdxs;
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
    const colsData = valS.assertDefined(sheetData, "sheetData");
    colsData.forEach((colData) => {
      // Payload doesn't include default values of 0
      const colIdxBase = colData.startColumn ?? 0;
      const columns = colData.columnMetadata || [];
      colData.rowData.forEach((colCell, rowIdxBase) => {
        columns.forEach((_, colIdxOffset) => {
          const colIndex = colIdxBase + colIdxOffset;
          const rowIdx = rowIdxBase + (colData.startRow ?? 0);
          const cellData = colCell?.values?.[colIdxOffset] as
            | GoogleCellValue
            | undefined;
          // Undefined is allowed because it means the cell is empty, and Google's API doesn't send empty cells.
          this.rowRaw(rowIdx).integrateState(colIndex, cellData);
        });
      });
    });
  }
  addIndexOfColToFinalize(colIndex: number): void {
    this.sheetState.colIndexesOfDataToFetch.add(colIndex);
  }
  finalizeFetchedColumnData() {
    this.sheetState.colIndexesOfDataToFetch.forEach((colIndex) => {
      this.column(colIndex).integrateMissingDataWithEmpty();
    });
    this.sheetState.colIndexesOfDataToFetch.clear();
  }
  addMissingColumnIds(idPrefix: string): number {
    let addedCount = 0;
    this.activeColumnIdxs.forEach((colIndex) => {
      const colIdValue = this.colIdRow.value(colIndex);
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
  gatherFetchRange(gr: SheetGridRangeProps): SheetRaw {
    if (
      gr.startColumnIndex !== undefined &&
      gr.startRowIndex >= this.schema.topDataRowIdx
    ) {
      this.addIndexOfColToFinalize(gr.startColumnIndex);
    }

    this.rawState.fetcherGridRanges.push({
      sheetId: this.sheetGid,
      ...gr,
    });
    return this;
  }
  gatherFetchRanges(props: SheetGridRangeProps[]): SheetRaw {
    props.forEach((props) => this.gatherFetchRange(props));
    return this;
  }
  prepFetchOneRow(rowIndex: number): SheetRaw {
    return this.gatherFetchRange({
      ...this.schema.oneRowSpecifier(rowIndex),
      startColumnIndex: 0,
      endColumnIndex: this.activeTable.endColumnIndex,
    });
  }
  prepFetchHeaderRowUsingSheetProperties(): UniformRow<"header"> {
    return this.prepFetchUniformRowUsingSheetProperties("header");
  }
  fetchHeaderRowUsingSheetProperties(): UniformRow<"header"> {
    const row = this.prepFetchHeaderRowUsingSheetProperties();
    this.ss.fetchAllPrepped();
    return row;
  }
  prepFetchUniformRowUsingSheetProperties<UN extends UniformRowName>(
    rowName: UN,
  ): UniformRow<UN> {
    this.gatherFetchRange({
      ...this.schema.oneRowSpecifier(this.schema.uniformRowIndex(rowName)),
      startColumnIndex: 0,
      endColumnIndex: this.activeTable.endColumnIndex,
    });
    return this.uniformRow(rowName);
  }
  prepFetchUniformRowsUsingSheetProperties(
    rowNames: UniformRowName[],
  ): SheetRaw {
    rowNames.forEach((rowName) =>
      this.prepFetchUniformRowUsingSheetProperties(rowName),
    );
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
  ): Record<HD, ColumnRaw> {
    return headers.reduce(
      (acc, header) => {
        acc[header] = this.columnByHeader(header).prepFetchAllDataCells();
        return acc;
      },
      {} as Record<HD, ColumnRaw>,
    );
  }
  ensureColumnsOfHeadersExist(...headers: string[]): number {
    const missingHeaders = this.headerRow.returnMissingValues(...headers);
    return missingHeaders.reduce((acc, header) => {
      const columnIndex = this.activeTable.endColumnIndex;
      this.insertColumnAt(columnIndex);
      this.headerRow.updateValue(columnIndex, header);
      return acc + 1;
    }, 0);
  }
  get lastRowIdx(): number {
    return Math.max(...this.rowStates.keys());
  }
  invalidateRowIndexes(): void {
    this.rowIndexesAreValid = false;
  }
  validateRowIndexes(): void {
    this.rowIndexesAreValid = true;
  }
  appendDataRow(): RowRaw {
    const idx = this.activeTable.endRowIndex;
    return this.dataRow(idx).append();
  }
  appendDataRowValues(colValues: Map<number, Value>): RowRaw {
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
    const actions: {
      [K in keyof SheetChangePropsObj]: (props: SheetChangePropsObj[K]) => any;
    } = {
      sort: (props) =>
        (changes.sort = {
          colIdxToSortBy: props.colIdxToSortBy,
          sortOrder: props.sortOrder,
        }),
      insertColumn: (props) => (changes.insertColumn = props.startColumnIndex),
    };
    switch (props.action) {
      case "sort":
        actions.sort(props);
        break;
      case "insertColumn":
        actions.insertColumn(props);
        break;
      default:
        throw new Error(
          `Invalid action: ${(props as SheetChangeProps).action}. Must be one of "sort" or "insertColumn".`,
        );
    }
    return this;
  }
  insertColumnAt(startColumnIndex: number = 0): void {
    this.addSheetChangeToSave({
      action: "insertColumn",
      startColumnIndex,
    });
    if (startColumnIndex <= this.activeTable.endColumnIndex) {
      this.activeTable.endColumnIndex++;
    } else {
      throw new Error(
        `Cannot insert column at index ${startColumnIndex} because it would be outside the existing table end column index of ${this.activeTable.endColumnIndex}.`,
      );
    }
  }
  prepFetchPropertiesOnly(): SheetRaw {
    this.gatherFetchRange({
      startRowIndex: this.topDataRow.rowIndex,
      endRowIndex: this.topDataRow.rowIndex,
      startColumnIndex: 0,
      endColumnIndex: 0,
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
    if (this.lastNotStaleColumnIdx !== null) {
      if (this.lastNotStaleColumnIdx > startColumnIndex) {
        this.lastNotStaleColumnIdx = startColumnIndex;
      }
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
    const lastRowIdx = this.lastRowIdx;
    const lastRow = this.dataRow(lastRowIdx);
    const newRow = this.appendDataRow();
    lastRow.activeColIdxs.forEach((colIndex) => {
      const value = lastRow.value(colIndex);
      newRow.updateValue(colIndex, value);
    });
    lastRow.delete();
  }
}
