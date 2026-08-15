import type {
  GoogleGridRange,
  GoogleUpdateRequest,
} from "../../00_base/AppsScriptTypes";
import type { CellValue } from "../../00_base/base";
import type { StrictPick } from "../../utils/Obj";

const updateRequestNames = [
  "append",
  "update",
  "delete",
  "sort",
  "insertColumn",
] as const;
export type UpdateRequestName = (typeof updateRequestNames)[number];

export interface RawState {
  allSheetPropertiesAreFetched: boolean;
  changesToSave: ChangesToSave;
  getterGridRanges: GoogleGridRange[];
  updateRequests: Record<UpdateRequestName, GoogleUpdateRequest[]>;
  sheets: RawSheetsState;
}

export type RawSheetsState = Map<SheetId, RawSheetState>;

export interface RawSheetState {
  title: string | null;
  activeTable: {
    tableId: string;
    startRowIndex: number; // headerRowIndex
    endRowIndex: number; // lastRowIndex + 1
    startColumnIndex: number;
    endColumnIndex: number; // lastColumnIndex + 1
  } | null;
  rowIndexesAreValid: boolean;
  lastNotStaleColumnIdx: number | null;
  rowStates: RawRowStates;
}

export type RawRowStates = Map<RowIdx, RawRowState>;
export type RawRowState = Map<ColIdx, CellValue>;
type SheetId = number;
type RowIdx = number;
type ColIdx = number;
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
  update: Set<ColIdx>;
};
export type SheetChangesToSave = {
  level: "sheet";
  sort: null | SortParameters;
  insertColumn: null | ColIdx;
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

export type ColumnSpecifierRaw = ColIdx[] | "allColumns";
export type ColumnCount = number | "allFromStart";
export type RowCountRaw = number | "allFromStart";

export type GridRangeProps = {
  sheetId: number;
  startRowIndex: number;
  endRowIndex?: number;
  startColumnIndex: number;
  endColumnIndex?: number;
};

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

export type SheetColumnsRange = StrictPick<
  GridRangeProps,
  "startColumnIndex" | "endColumnIndex" | "sheetId"
>;
export type ColumnRange = StrictPick<
  GridRangeProps,
  "startColumnIndex" | "endColumnIndex"
>;

// export type InitSpecificRowsPropsRaw = {
//   rowIdexes: number[];
//   sheets: SheetColumnMap;
// };
