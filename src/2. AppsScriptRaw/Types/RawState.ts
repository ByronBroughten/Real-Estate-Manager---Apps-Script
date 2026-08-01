import type { CellValue } from "../../utilitiesAppsScript";
import type { BatchUpdateRequest } from "./AppsScriptTypes";

export interface RawState {
  gss: GoogleAppsScript.Spreadsheet.Spreadsheet;
  requests: BatchUpdateRequest[];
  sheets: RawSheetsState;
}

export type RawSheetsState = Map<SheetId, RawSheetState>;

export interface RawSheetState {
  title: string;
  tableName: string;
  tableId: string;
  rowIndexesAreValid: boolean;
  rowStates: RawRowStates;
}

export type RawRowStates = Map<RowIdx, RawRowState>;
export type RawRowState = Map<ColIdx, CellValue>;
type SheetId = number;
type RowIdx = number;
type ColIdx = number;
