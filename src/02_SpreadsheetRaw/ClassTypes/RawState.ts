import type { GoogleUpdateRequest } from "../../00_base/AppsScriptTypes";
import type { CellValue } from "../../00_base/base";
import type { GridRangeProps } from "./AccessorsRaw";

export interface RawState {
  allSheetPropertiesAreFetched: boolean;
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
] as const;
export type UpdateRequestName = (typeof updateRequestNames)[number];

export type RawSheetsState = Map<SheetId, RawSheetState>;

export interface RawSheetState {
  title: string | null;
  activeTable: {
    tableId: string;
    startRowIndex: number; // headerRowIndex
    endRowIndex: number; // lastRowIndex + 1
    startColumnIndex: number;
    endColumnIndex: number; // lastColumnIndex + 1
    columnValidationValues: RawColumnValidationValues;
  } | null;
  rowIndexesAreValid: boolean;
  firstStaleColIndex: number | null;
  rowStates: RawRowStates;
  columnCellFacts: RawColumnCellFacts;
}

export type RawRowStates = Map<RowIndex, RawRowState>;
export type RawRowState = Map<ColIndex, CellValue>;

// Facts about a column's live data, sampled from its top data row cell —
// e.g. isFormula/numberFormatType are traits of the whole column (like
// ColumnSchemaCommon's schema-based `isFormula`), not of any one row, so
// this is keyed by column only, with no row dimension.
export type RawColumnCellFacts = Map<ColIndex, RawCellFacts>;
export interface RawCellFacts {
  isFormula: boolean;
  numberFormatType: string | undefined;
}

// A column's live data-validation condition values (e.g. `=valueConfig[X]`),
// keyed by absolute column index, from the sheet's active Table metadata.
export type RawColumnValidationValues = Map<ColIndex, string[]>;

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
  update: Set<ColIndex>;
};
export type SheetChangesToSave = {
  level: "sheet";
  sort: null | SortParameters;
  insertColumn: null | ColIndex;
};

export interface SheetChangeSortProps extends SortParameters {
  action: "sort";
}

export type SheetChangePropsObj = {
  sort: SheetChangeSortProps;
  insertColumn: {
    action: "insertColumn";
    startColumnIndex: number;
  };
};
export type SheetChangeProps = SheetChangePropsObj[keyof SheetChangePropsObj];

export type RowChangeUpdateProps = { action: "update"; colIdxes: number[] };
export type RowChangeProps =
  | { action: "append" | "delete" }
  | RowChangeUpdateProps;

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
