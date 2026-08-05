import type { GoogleGridRange, GoogleUpdateRequest } from "./AppsScriptTypes";

export interface RawState {
  changesToSave: ChangesToSave;
  getterGridRanges: GoogleGridRange[];
  updateRequests: {
    append: GoogleUpdateRequest[];
    update: GoogleUpdateRequest[];
    delete: GoogleUpdateRequest[];
    sort: GoogleUpdateRequest[];
  };
  sheets: RawSheetsState;
  sheetsInvalidateIdxesOnUpdate: Set<SheetId>;
}

export type RawSheetsState = Map<SheetId, RawSheetState>;

export interface RawSheetState {
  title: string;
  sheetName: string;
  tableId: string;
  nextAppendedRowIdx: number;
  rowIndexesAreValid: boolean;
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
};

export interface SheetChangeSortProps extends SortParameters {
  action: "sort";
}
export type SheetChangeProps = SheetChangeSortProps;

export type RowChangeUpdateProps = { action: "update"; colIdxes: number[] };
export type RowChangeProps =
  | { action: "append" | "delete" }
  | RowChangeUpdateProps;

export type RowCount = number | "allFromStart";
export type InitSheetsPropsRaw = {
  startRowIndex: number;
  rowCount: RowCount;
  sheets: Map<SheetId, "allColumns" | ColIdx[]>;
};
export type InitSheetsPropsColumnsRaw = "allColumns" | ColIdx[];
