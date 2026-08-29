import { Val } from "../utils/Val";

export function _testCustomTableTypes(spreadsheetId: string) {
  // 1. Reading tables from a SheetNamed response
  const sheetsService = Val.assert(Sheets, "Sheets");
  const ss = sheetsService.Spreadsheets.get(spreadsheetId);
  const sheets = Val.assert(ss.sheets, "ss.sheets");
  const firstSheet = Val.assert(sheets[0], "sheets[0]");

  firstSheet.properties?.title;

  // Fully typed access to sheet tables array!
  const tables: GoogleAppsScript.Sheets.Schema.Table[] | undefined =
    firstSheet.tables;

  if (tables && tables.length > 0) {
    const table = Val.assert(tables[0], "tables[0]");
    console.log(`Found table: ${table.name} (ID: ${table.tableId})`);
  }

  // 2. Constructing an UpdateTableRequest
  const updateReq: GoogleAppsScript.Sheets.Schema.UpdateTableRequest = {
    table: {
      tableId: "1001",
      name: "Updated_Table_Name",
    },
    fields: "name",
  };

  // 3. Constructing an AppendCellsRequest
  const appendReq: GoogleAppsScript.Sheets.Schema.AppendCellsRequest = {
    sheetId: 0,
    rows: [
      {
        values: [
          {
            userEnteredValue: {
              stringValue: "New DataRowNamed Entry",
            },
          },
        ],
      },
    ],
    fields: "userEnteredValue",
  };

  // 4. Passing in batchUpdate
  const batchRequest: GoogleAppsScript.Sheets.Schema.BatchUpdateSpreadsheetRequest =
    {
      requests: [{ updateTable: updateReq }, { appendCells: appendReq }],
    };

  sheetsService.Spreadsheets.batchUpdate(batchRequest, spreadsheetId);
}
