export function _myFunction() {
  const ssa = SpreadsheetApp.getActiveSpreadsheet();
  const spreadsheetId = ssa.getId();
  const ss = Sheets.Spreadsheets.get(spreadsheetId);
  const testMeta = ss.sheets.filter(
    (value) => value.properties.title === "Test",
  )[0];
  const testTable = testMeta.tables[0];
  const testTableId = testTable.tableId;
  const sheetId = testMeta.properties.sheetId;

  // Capture where the new rows will land before appending.
  const firstNewRowIndex = testTable.range.endRowIndex; // 0-indexed
  const startColIndex = testTable.range.startColumnIndex; // 0-indexed, column A
  const literalColIndex = startColIndex + 2;

  // ID, Base ID, Number, Date
  const rowData = [
    { baseId: "lkjoo39", number: 11 },
    { baseId: "lalak94", number: 12 },
    { baseId: "falala", number: 13 },
  ];

  // Step 1: append the rows via the Advanced Sheets Service, values only.
  const appendReq = {
    sheetId: sheetId,
    tableId: testTableId,

    rows: rowData.map(() => ({ values: [] })),
    fields: "userEnteredValue",
  };

  const updateReq = {
    range: {
      sheetId: sheetId,
      startRowIndex: firstNewRowIndex,
      endRowIndex: firstNewRowIndex + rowData.length,
      startColumnIndex: literalColIndex,
      endColumnIndex: literalColIndex + 2,
    },
    rows: rowData.map((r) => ({
      values: [
        { userEnteredValue: { stringValue: r.baseId } },
        { userEnteredValue: { numberValue: r.number } },
      ],
    })),
    fields: "userEnteredValue",
  };
  Sheets.Spreadsheets.batchUpdate(
    { requests: [{ appendCells: appendReq }, { updateCells: updateReq }] },
    spreadsheetId,
  );
}
