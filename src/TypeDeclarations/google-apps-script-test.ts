export function _testCustomTableTypes(spreadsheetId: string) {
  // 1. Reading tables from a SheetNamed response
  const ss = Sheets.Spreadsheets.get(spreadsheetId);
  const firstSheet = ss.sheets[0];

  ss.sheets[0].properties.title;

  // Fully typed access to sheet tables array!
  const tables: GoogleAppsScript.Sheets.Schema.Table[] | undefined =
    firstSheet.tables;

  if (tables && tables.length > 0) {
    console.log(`Found table: ${tables[0].name} (ID: ${tables[0].tableId})`);
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
              stringValue: "New RowNamed Entry",
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

  Sheets.Spreadsheets?.batchUpdate(batchRequest, spreadsheetId);
}
