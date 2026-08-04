import type { GoogleGridRange, GoogleUpdateRequests } from "./AppsScriptTypes";

export interface RawState {
  changesToSave: ChangesToSave;
  getterGridRanges: GoogleGridRange[];
  updateRequests: GoogleUpdateRequests[];
  sheets: RawSheetsState;
}

export type RawSheetsState = Map<SheetId, RawSheetState>;

export interface RawSheetState {
  title: string;
  sheetName: string;
  tableId: string;
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

export type ChangesToSave = Map<SheetRowId, RowChangesToSave>;
export type RowChangesToSave = {
  append: boolean;
  delete: null | GoogleAppsScript.Sheets.Schema.Request;
  update: Set<ColIdx>;
};

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
