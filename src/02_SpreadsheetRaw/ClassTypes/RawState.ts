import type {
  GoogleColor,
  GoogleUpdateRequest,
} from "../../00_base/AppsScriptTypes";
import type { CellValue, CellValueName } from "../../00_base/base";
import type { GridRangeProps } from "./AccessorsRaw";

export interface RawState {
  allSheetPropertiesAreFetched: boolean;
  spreadsheetId: string | null;
  changesToSave: ChangesToSave;
  fetcherGridRanges: GridRangeProps[];
  updateRequests: Record<UpdateRequestName, GoogleUpdateRequest[]>;
  sheets: RawSheetsState;
}

const updateRequestNames = [
  "append",
  "update",
  "delete",
  "sort",
  "insertColumn",
  "fill",
  "findReplace",
  "raw",
] as const;
export type UpdateRequestName = (typeof updateRequestNames)[number];

export type RawSheetsState = Map<SheetId, RawSheetState>;

export interface RawSheetState {
  title: string | null;
  activeTable:
    | ({
        tableId: string;
        startRowIndex: number; // headerRowIndex
        endRowIndex: number; // lastRowIndex + 1
        startColumnIndex: number;
        endColumnIndex: number; // lastColumnIndex + 1
      } & RawColumnPropertiesState)
    | null;
  rowIndexesAreValid: boolean;
  // A findReplace matches by content, so what it changed is unknowable locally.
  cellStateIsStale: boolean;
  hasFetchedColumnIds: boolean;
  isPrunedToSelection: boolean;
  firstStaleColIndex: number | null;
  rowStates: RawRowStates;
  // A row an append has handed out, so a second append can't reuse it.
  reservedRowIndexes: Set<RowIndex>;
  columnCellFacts: RawColumnCellFacts;
  rowIndexesToFinalize: Set<RowIndex>;
  colIndexesToFinalize: Set<ColIndex>;
  cellsToFinalize: Map<RowIndex, Set<ColIndex>>;
}

export type RawRowStates = Map<RowIndex, RawRowState>;
export type RawRowState = Map<ColIndex, CellValue>;

export type RawColumnCellFacts = Map<ColIndex, RawCellFacts>;
export interface RawCellFacts {
  isFormula: boolean;
  numberFormatType: string | undefined;
  topValue: CellValue;
}

export interface RawColumnPropertiesState {
  columnValidationValues: RawColumnValidationValues;
  columnDeclaredTypes: RawColumnDeclaredTypes;
}
export type RawColumnValidationValues = Map<ColIndex, string[]>;
// Absent for a column left on Automatic, which is what makes it "untyped".
export type RawColumnDeclaredTypes = Map<ColIndex, string>;

type SheetId = number;
type RowIndex = number;
type ColIndex = number;
type SheetRowId = string;

export type SortParameters = {
  colIdxToSortBy: number;
  sortOrder: "ASCENDING" | "DESCENDING";
};

export type ChangesToSave = Map<
  SheetId | SheetRowId,
  RowChangesToSave | SheetChangesToSave
>;
export type RowChangesToSave = {
  level: "row";
  append: boolean;
  delete: null | GoogleAppsScript.Sheets.Schema.Request;
  // Values, not indexes, so a queued write never depends on fetched row state.
  update: Map<ColIndex, RowCellChange>;
};
// One entry per cell, merged across writes, so a colour never cancels a value.
export interface RowCellChange<VN extends CellValueName = CellValueName> {
  value?: CellValue<VN>;
  backgroundColor?: GoogleColor;
}
export type SheetChangesToSave = {
  level: "sheet";
  sort: null | SortParameters;
  insertColumn: null | ColIndex;
  fills: ColumnFill[];
};
// One contiguous run of a column's cells, flushed as a single repeatCell.
export interface ColumnFill extends RowCellChange {
  colIndex: ColIndex;
  startRowIndex: number;
  // Snapshotted when queued, so a fill never reaches a row appended after it.
  endRowIndex: number;
}

export interface SheetChangeSortProps extends SortParameters {
  action: "sort";
}

export type FindReplaceScope =
  { range: GridRangeProps } | { sheetId: number } | { allSheets: true };
// Google's own field names, so Google's own semantics are what they mean.
export interface FindReplaceTerms {
  find: string;
  replacement: string;
  matchCase?: boolean;
  matchEntireCell?: boolean;
  searchByRegex?: boolean;
  includeFormulas?: boolean;
}
export interface FindReplaceProps extends FindReplaceTerms {
  scope: FindReplaceScope;
}

export type SheetChangePropsObj = {
  sort: SheetChangeSortProps;
  insertColumn: {
    action: "insertColumn";
    startColumnIndex: number;
  };
  fill: { action: "fill" } & ColumnFill;
};
export type SheetChangeProps = SheetChangePropsObj[keyof SheetChangePropsObj];

export type RowChangeUpdateProps = {
  action: "update";
  colIndex: ColIndex;
} & ({ value: CellValue } | { backgroundColor: GoogleColor });
export type RowChangeProps =
  { action: "append" | "delete" } | RowChangeUpdateProps;

export type ColumnSpecifierRaw = ColIndex[] | "allColumns";
export type ColumnCount = number | "allFromStart";
export type RowCountRaw = number | "allFromStart";

export interface RowRange {
  startRowIndex: number;
  endRowIndex?: number;
}
export function makeRowRange(
  startRowIndex: number,
  endRowIndex?: number,
): RowRange {
  return { startRowIndex, endRowIndex };
}
