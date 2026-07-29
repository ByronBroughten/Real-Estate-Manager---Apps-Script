import type { CellValue } from "../../utilitiesAppsScript";

export interface RawState {
  gss: GoogleAppsScript.Spreadsheet.Spreadsheet;
  requests: BatchUpdateRequest[];
  sheets: RawSheetsState;
  newRowIdxCounterNegative: number;
}
export type BatchUpdateRequest = GoogleAppsScript.Sheets.Schema.Request;
export type RawSheetsState = Map<SheetId, RawSheetState>;

export interface RawSheetState {
  title: string;
  tableName: string;
  tableId: string;
  rowData: Map<IdIdx, Map<IdIdx, CellValue>>;
}

type IdIdx = number;
type SheetId = number;
