export type GoogleSpreadsheet = GoogleAppsScript.Sheets.Schema.Spreadsheet;
export type GoogleSheet = GoogleAppsScript.Sheets.Schema.Sheet;

export type GoogleSheetData = GoogleAppsScript.Sheets.Schema.Sheet["data"];

export type GoogleUpdateRequest = GoogleAppsScript.Sheets.Schema.Request;

export type DataFilter = NonNullable<
  GoogleAppsScript.Sheets.Schema.GetSpreadsheetByDataFilterRequest["dataFilters"]
>[number];

export type GetByDataFilterRequest =
  GoogleAppsScript.Sheets.Schema.GetSpreadsheetByDataFilterRequest;

export type GoogleGridRange = GoogleAppsScript.Sheets.Schema.GridRange;

export type GoogleColCell = GoogleAppsScript.Sheets.Schema.RowData;
export type GoogleEffectiveValue = GoogleAppsScript.Sheets.Schema.ExtendedValue;
export type GoogleCellValue = GoogleAppsScript.Sheets.Schema.CellData;

export type UpdateCellsRequest =
  GoogleAppsScript.Sheets.Schema.UpdateCellsRequest;
export type UserEnteredValue = NonNullable<
  NonNullable<UpdateCellsRequest["rows"]>[number]["values"]
>[number]["userEnteredValue"];
