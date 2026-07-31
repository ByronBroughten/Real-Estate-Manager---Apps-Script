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
  rowData: RawRowData;
}

export type RawRowData = Map<RowIdx, Map<ColIdx, CellValue>>;
type SheetId = number;
type RowIdx = number;
type ColIdx = number;
