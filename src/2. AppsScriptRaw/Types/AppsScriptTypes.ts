export type GoogleSpreadsheet = GoogleAppsScript.Sheets.Schema.Spreadsheet;
export type GoogleSheet = GoogleAppsScript.Sheets.Schema.Sheet;

export type GoogleSheetData = GoogleAppsScript.Sheets.Schema.Sheet["data"];

export type BatchUpdateRequest = GoogleAppsScript.Sheets.Schema.Request;

export type DataFilter =
  GoogleAppsScript.Sheets.Schema.GetSpreadsheetByDataFilterRequest["dataFilters"][number];

export type GetByDataFilterRequest =
  GoogleAppsScript.Sheets.Schema.GetSpreadsheetByDataFilterRequest;

export type GridRange = GoogleAppsScript.Sheets.Schema.GridRange;

const test: GridRange = {
  sheetId: 0,
  startRowIndex: 0,
  endRowIndex: 0,
};
