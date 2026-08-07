import type { GoogleGridRange, GoogleUpdateRequest } from "./AppsScriptTypes";

const updateRequestNames = [
  "append",
  "update",
  "delete",
  "sort",
  "insertColumn",
] as const;
export type UpdateRequestName = (typeof updateRequestNames)[number];

export interface RawState {
  changesToSave: ChangesToSave;
  getterGridRanges: GoogleGridRange[];
  updateRequests: Record<UpdateRequestName, GoogleUpdateRequest[]>;
  sheets: RawSheetsState;
}

export function initUpdateRequests(): RawState["updateRequests"] {
  return {
    append: [],
    update: [],
    delete: [],
    sort: [],
    insertColumn: [],
  };
}

export type RawSheetsState = Map<SheetId, RawSheetState>;

export interface RawSheetState {
  title: string;
  sheetName: string;
  tableId: string;
  nextAppendedRowIdx: number;
  rowIndexesAreValid: boolean;
  lastNotStaleColumnIdx: null | number;
  rowStates: RawRowStates;
}

export type CellValue = number | Date | string | boolean;
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

export interface FetchRowsRawProps extends RowSpecifierRaw {
  sheetColumns: SheetColumnMap;
}
type SheetColumnMap = Map<SheetId, ColIdx[]>;

export interface RowSpecifierRaw {
  startRowIndex: number;
  rowCount: RowCountRaw;
}
export function makeRowSpecifierRaw(
  startRowIndex: number,
  rowCount: RowCountRaw,
): RowSpecifierRaw {
  return { startRowIndex, rowCount };
}

export type ColumnSpecifierRaw = ColIdx[] | "allColumns";
export type ColumnCount = number | "allFromStart";
export type RowCountRaw = number | "allFromStart";

// export type InitSpecificRowsPropsRaw = {
//   rowIdexes: number[];
//   sheets: SheetColumnMap;
// };
