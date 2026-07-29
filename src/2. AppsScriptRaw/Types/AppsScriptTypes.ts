export type GoogleSpreadsheet = GoogleAppsScript.Sheets.Schema.Spreadsheet;

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
