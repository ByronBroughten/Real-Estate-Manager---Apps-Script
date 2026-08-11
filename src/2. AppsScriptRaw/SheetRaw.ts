import {
  type UniformRowName,
  type UniformRowValueName,
} from "../1.0 Configs/0.0 ConfigPrecursors";
import { SchemaBase } from "../1.1 SpreadsheetSchemaRaw/SchemaBase";
import type { Value } from "../2.0 Schemas/3.2 valueSchemas";
import { Obj, type StrictOmit } from "../utils/Obj";
import { valS } from "../utils/validation";
import { SheetRawBase } from "./ClassBases/SheetRawBase";
import { ColumnRaw } from "./ColumnRaw";
import { RowRaw } from "./RowRaw";

import { SpreadsheetRaw } from "./SpreadsheetRaw";
import type {
  GoogleCellValue,
  GoogleGridRange,
  GoogleSheet,
  GoogleSheetData,
} from "./Types/AppsScriptTypes";
import type {
  GridRangeProps,
  SheetChangeProps,
  SheetChangePropsObj,
  SheetChangesToSave,
  SortParameters,
} from "./Types/RawState";
import { UniformRow } from "./UniformRowRaw/UniformRow";

type SheetGridRangeProps = StrictOmit<GridRangeProps, "sheetId">;
export type SheetRawRow = RowRaw | UniformRow<"string" | "boolean">;

export class SheetRaw extends SheetRawBase {
  get ss(): SpreadsheetRaw {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  get schema(): SchemaBase {
    return new SchemaBase();
  }
  get title(): string {
    return this.sheetState.title;
  }
  get headerRow(): UniformRow<"string"> {
    return this.row(this.schema.headerRowIdx) as UniformRow<"string">;
  }
  get actionRow(): UniformRow<"boolean"> {
    return this.row(this.schema.actionRowIdx) as UniformRow<"boolean">;
  }
  get colIdRow(): UniformRow<"string"> {
    return this.row(this.schema.colIdRowIdx) as UniformRow<"string">;
  }
  rowRaw(rowIdx: number): RowRaw {
    return new RowRaw({
      rowIndex: rowIdx,
      ...this.sheetRawProps,
    });
  }
  uniformRow<UN extends UniformRowName>(
    rowName: UN,
  ): UniformRow<UniformRowValueName<UN>> {
    return new UniformRow({
      ...this.sheetRawProps,
      rowIndex: this.schema.uniformRowIndex(rowName),
      valueName: this.schema.uniformValueName(rowName),
    });
  }
  uniformRowByIndex(rowIndex: number): UniformRow<"string" | "boolean"> {
    const rowName = this.schema.uniformRowNameByIndex(rowIndex);
    if (!rowName) {
      throw new Error(
        `Row index ${rowIndex} does not correspond to a known uniform row name.`,
      );
    }
    return this.uniformRow(rowName);
  }
  row(rowIdx: number): RowRaw | UniformRow<"string" | "boolean"> {
    if (this.schema.isUniformRowIndex(rowIdx)) {
      return this.uniformRowByIndex(rowIdx);
    } else {
      this.rowRaw(rowIdx);
    }
  }
  column(colIndex: number): ColumnRaw {
    return new ColumnRaw({
      colIndex,
      ...this.sheetRawProps,
    });
  }
  get dataRows(): RowRaw[] {
    return this.dataRowIndexes.map((index) => this.dataRow(index));
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
  private _initSheetState(sheet: GoogleSheet): void {
    const properties = sheet.properties;
    const table = sheet.tables[0];
    const tableRange = Obj.validatePick(
      table.range,
      "number",
      "startRowIndex",
      "endRowIndex",
      "startColumnIndex",
      "endColumnIndex",
    );

    this.sheetsState.set(this.sheetGid, {
      title: valS.assertDefined(properties.title, "sheet title "),
      activeTable: {
        tableId: valS.assertDefined(table.tableId, "tableId"),
        ...tableRange,
      },
      rowIndexesAreValid: true,
      lastNotStaleColumnIdx: null,
      rowStates: new Map(),
    });
  }
  private _integrateSheetRowStates(sheetData: GoogleSheetData): void {
    const colsData = valS.assertDefined(sheetData, "sheetData");
    colsData.forEach((colData) => {
      const colIdxBase = colData.startColumn ?? 0;
      const columns = colData.columnMetadata || [];
      colData.rowData.forEach((colCell, rowIdxBase) => {
        columns.forEach((_, colIdxOffset) => {
          const colIdx = colIdxBase + colIdxOffset;
          const rowIdx = rowIdxBase + (colData.startRow ?? 0);
          const cellData = colCell?.values?.[colIdxOffset] as
            | GoogleCellValue
            | undefined;
          this.rowRaw(rowIdx).integrateState(colIdx, cellData);
        });
      });
    });
  }
  addMissingColumnIds(idPrefix): void {
    this.activeColumnIdxs.forEach((colIdx) => {
      const colIdValue = this.colIdRow.value(colIdx);
      if (!colIdValue) {
        this.colIdRow.updateValue(colIdx, this.makeColumnId(idPrefix));
      }
    });
  }
  makeColumnId(idPrefix: string): string {
    return this.schema.makeColIdFromPrefix(idPrefix);
  }
  makeRowId(idPrefix: string): string {
    return this.schema.makeRowIdFromPrefix(idPrefix);
  }
  gatherGetRequest(props: SheetGridRangeProps): SheetRaw {
    this.rawState.getterGridRanges.push({
      sheetId: this.sheetGid,
      ...props,
    });
    return this;
  }
  gatherGetRequests(props: SheetGridRangeProps[]): SheetRaw {
    props.forEach((props) => this.gatherGetRequest(props));
    return this;
  }
  gatherOneRowGetRequest(rowIndex: number): SheetRaw {
    return this.gatherGetRequest({
      ...this.schema.oneRowSpecifier(rowIndex),
      startColumnIndex: 0,
      endColumnIndex: this.activeTable.endColumnIndex,
    });
  }
  fetchHeaderRow(): UniformRow<"string"> {
    return this.fetchOneRow(this.schema.headerRowIdx) as UniformRow<"string">;
  }
  fetchOneRow(rowIndex: number): SheetRawRow {
    this.gatherOneRowGetRequest(rowIndex);
    this.ss.fetchSheets();
    return this.row(rowIndex);
  }
  ensureColumnsOfHeadersExist(...headers: string[]): number {
    const missingHeaders = this.headerRow.returnMissingValues(...headers);
    return missingHeaders.reduce((acc, header) => {
      const index = this.activeTable.endColumnIndex;
      this.insertColumnAt(index);
      this.headerRow.updateValue(index, header);
      return acc + 1;
    }, 0);
  }
  fetchColumnOfHeader(header: string): ColumnRaw {
    const headerRow = this.fetchHeaderRow();
    const colIndex = headerRow.colIndexOfValue(header);
    return this.column(colIndex).fetchData();
  }
  fetchColumnsOfHeaders(...headers: string[]): Record<string, ColumnRaw> {
    const headerRow = this.fetchHeaderRow();
    const columns = headers.reduce(
      (acc, header) => {
        const colIndex = headerRow.colIndexOfValue(header);
        acc[header] = this.column(colIndex).gatherFetchDataRange();
        return acc;
      },
      {} as Record<string, ColumnRaw>,
    );
    this.ss.fetchSheets();
    return columns;
  }
  get lastRowIdx(): number {
    return Math.max(...this.sheetState.rowStates.keys());
  }
  invalidateRowIndexes(): void {
    this.sheetState.rowIndexesAreValid = false;
  }
  validateRowIndexes(): void {
    this.sheetState.rowIndexesAreValid = true;
  }
  appendDataRow(): RowRaw {
    const idx = this.activeTable.endRowIndex;
    return this.dataRow(idx).append();
  }
  appendDataRowValues(colValues: Map<number, Value>): RowRaw {
    const row = this.appendDataRow();
    for (const [colIdx, value] of colValues.entries()) {
      row.updateValue(colIdx, value);
    }
    return row;
  }
  DELETE_ACTIVE_DATA_ROWS(
    startRowIdx: number,
    numRows: number = this.rowCount - startRowIdx,
  ): SheetRaw {
    this.sheetState.rowStates
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
    const allRowIdxs = Array.from(this.sheetState.rowStates.keys());
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
  gatherPropertiesGetRequest() {
    this.ss.gatherFetchRanges({
      sheetId: this.sheetGid,
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
    if (this.sheetState.lastNotStaleColumnIdx !== null) {
      if (this.sheetState.lastNotStaleColumnIdx > startColumnIndex) {
        this.sheetState.lastNotStaleColumnIdx = startColumnIndex;
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
    lastRow.activeColIdxs.forEach((colIdx) => {
      const value = lastRow.value(colIdx);
      newRow.updateValue(colIdx, value);
    });
    lastRow.delete();
  }
}
