import type { CellValue } from "./base";
import type { RgbColor } from "./RgbColor";

export interface GridRangeProps {
  sheetId: number;
  startRowIndex: number;
  endRowIndex?: number;
  startColumnIndex?: number;
  endColumnIndex?: number;
}

export interface UsedGridRange {
  sheetId: number;
}

export type GridFetchRange = GridRangeProps | UsedGridRange;

export type SortOrder = "ASCENDING" | "DESCENDING";

export type FindReplaceScope =
  | { range: GridRangeProps }
  | { sheetId: number }
  | { allSheets: true };

export interface FindReplaceTerms {
  find: string;
  replacement: string;
  matchCase?: boolean;
  matchEntireCell?: boolean;
  searchByRegex?: boolean;
  includeFormulas?: boolean;
}

export interface GridFetchOptions {
  includeProgrammaticFacts: boolean;
}

export interface SpreadsheetSnapshot {
  sheets: SheetSnapshot[];
}

export interface SheetSnapshot {
  sheetGid: number;
  title: string | null;
  tables: TableSnapshot[] | undefined;
  gridBlocks: GridBlockSnapshot[] | undefined;
}

export interface TableSnapshot {
  tableId: string;
  startRowIndex: number;
  endRowIndex: number;
  startColumnIndex: number;
  endColumnIndex: number;
  columnProperties: TableColumnSnapshot[];
}

export interface TableColumnSnapshot {
  columnIndex?: number;
  columnType?: string;
  dataValidationValues: string[];
  dataValidationConditionType?: string;
}

export interface GridBlockSnapshot {
  startColumn: number;
  startRow: number;
  columnCount: number;
  rows: GridRowSnapshot[];
}

export interface GridRowSnapshot {
  cells: (GridCellSnapshot | undefined)[];
}

export interface GridCellSnapshot {
  value: CellValue | "";
  isFormula: boolean;
  numberFormatType?: string;
  dataValidationConditionType?: string;
  backgroundColor?: RgbColor;
}

export type LocalWriteOperation =
  | AppendRowsOperation
  | InsertColumnOperation
  | FillOperation
  | UpdateCellOperation
  | FindReplaceOperation
  | DeleteRowsOperation
  | SortOperation
  | OpaqueRawWriteOperation;

export interface AppendRowsOperation {
  kind: "appendRows";
  sheetId: number;
  tableId: string;
  emptyRowCount: number;
}

export interface InsertColumnOperation {
  kind: "insertColumn";
  sheetId: number;
  startColumnIndex: number;
}

export interface FillOperation {
  kind: "fill";
  sheetId: number;
  colIndex: number;
  startRowIndex: number;
  endRowIndex: number;
  value?: CellValue;
  formula?: string;
  backgroundColor?: RgbColor;
}

export interface UpdateCellOperation {
  kind: "updateCell";
  sheetId: number;
  rowIndex: number;
  colIndex: number;
  value?: CellValue;
  formula?: string;
  backgroundColor?: RgbColor;
}

export interface FindReplaceOperation {
  kind: "findReplace";
  terms: FindReplaceTerms;
  scope: FindReplaceScope;
}

export interface DeleteRowsOperation {
  kind: "deleteRows";
  sheetId: number;
  startIndex: number;
  endIndex: number;
}

export interface SortOperation {
  kind: "sort";
  sheetId: number;
  startRowIndex: number;
  startColumnIndex: number;
  colIdxToSortBy: number;
  sortOrder: SortOrder;
}

export interface OpaqueRawWriteOperation {
  kind: "raw";
  request: unknown;
}

export interface RawSource {
  fetchSheetProperties(spreadsheetId: string): SpreadsheetSnapshot;
  fetchGrid(
    spreadsheetId: string,
    gridRanges: GridFetchRange[],
    options: GridFetchOptions,
  ): SpreadsheetSnapshot;
  flush(spreadsheetId: string, operations: LocalWriteOperation[]): void;
}

let installed: RawSource | null = null;

export function installRawSource(source: RawSource): void {
  installed = source;
}

export function hasInstalledRawSource(): boolean {
  return installed !== null;
}

export function installedRawSource(): RawSource {
  if (installed === null) {
    throw new Error(
      "RawSource has not been installed. The host must construct GoogleSheetsAPI before SpreadsheetRaw.init.",
    );
  }
  return installed;
}
