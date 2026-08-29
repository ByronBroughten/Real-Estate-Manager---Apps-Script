// // Functions for Testing

// import { Obj } from "./utils/Obj";

// // These functions just live here temporarily, to be configured and ran in AppScript as needed to understand how the advanced Sheets api works.

// function testGetByDataFilterColumns() {
//   const spreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();

//   const allTableId = 210603630; // one row, 1 column
//   const testSheetId = 2089200354; // all rows, 2 columns

//   // { gridRange: { sheetId: allTableId, startRowIndex: 0, endRowIndex: 2, startColumnIndex: 1, endColumnIndex: 3 } },

//   const request = {
//     dataFilters: [
//       {
//         gridRange: {
//           sheetId: testSheetId,
//           startRowIndex: 2,
//           endRowIndex: 3,
//           startColumnIndex: 2,
//           endColumnIndex: 4,
//         },
//       },
//       {
//         gridRange: {
//           sheetId: testSheetId,
//           startRowIndex: 4,
//           endRowIndex: 4,
//           startColumnIndex: 1,
//           endColumnIndex: 2,
//         },
//       },
//     ],
//     includeGridData: false,
//   };
//   const response = Sheets.Spreadsheets.getByDataFilter(request, spreadsheetId, {
//     fields:
//       "sheets(properties(sheetId,title),tables(tableId,range),data(startColumn,startRow,rowData(values(effectiveValue))))",
//   });
//   Logger.log(JSON.stringify(response, null, 2));
// }

// function testUpdate() {
//   const spreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();
//   const testSheetId = 2089200354;
//   const testTableId = 1321948538;
//   const request = {
//     includeGridData: true,
//     dataFilters: [
//       {
//         gridRange: {
//           sheetId: testSheetId,
//           startRowIndex: 4,
//           endRowIndex: 5,
//           startColumnIndex: 4,
//           endColumnIndex: 5,
//         },
//       }, // col E
//     ],
//   };
//   const response = Sheets.Spreadsheets.getByDataFilter(request, spreadsheetId, {
//     fields:
//       "sheets(properties(sheetId,title),tables(name,tableId),data(startColumn,startRow,columnMetadata(hiddenByUser),rowData(values(effectiveValue))))",
//   });
//   const valuesToUpdate = {
//     // baseId: { stringValue: "kdiwkdi" },
//     // number: { numberValue: 1 },
//     // dropdown: { stringValue: "Yes" }
//     dateValue: {
//       numberValue:
//         response.sheets[0].data[0].rowData[0].values[0].effectiveValue
//           .numberValue,
//     },
//   };
//   const updateValues = Obj.values(valuesToUpdate).map((value) => ({
//     userEnteredValue: value,
//   }));
//   const insertColumnRequest = {
//     insertDimension: {
//       range: {
//         sheetId: testSheetId,
//         dimension: "COLUMNS",
//         startIndex: 1,
//         endIndex: 2,
//       },
//       inheritFromBefore: false, // Maybe this should be true. I should test it
//     },
//   };
//   Sheets.Spreadsheets.batchUpdate(
//     {
//       requests: [
//         insertColumnRequest,
//         // {
//         //   appendCells: {
//         //     // New Schema:
//         //     // sheetName rather than tableName (should be synced, anyways)
//         //     // tableId is maintained in schema because it's stable.
//         //     sheetId: testSheetId,
//         //     tableId: `${testTableId}`,
//         //     rows: [{}, {}],
//         //     fields: "userEnteredValue",
//         //   },
//         // },
//         // {
//         //   updateCells: {
//         //     range: {
//         //       sheetId: testSheetId,
//         //       startRowIndex: 10,
//         //       endRowIndex: 12,
//         //       startColumnIndex: 4,
//         //       endColumnIndex: 5,
//         //     },
//         //     rows: [{ values: updateValues }, { values: updateValues }],
//         //     fields: "userEnteredValue",
//         //   },
//         // }
//       ],
//     },
//     spreadsheetId,
//   );
// }
