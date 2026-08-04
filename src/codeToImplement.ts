import { allTableNames } from "./0. spreadsheetMetaData/4.0 tableAttributes";

// Ideas:
// Put tableId in the schema because it's stable.
// Make sheetName based on the sheet's actual name

const allColumnAttributesGid = 2034522667;
function ensureColumns() {
  ensureColumnIds();
  // removeDuplicateRowsByGid(allColumnAttributesGid);
  // pruneAllColumnAttributes();
  // appendColumnRows();
  // syncAllColumnAttributes();
}

/**
 * Ensures every column of every table in the spreadsheet has a unique ID
 * entered in row 2, directly above that column's header (row 3). Any
 * column whose row-2 cell is empty gets a fresh ID from makeColumnId()
 * written in.
 *
 * API usage is kept to the minimum possible — exactly 2 calls total,
 * no matter how many sheets or columns exist:
 *
 *   1. ONE spreadsheets.getByDataFilter call reads rows 2 & 3 of every
 *      sheet at once (one GoogleGridRange dataFilter per sheet), restricted
 *      via a fields mask to only sheetId + each cell's formattedValue.
 *   2. ONE spreadsheets.batchUpdate call writes every missing ID at
 *      once, using an UpdateCellsRequest per missing cell (each scoped
 *      to a single `start` coordinate so it only touches that one cell
 *      and never disturbs neighboring data/formatting).
 *
 * Setup: this uses the "Sheets" Advanced Service, so it must be enabled
 * first — Apps Script editor > Services (+) > Google Sheets API.
 */
function ensureColumnIds() {
  const spreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();
  const sheetIds = Object.keys(allTableNames).map(Number);

  // ---------------------------------------------------------------------
  // 1) READ — pull only rows 2 (IDs) and 3 (headers) from every sheet in
  //    a single request, masked down to just what's needed to decide
  //    whether an ID is present.
  // ---------------------------------------------------------------------
  const getRequest = {
    dataFilters: sheetIds.map((sheetId) => ({
      gridRange: {
        sheetId: sheetId,
        startRowIndex: 1, // row 2 (rows are 0-indexed)
        endRowIndex: 3, // exclusive end -> covers rows 2 and 3
        startColumnIndex: 0, // every table starts at column A
        // no endColumnIndex: let the API return exactly as much width
        // as each sheet actually has header content for
      },
    })),
    includeGridData: true,
  };

  const fieldsMask =
    "sheets.properties.sheetId," + "sheets.data.rowData.values.formattedValue";

  const response = Sheets.Spreadsheets.getByDataFilter(
    getRequest,
    spreadsheetId,
    { fields: fieldsMask },
  );

  // ---------------------------------------------------------------------
  // 2) DIFF — for every header cell (row 3) that has content, check
  //    whether the cell above it (row 2) already has an ID.
  // ---------------------------------------------------------------------
  const updateCellsRequests = [];

  (response.sheets || []).forEach((sheet) => {
    const sheetId = sheet.properties.sheetId;
    const gridData = sheet.data && sheet.data[0];
    if (!gridData || !gridData.rowData) return; // nothing on this sheet

    const idRow = (gridData.rowData[0] && gridData.rowData[0].values) || [];
    const headerRow = (gridData.rowData[1] && gridData.rowData[1].values) || [];

    headerRow.forEach((headerCell, colIndex) => {
      const hasHeader = !!(headerCell && headerCell.formattedValue);
      if (!hasHeader) return; // past the last real column of the table

      const idCell = idRow[colIndex];
      const hasId = !!(idCell && idCell.formattedValue);
      if (hasId) return; // already has a unique ID, nothing to do

      updateCellsRequests.push({
        updateCells: {
          start: {
            sheetId: sheetId,
            rowIndex: 1, // row 2
            columnIndex: colIndex,
          },
          rows: [
            {
              values: [{ userEnteredValue: { stringValue: makeColumnId() } }],
            },
          ],
          fields: "userEnteredValue",
        },
      });
    });
  });

  // ---------------------------------------------------------------------
  // 3) WRITE — apply every missing ID in a single batchUpdate call.
  // ---------------------------------------------------------------------
  if (updateCellsRequests.length > 0) {
    Sheets.Spreadsheets.batchUpdate(
      { requests: updateCellsRequests },
      spreadsheetId,
    );
  }

  Logger.log(
    `ensureColumnIds: added ${updateCellsRequests.length} missing column ID(s).`,
  );
}

function makeColumnId() {
  const length = 7;
  const alphabet =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-";
  let result = "col-";
  for (let i = 0; i < length; i++) {
    result += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return result;
}

const test = {
  sheets: [
    {
      tables: [
        {
          tableId: "691006646",
          name: "allTableAttributes",
        },
      ],
      data: [
        {
          startColumn: 1,
          rowData: [
            {
              values: [
                {
                  formattedValue: "col-_NrBHfg",
                  effectiveValue: {
                    stringValue: "col-_NrBHfg",
                  },
                },
              ],
            },
            {
              values: [
                {
                  effectiveValue: {
                    stringValue: "Base ID",
                  },
                  formattedValue: "Base ID",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      tables: [
        {
          name: "test",
          tableId: "1321948538",
        },
      ],
      data: [
        {
          startColumn: 2,
          rowData: [
            {
              values: [
                {
                  effectiveValue: {
                    stringValue: "Number",
                  },
                },
              ],
            },
            {
              values: [
                {
                  effectiveValue: {
                    numberValue: 4,
                  },
                },
              ],
            },
            {
              values: [
                {
                  effectiveValue: {
                    numberValue: 11,
                  },
                },
              ],
            },
            {
              values: [
                {
                  effectiveValue: {
                    numberValue: 12,
                  },
                },
              ],
            },
            {
              values: [
                {
                  effectiveValue: {
                    numberValue: 13,
                  },
                },
              ],
            },
            {
              values: [
                {
                  effectiveValue: {
                    numberValue: 11,
                  },
                },
              ],
            },
            {
              values: [
                {
                  effectiveValue: {
                    numberValue: 12,
                  },
                },
              ],
            },
            {
              values: [
                {
                  effectiveValue: {
                    numberValue: 13,
                  },
                },
              ],
            },
          ],
        },
        {
          startColumn: 4,
          rowData: [
            {
              values: [
                {
                  effectiveValue: {
                    stringValue: "Date",
                  },
                },
              ],
            },
            {
              values: [
                {
                  effectiveValue: {
                    numberValue: 46233,
                  },
                },
              ],
            },
            {
              values: [
                {
                  effectiveValue: {
                    numberValue: 46233,
                  },
                },
              ],
            },
            {
              values: [
                {
                  effectiveValue: {
                    numberValue: 46233,
                  },
                },
              ],
            },
            {
              values: [
                {
                  effectiveValue: {
                    numberValue: 46233,
                  },
                },
              ],
            },
            {
              values: [
                {
                  effectiveValue: {
                    numberValue: 46233,
                  },
                },
              ],
            },
            {
              values: [
                {
                  effectiveValue: {
                    numberValue: 46233,
                  },
                },
              ],
            },
            {
              values: [
                {
                  formattedValue: "7/30/2026",
                  effectiveValue: {
                    numberValue: 46233,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
