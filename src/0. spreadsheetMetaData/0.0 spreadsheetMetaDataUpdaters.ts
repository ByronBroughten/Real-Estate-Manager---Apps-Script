import { Obj } from "../utils/Obj";

function buildSpreadsheetColumnMeta() {
  appendTableAttributes();
  fixTableNames();
  ensureColumnIds();
  pruneAllColumnAttributes();
  appendAllColumnAttributes();
  fixAllColumnAttributes();
}
function sortViaBatchUpdate() {
  const spreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();
  const sheetId = SpreadsheetApp.getActive()
    .getSheetByName("Data")
    .getSheetId();

  Sheets.Spreadsheets.batchUpdate(
    {
      requests: [
        {
          sortRange: {
            range: { sheetId, startRowIndex: 1, startColumnIndex: 0 }, // skip header, unbounded end = rest of sheet
            sortSpecs: [
              { dimensionIndex: 2, sortOrder: "ASCENDING" }, // column C
            ],
          },
        },
      ],
    },
    spreadsheetId,
  );
}

/**
 * Scans every sheet in the spreadsheet for native Google Sheets tables and
 * ensures the "All Table Attributes" sheet has one row per table (matched by
 * SheetNamed GID). Any tables missing from "All Table Attributes" are appended as
 * new rows, with "ID prefix" left blank for manual entry.
 *
 * Requires the "Sheets API" Advanced Service to be enabled for this project
 * (Resources > Advanced Google services > Google Sheets API).
 *
 * Makes at most 3 Sheets API calls:
 *   1) spreadsheets.get - fetch table/sheet metadata (properties + tables)
 *                          for EVERY sheet. No `ranges` filter here, because
 *                          specifying `ranges` causes the API to drop entire
 *                          sheets from the response, not just their cell
 *                          data - which would hide tables on other sheets.
 *   2) spreadsheets.get - fetch full cell data for ONLY the
 *                          "All Table Attributes" sheet (via `ranges`, which
 *                          is fine here since that's the one sheet we want).
 *   3) spreadsheets.batchUpdate - a single AppendCellsRequest with all new rows.
 *
 * If no tables are missing, no batchUpdate call is made at all.
 */
function appendTableAttributes() {
  const ATTR_SHEET_NAME = "All Table Attributes";
  const HEADER_GID = "SheetNamed GID";
  const HEADER_NAME = "Table name";
  const HEADER_PREFIX = "ID prefix";

  const spreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();

  // 1) Metadata (properties + tables) for every sheet - unfiltered, so no
  // sheets get dropped from the response.
  const metaResponse = Sheets.Spreadsheets.get(spreadsheetId, {
    fields: "sheets(properties(sheetId,title),tables(name,range))",
  });
  const sheets = metaResponse.sheets || [];

  const attrSheetMeta = sheets.find(
    (s) => s.properties.title === ATTR_SHEET_NAME,
  );
  if (!attrSheetMeta) {
    throw new Error('SheetNamed "' + ATTR_SHEET_NAME + '" not found.');
  }
  const attrSheetId = attrSheetMeta.properties.sheetId;

  const attrTables = attrSheetMeta.tables || [];
  if (attrTables.length === 0) {
    throw new Error('No native table found on "' + ATTR_SHEET_NAME + '".');
  }
  const attrTableRange = attrTables[0].range;
  const headerRowIndex = attrTableRange.startRowIndex;

  // 2) Full cell data for just the "All Table Attributes" sheet.
  const dataResponse = Sheets.Spreadsheets.get(spreadsheetId, {
    ranges: [ATTR_SHEET_NAME],
    fields: "sheets(data(rowData(values(formattedValue))))",
  });
  const attrSheetData = (dataResponse.sheets || [])[0];
  const rowData =
    (attrSheetData &&
      attrSheetData.data &&
      attrSheetData.data[0] &&
      attrSheetData.data[0].rowData) ||
    [];

  // Determine column positions from the header row (robust to column order).
  const headerRow = rowData[headerRowIndex];
  const headers = ((headerRow && headerRow.values) || []).map(
    (v) => (v && v.formattedValue) || "",
  );
  const gidCol = headers.indexOf(HEADER_GID);
  const nameCol = headers.indexOf(HEADER_NAME);
  const prefixCol = headers.indexOf(HEADER_PREFIX);

  if (gidCol === -1 || nameCol === -1 || prefixCol === -1) {
    throw new Error(
      'Could not locate expected headers on "' + ATTR_SHEET_NAME + '".',
    );
  }

  // Collect GIDs already described in the table's data rows.
  const lastDataRowExclusive =
    attrTableRange.endRowIndex !== undefined
      ? attrTableRange.endRowIndex
      : rowData.length;

  const existingGIDs = new Set();
  for (let r = headerRowIndex + 1; r < lastDataRowExclusive; r++) {
    const row = rowData[r];
    const cell = row && row.values && row.values[gidCol];
    if (
      cell &&
      cell.formattedValue !== undefined &&
      cell.formattedValue !== ""
    ) {
      existingGIDs.add(Number(cell.formattedValue));
    }
  }

  // Find every table in the spreadsheet whose sheet GID isn't yet described.
  const missing = [];
  sheets.forEach((sheet) => {
    const tables = sheet.tables || [];
    if (tables.length === 0) return;
    const sheetId = sheet.properties.sheetId;
    if (existingGIDs.has(sheetId)) return;
    // Per spec, exactly one table per sheet; describe it.
    missing.push({ sheetId: sheetId, tableName: tables[0].name });
  });

  if (missing.length === 0) {
    Logger.log(
      'No missing tables found. "%s" is already up to date.',
      ATTR_SHEET_NAME,
    );
    return;
  }

  // Build AppendCellsRequest rows, placing values in the correct columns
  // regardless of header order, leaving "ID prefix" blank.
  const width = Math.max(gidCol, nameCol, prefixCol) + 1;
  const rowsToAppend = missing.map((m) => {
    const values = new Array(width).fill(null).map(() => ({}));
    values[gidCol] = { userEnteredValue: { numberValue: m.sheetId } };
    values[nameCol] = { userEnteredValue: { stringValue: m.tableName } };
    // values[prefixCol] intentionally left as {} (blank) for manual entry.
    return { values: values };
  });

  Sheets.Spreadsheets.batchUpdate(
    {
      requests: [
        {
          appendCells: {
            sheetId: attrSheetId,
            rows: rowsToAppend,
            fields: "userEnteredValue",
          },
        },
      ],
    },
    spreadsheetId,
  );

  Logger.log(
    'Appended %s missing table row(s) to "%s": %s',
    missing.length,
    ATTR_SHEET_NAME,
    missing.map((m) => m.sheetId + " (" + m.tableName + ")").join(", "),
  );
}

/**
 * Scans every sheet in the spreadsheet for native Google Sheets tables and
 * checks the "All Table Attributes" sheet for rows whose "Table name" no
 * longer matches the actual current name of the table with that SheetNamed GID.
 * Any mismatched names are corrected in place. Rows whose SheetNamed GID doesn't
 * match any existing table are left untouched (that's a separate concern).
 *
 * Requires the "Sheets API" Advanced Service to be enabled for this project
 * (Resources > Advanced Google services > Google Sheets API).
 *
 * Makes at most 3 Sheets API calls:
 *   1) spreadsheets.get - fetch table/sheet metadata (properties + tables)
 *                          for EVERY sheet. No `ranges` filter here, because
 *                          specifying `ranges` causes the API to drop entire
 *                          sheets from the response, not just their cell
 *                          data - which would hide tables on other sheets.
 *   2) spreadsheets.get - fetch full cell data for ONLY the
 *                          "All Table Attributes" sheet (via `ranges`, which
 *                          is fine here since that's the one sheet we want),
 *                          to read the currently-recorded GIDs and names.
 *   3) spreadsheets.batchUpdate - one UpdateCellsRequest per mismatched row,
 *                          all submitted together in a single batchUpdate call.
 *
 * If no names are out of date, no batchUpdate call is made at all.
 */
function fixTableNames() {
  const ATTR_SHEET_NAME = "All Table Attributes";
  const HEADER_GID = "SheetNamed GID";
  const HEADER_NAME = "Table name";
  const HEADER_PREFIX = "ID prefix";

  const spreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();

  // 1) Metadata (properties + tables) for every sheet - unfiltered, so no
  // sheets get dropped from the response. This gives us the ACTUAL current
  // name of each native table, keyed by its sheet's GID.
  const metaResponse = Sheets.Spreadsheets.get(spreadsheetId, {
    fields: "sheets(properties(sheetId,title),tables(name,range))",
  });
  const sheets = metaResponse.sheets || [];

  const attrSheetMeta = sheets.find(
    (s) => s.properties.title === ATTR_SHEET_NAME,
  );
  if (!attrSheetMeta) {
    throw new Error('SheetNamed "' + ATTR_SHEET_NAME + '" not found.');
  }
  const attrSheetId = attrSheetMeta.properties.sheetId;

  const attrTables = attrSheetMeta.tables || [];
  if (attrTables.length === 0) {
    throw new Error('No native table found on "' + ATTR_SHEET_NAME + '".');
  }
  const attrTableRange = attrTables[0].range;
  const headerRowIndex = attrTableRange.startRowIndex;

  // Map of sheetId -> actual current table name (per spec, one table/sheet).
  const actualNameBySheetId = new Map();
  sheets.forEach((sheet) => {
    const tables = sheet.tables || [];
    if (tables.length > 0) {
      actualNameBySheetId.set(sheet.properties.sheetId, tables[0].name);
    }
  });

  // 2) Full cell data for just the "All Table Attributes" sheet - this is
  // what's currently RECORDED (may be stale).
  const dataResponse = Sheets.Spreadsheets.get(spreadsheetId, {
    ranges: [ATTR_SHEET_NAME],
    fields: "sheets(data(rowData(values(formattedValue))))",
  });
  const attrSheetData = (dataResponse.sheets || [])[0];
  const rowData =
    (attrSheetData &&
      attrSheetData.data &&
      attrSheetData.data[0] &&
      attrSheetData.data[0].rowData) ||
    [];

  // Determine column positions from the header row (robust to column order).
  const headerRow = rowData[headerRowIndex];
  const headers = ((headerRow && headerRow.values) || []).map(
    (v) => (v && v.formattedValue) || "",
  );
  const gidCol = headers.indexOf(HEADER_GID);
  const nameCol = headers.indexOf(HEADER_NAME);
  const prefixCol = headers.indexOf(HEADER_PREFIX);

  if (gidCol === -1 || nameCol === -1 || prefixCol === -1) {
    throw new Error(
      'Could not locate expected headers on "' + ATTR_SHEET_NAME + '".',
    );
  }

  const lastDataRowExclusive =
    attrTableRange.endRowIndex !== undefined
      ? attrTableRange.endRowIndex
      : rowData.length;

  // 3) Walk the recorded data rows and find ones whose recorded name is stale.
  const corrections = []; // { rowIndex, correctName }
  for (let r = headerRowIndex + 1; r < lastDataRowExclusive; r++) {
    const row = rowData[r];
    if (!row || !row.values) continue;

    const gidCell = row.values[gidCol];
    if (
      !gidCell ||
      gidCell.formattedValue === undefined ||
      gidCell.formattedValue === ""
    )
      continue;
    const sheetId = Number(gidCell.formattedValue);

    if (!actualNameBySheetId.has(sheetId)) continue; // no matching table; not our concern here

    const recordedName =
      (row.values[nameCol] && row.values[nameCol].formattedValue) || "";
    const actualName = actualNameBySheetId.get(sheetId);

    if (recordedName !== actualName) {
      corrections.push({ rowIndex: r, correctName: actualName });
    }
  }

  if (corrections.length === 0) {
    Logger.log(
      'No stale table names found. "%s" is already up to date.',
      ATTR_SHEET_NAME,
    );
    return;
  }

  // Build one UpdateCellsRequest per corrected row, targeting only the
  // "Table name" cell so nothing else in the row is touched.
  const requests = corrections.map((c) => ({
    updateCells: {
      range: {
        sheetId: attrSheetId,
        startRowIndex: c.rowIndex,
        endRowIndex: c.rowIndex + 1,
        startColumnIndex: nameCol,
        endColumnIndex: nameCol + 1,
      },
      rows: [
        {
          values: [{ userEnteredValue: { stringValue: c.correctName } }],
        },
      ],
      fields: "userEnteredValue",
    },
  }));

  Sheets.Spreadsheets.batchUpdate({ requests: requests }, spreadsheetId);

  Logger.log(
    'Corrected %s stale table name(s) in "%s": %s',
    corrections.length,
    ATTR_SHEET_NAME,
    corrections
      .map((c) => "row " + (c.rowIndex + 1) + ' -> "' + c.correctName + '"')
      .join(", "),
  );
}

/**
 * Ensures every table column has a unique ID in row 2 (above the row-3 header).
 * Uses the Advanced Sheets Service to do this in exactly 2 API calls total:
 *   1) spreadsheets.get   - reads all sheets' table ranges + row 2 values
 *   2) spreadsheets.batchUpdate - writes any missing IDs
 *
 * Requires: Advanced Google Service "Sheets API" enabled (Services -> Google Sheets API).
 */
function ensureColumnIds() {
  const spreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();

  // --- 1. Single read: sheet props, table ranges, and full row data (we only need row 2 values) ---
  const ss = Sheets.Spreadsheets.get(spreadsheetId, {
    fields:
      "sheets(properties(sheetId,title),tables(range),data(rowData(values(userEnteredValue))))",
  });

  const updateRequests = [];

  (ss.sheets || []).forEach((sheet) => {
    const tables = sheet.tables;
    if (!tables || tables.length === 0) return; // no native table on this sheet

    // Spec guarantees exactly one table per sheet, starting at column A.
    const table = tables[0];
    const range = table.range;
    const colStart = range.startColumnIndex || 0;
    const colEnd = range.endColumnIndex; // exclusive

    if (colEnd === undefined || colEnd === null) return;

    // RowNamed 2 is index 1 (row 1 = index 0, row 2 = index 1, row 3 header = index 2).
    const rowDataArr =
      (sheet.data && sheet.data[0] && sheet.data[0].rowData) || [];
    const row2 = rowDataArr[1];
    const row2Values = (row2 && row2.values) || [];

    const newRowValues = [];
    let hasMissing = false;

    for (let col = colStart; col < colEnd; col++) {
      const existingCell = row2Values[col];
      const existingVal = existingCell && existingCell.userEnteredValue;
      const isEmpty =
        !existingVal ||
        (existingVal.stringValue === undefined &&
          existingVal.numberValue === undefined &&
          existingVal.boolValue === undefined &&
          existingVal.formulaValue === undefined);

      if (isEmpty) {
        hasMissing = true;
        newRowValues.push({
          userEnteredValue: { stringValue: makeColumnId() },
        });
      } else {
        // Preserve the existing ID untouched.
        newRowValues.push({ userEnteredValue: existingVal });
      }
    }

    if (!hasMissing) return; // nothing to write for this sheet

    updateRequests.push({
      updateCells: {
        range: {
          sheetId: sheet.properties.sheetId,
          startRowIndex: 1,
          endRowIndex: 2,
          startColumnIndex: colStart,
          endColumnIndex: colEnd,
        },
        rows: [{ values: newRowValues }],
        fields: "userEnteredValue",
      },
    });
  });

  // --- 2. Single write: only if something is actually missing ---
  if (updateRequests.length > 0) {
    Sheets.Spreadsheets.batchUpdate(
      { requests: updateRequests },
      spreadsheetId,
    );
  }
}

/**
 * Provided helper: generates a random unique-ish column ID.
 */
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

/**
 * Deletes rows in the "All Column Attributes" table whose "Column ID" value
 * does not match any column ID actually present in row 2 of any native
 * table in the spreadsheet.
 *
 * Design goals:
 *  - Uses the Sheets Advanced Service (must be enabled: Apps Script editor
 *    -> Services -> add "Sheets API").
 *  - Minimizes API calls: 1 read call (spreadsheets.get with includeGridData)
 *    to gather every table's metadata + grid values, and 1 write call
 *    (spreadsheets.batchUpdate) to delete all stale rows at once.
 */
function pruneAllColumnAttributes() {
  const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
  const META_SHEET_GID = 2034522667;
  const META_SHEET_TITLE = "All Column Attributes";
  const COLUMN_ID_ROW_INDEX = 1; // row 2 is 0-based index 1

  // ---- 1 API call: pull sheet/table metadata + full grid values ----------
  const ss = Sheets.Spreadsheets.get(SPREADSHEET_ID, {
    includeGridData: true,
    fields:
      "sheets(" +
      "properties(sheetId,title)," +
      "tables(tableId,range,columnProperties(columnIndex,columnName))," +
      "data(rowData(values(formattedValue)))" +
      ")",
  });

  const sheets = ss.sheets || [];

  // ---- Build the set of every valid column ID in the spreadsheet ---------
  // (row 2, restricted to each sheet's single native table's column span)
  const validColumnIds = new Set();
  let metaSheet = null;

  sheets.forEach((sheet) => {
    const table = sheet.tables && sheet.tables[0];
    if (!table) return; // sheet has no native table; skip

    const startCol = table.range.startColumnIndex || 0;
    const endCol = table.range.endColumnIndex; // exclusive

    const rowData = sheet.data && sheet.data[0] && sheet.data[0].rowData;
    const row2Values =
      (rowData &&
        rowData[COLUMN_ID_ROW_INDEX] &&
        rowData[COLUMN_ID_ROW_INDEX].values) ||
      [];

    for (let c = startCol; c < endCol; c++) {
      const id = row2Values[c] && row2Values[c].formattedValue;
      if (id) validColumnIds.add(id);
    }

    if (
      sheet.properties.sheetId === META_SHEET_GID ||
      sheet.properties.title === META_SHEET_TITLE
    ) {
      metaSheet = sheet;
    }
  });

  if (!metaSheet) {
    throw new Error(
      'Could not locate the "' +
        META_SHEET_TITLE +
        '" sheet (sheetGid ' +
        META_SHEET_GID +
        ").",
    );
  }

  const metaTable = metaSheet.tables && metaSheet.tables[0];
  if (!metaTable) {
    throw new Error(
      'The "' + META_SHEET_TITLE + '" sheet has no native table.',
    );
  }
  const metaSheetId = metaSheet.properties.sheetId;

  // ---- Locate the "Column ID" column within the meta table ---------------
  const colProps = metaTable.columnProperties || [];
  const colIdOffset = colProps.findIndex((cp) => cp.columnName === "Column ID");
  if (colIdOffset === -1) {
    throw new Error(
      'Could not find a "Column ID" column in the ' +
        META_SHEET_TITLE +
        " table.",
    );
  }
  const absoluteColIdIndex =
    (metaTable.range.startColumnIndex || 0) + colIdOffset;

  // ---- Walk the meta table's data rows and flag stale ones ---------------
  const headerRowIndex = metaTable.range.startRowIndex; // row 3, 0-based
  const dataStart = headerRowIndex + 1;
  const dataEnd = metaTable.range.endRowIndex; // exclusive

  const metaRowData =
    (metaSheet.data && metaSheet.data[0] && metaSheet.data[0].rowData) || [];
  const rowsToDelete = [];

  for (let r = dataStart; r < dataEnd; r++) {
    const rowValues = (metaRowData[r] && metaRowData[r].values) || [];
    const columnId =
      rowValues[absoluteColIdIndex] &&
      rowValues[absoluteColIdIndex].formattedValue;
    if (!columnId || !validColumnIds.has(columnId)) {
      rowsToDelete.push(r);
    }
  }

  if (rowsToDelete.length === 0) {
    Logger.log("No stale rows found in " + META_SHEET_TITLE + ".");
    return;
  }

  // ---- 1 API call: delete every stale row in a single batchUpdate --------
  // Sort descending so earlier (lower-index) deletions aren't affected by
  // index shifts caused by deleting rows below them.
  rowsToDelete.sort((a, b) => b - a);

  const requests = rowsToDelete.map((rowIndex) => ({
    deleteDimension: {
      range: {
        sheetId: metaSheetId,
        dimension: "ROWS",
        startIndex: rowIndex,
        endIndex: rowIndex + 1,
      },
    },
  }));

  Sheets.Spreadsheets.batchUpdate({ requests: requests }, SPREADSHEET_ID);

  Logger.log(
    "Deleted " +
      rowsToDelete.length +
      " stale row(s) from " +
      META_SHEET_TITLE +
      ".",
  );
}

/**
 * Scans every native table in the spreadsheet and appends rows to the
 * "All Column Attributes" table describing any table column whose Column ID
 * (row 2) is not yet documented there.
 *
 * Requires the "Sheets" Advanced Google Service to be enabled
 * (Apps Script editor -> Services -> Google Sheets API).
 */
function appendAllColumnAttributes() {
  const META_SHEET_NAME = "All Column Attributes";
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const spreadsheetId = ss.getId();
  const sheets = ss.getSheets();

  // ---- 1. Single Sheets API read: table metadata + rows 2-4 of every
  //         sheet, plus the full "Column ID" column already in the meta
  //         table (so we know what's already documented).
  const metaSheetObj = sheets.find((sh) => sh.getName() === META_SHEET_NAME);
  if (!metaSheetObj)
    throw new Error(`SheetNamed "${META_SHEET_NAME}" not found.`);

  // The Sheets API's `ranges` filter doesn't reliably parse the open-ended
  // "B4:B" form, so bound it explicitly using the sheet's actual last row
  // (a local SpreadsheetApp call, not an extra Sheets API request).
  const metaLastRow = Math.max(metaSheetObj.getLastRow(), 4);

  const ranges = sheets.map((sh) => `'${sh.getName()}'!2:4`);
  ranges.push(`'${META_SHEET_NAME}'!B4:B${metaLastRow}`); // appended last, on purpose

  const resp = Sheets.Spreadsheets.get(spreadsheetId, {
    ranges: ranges,
    fields:
      "sheets(properties(sheetId,title),tables," +
      "data(rowData(values(userEnteredValue,effectiveValue,effectiveFormat.numberFormat))))",
    includeGridData: true,
  });

  // ---- 2. Index the response by sheet title.
  const byTitle = {};
  resp.sheets.forEach((s) => (byTitle[s.properties.title] = s));

  const metaEntry = byTitle[META_SHEET_NAME];
  if (!metaEntry) throw new Error(`SheetNamed "${META_SHEET_NAME}" not found.`);

  // The LAST data block for the meta sheet corresponds to the extra
  // 'All Column Attributes'!B4:B range appended above.
  const metaIdRows = metaEntry.data[metaEntry.data.length - 1].rowData || [];
  const existingIds = new Set();
  metaIdRows.forEach((r) => {
    const id = cellString((r.values || [])[0]);
    if (id) existingIds.add(id);
  });

  // ---- 3. Locate the meta table + map its headers to column indexes.
  const metaTable = (metaEntry.tables || [])[0];
  if (!metaTable)
    throw new Error(`No native table found on "${META_SHEET_NAME}".`);

  const metaColIndex = {};
  metaTable.columnProperties.forEach((cp, i) => {
    metaColIndex[cp.columnName] = i;
  });

  const REQUIRED_HEADERS = [
    "Column ID",
    "Table name",
    "Column name",
    "Is formula",
    "Value name",
  ];
  REQUIRED_HEADERS.forEach((h) => {
    if (!(h in metaColIndex)) {
      throw new Error(
        `"${META_SHEET_NAME}" is missing expected column "${h}".`,
      );
    }
  });

  // ---- 4. Walk every table on every sheet, collecting missing columns.
  const missingRows = []; // each entry: { colIndexInMetaTable: CellData }

  sheets.forEach((sh) => {
    const title = sh.getName();
    const entry = byTitle[title];
    if (!entry || !entry.tables || !entry.tables.length) return;

    const table = entry.tables[0];
    const rowData = entry.data[0].rowData || []; // rows 2,3,4 -> idx 0,1,2
    const row2 = (rowData[0] && rowData[0].values) || [];
    const row4 = (rowData[2] && rowData[2].values) || [];

    table.columnProperties.forEach((cp, colIdx) => {
      const colId = cellString(row2[colIdx]);
      if (!colId) return; // nothing to key off of
      if (existingIds.has(colId)) return; // already documented

      const header = cp.columnName || "";
      const camelHeader = sentenceToCamelCase(header);
      const row4Cell = row4[colIdx] || {};
      const isFormula = !!(
        row4Cell.userEnteredValue && row4Cell.userEnteredValue.formulaValue
      );
      const valueName = getValueName(header, cp, row4Cell);

      const rowValues = {};
      rowValues[metaColIndex["Column ID"]] = strVal(colId);
      rowValues[metaColIndex["Table name"]] = strVal(table.name);
      rowValues[metaColIndex["Column name"]] = strVal(camelHeader);
      rowValues[metaColIndex["Is formula"]] = boolVal(isFormula);
      rowValues[metaColIndex["Value name"]] = strVal(valueName);

      missingRows.push(rowValues);
      existingIds.add(colId); // guard against the same ID appearing twice
    });
  });

  if (!missingRows.length) {
    Logger.log("No missing columns found. Nothing to append.");
    return;
  }

  // ---- 5. Turn each collected row into a full-width RowData object and
  //         append directly under the meta table (auto-expands the table).
  const width = metaTable.columnProperties.length;
  const rows = missingRows.map((rowObj) => {
    const values = [];
    for (let c = 0; c < width; c++) {
      values.push(rowObj[c] || { userEnteredValue: { stringValue: "" } });
    }
    return { values: values };
  });

  Sheets.Spreadsheets.batchUpdate(
    {
      requests: [
        {
          appendCells: {
            sheetId: metaEntry.properties.sheetId,
            rows: rows,
            fields: "userEnteredValue",
          },
        },
      ],
    },
    spreadsheetId,
  );

  Logger.log(`Appended ${rows.length} row(s) to "${META_SHEET_NAME}".`);
}

// ---------------- helpers ----------------

function cellString(cellData) {
  if (!cellData) return null;
  if (cellData.effectiveValue) {
    const ev = cellData.effectiveValue;
    if (ev.stringValue !== undefined) return ev.stringValue;
    if (ev.numberValue !== undefined) return String(ev.numberValue);
    if (ev.boolValue !== undefined) return String(ev.boolValue);
  }
  if (
    cellData.userEnteredValue &&
    cellData.userEnteredValue.stringValue !== undefined
  ) {
    return cellData.userEnteredValue.stringValue;
  }
  return null;
}

function strVal(s) {
  return { userEnteredValue: { stringValue: String(s == null ? "" : s) } };
}

function boolVal(b) {
  return { userEnteredValue: { boolValue: !!b } };
}

/**
 * Determines a column's "value name" per the three-step fallback:
 * 1. Header === "Base ID"          -> "baseId"
 * 2. Validation rule "=range[...]" -> camelCase of bracket contents
 * 3. Otherwise, infer from the row-4 cell's type/format.
 */
function getValueName(header, columnProperties, row4Cell) {
  if (header === "Base ID") return "baseId";

  const rule = columnProperties.dataValidationRule;
  const uev =
    rule &&
    rule.condition &&
    rule.condition.values &&
    rule.condition.values[0] &&
    rule.condition.values[0].userEnteredValue;

  if (uev) {
    const match = /^=range\[(.+)\]$/i.exec(uev.trim());
    if (match) return sentenceToCamelCase(match[1]);
  }

  return inferTypeFromCell(row4Cell);
}

function inferTypeFromCell(cellData) {
  const ev = cellData.effectiveValue || {};
  const numFmt =
    cellData.effectiveFormat &&
    cellData.effectiveFormat.numberFormat &&
    cellData.effectiveFormat.numberFormat.type;

  if (ev.boolValue !== undefined) return "boolean";
  if (ev.numberValue !== undefined) {
    if (numFmt === "DATE" || numFmt === "DATE_TIME" || numFmt === "TIME") {
      return "date";
    }
    return "number";
  }
  if (ev.stringValue !== undefined) return "string";
  return "string"; // fallback for errors/blank/unexpected cases
}

/**
 * Audits the "All Column Attributes" sheet against the real tables in the
 * spreadsheet and corrects any incorrect existing rows (never adds/removes rows).
 * Uses exactly 2 read calls (table/validation metadata, then cell data) and
 * 1 write call (batchUpdate), regardless of spreadsheet size.
 */
function fixAllColumnAttributes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const spreadsheetId = ss.getId();
  const ACA_SHEET_ID = 2034522667;

  const ACA_HEADERS = [
    "Column ID",
    "Table name",
    "Column name",
    "Is formula",
    "Value name",
  ];

  // ---------------------------------------------------------------------
  // 1) Lightweight call: sheet/table structure + validation rules only.
  // ---------------------------------------------------------------------
  const meta = Sheets.Spreadsheets.get(spreadsheetId, {
    fields:
      "sheets(properties(sheetId,title),tables(name,range,columnProperties(columnIndex,dataValidationRule)))",
  });

  if (!meta || !meta.sheets)
    throw new Error("spreadsheets.get (metadata) returned no sheets.");

  const sheetInfos = [];
  const ranges = [];

  meta.sheets.forEach((sheet) => {
    if (!sheet || !sheet.properties) return;
    if (!sheet.tables || sheet.tables.length === 0) return;

    const table = sheet.tables[0];
    if (!table.range) {
      Logger.log(
        `Skipping sheet "${sheet.properties.title}" — table has no range.`,
      );
      return;
    }

    const r = table.range;
    const startRow = (r.startRowIndex || 0) - 1; // ID row sits one above table's header row
    const endRow = r.endRowIndex;
    const startCol = r.startColumnIndex || 0;
    const endCol = r.endColumnIndex;

    if (startRow < 0 || endRow == null || endCol == null) {
      Logger.log(
        `Skipping sheet "${sheet.properties.title}" — incomplete range data.`,
      );
      return;
    }

    const isAca = sheet.properties.sheetId === ACA_SHEET_ID;
    const fetchEndRow = isAca ? endRow : Math.min(startRow + 3, endRow);

    const escapedTitle = sheet.properties.title.replace(/'/g, "''");
    ranges.push(
      `'${escapedTitle}'!${colToA1(startCol)}${startRow + 1}:${colToA1(endCol - 1)}${fetchEndRow}`,
    );

    sheetInfos.push({
      sheetId: sheet.properties.sheetId,
      title: sheet.properties.title,
      table,
      startRow,
      endRow,
      startCol,
      endCol,
      isAca,
    });
  });

  if (ranges.length === 0)
    throw new Error("No valid tables found anywhere in the spreadsheet.");

  // ---------------------------------------------------------------------
  // 2) Single call for needed cell data across every sheet's table.
  // ---------------------------------------------------------------------
  const dataResp = Sheets.Spreadsheets.get(spreadsheetId, {
    ranges: ranges,
    fields:
      "sheets(properties(sheetId),data(rowData(values(userEnteredValue,effectiveValue,formattedValue,effectiveFormat.numberFormat.type))))",
  });

  if (!dataResp || !dataResp.sheets)
    throw new Error("spreadsheets.get (cell data) returned no sheets.");

  const dataBySheetId = {};
  dataResp.sheets.forEach((s) => {
    if (!s || !s.properties) return;
    const rowData =
      s.data && s.data[0] && s.data[0].rowData ? s.data[0].rowData : [];
    dataBySheetId[s.properties.sheetId] = rowData;
  });

  // ---------------------------------------------------------------------
  // Compute correct attributes for every column ID in the spreadsheet.
  // ---------------------------------------------------------------------
  const computedById = {};

  sheetInfos.forEach((info) => {
    try {
      const rowData = dataBySheetId[info.sheetId] || [];
      const idRowValues = safeValues(rowData, 0);
      const headerRowValues = safeValues(rowData, 1);
      const firstDataRowValues = safeValues(rowData, 2);

      const table = info.table;
      const columnProps = table.columnProperties || [];
      const colCount = info.endCol - info.startCol;

      for (let i = 0; i < colCount; i++) {
        const columnId = getCellString(idRowValues[i]);
        if (!columnId) continue;

        const header = getCellString(headerRowValues[i]);
        const row4Cell = firstDataRowValues[i];
        const thisColProps =
          columnProps.find((cp) => cp && cp.columnIndex === i) || {};

        const isFormula = !!(
          row4Cell &&
          row4Cell.userEnteredValue &&
          row4Cell.userEnteredValue.formulaValue !== undefined
        );
        const valueName = computeValueName(header, thisColProps, row4Cell);
        const columnName = sentenceToCamelCase(header || "");
        const tableName = table.name || "";

        computedById[columnId] = {
          tableName,
          columnName,
          isFormula,
          valueName,
        };
      }
    } catch (err) {
      Logger.log(
        `Error processing sheet "${info.title}" (sheetId ${info.sheetId}): ${err.message}`,
      );
      throw err; // rethrow with context so you know exactly which sheet failed
    }
  });

  // ---------------------------------------------------------------------
  // Walk All Column Attributes' own rows and diff against computedById.
  // ---------------------------------------------------------------------
  const acaInfo = sheetInfos.find((s) => s.sheetId === ACA_SHEET_ID);
  if (!acaInfo)
    throw new Error(
      "Could not find the All Column Attributes table in sheetInfos.",
    );

  const acaRowData = dataBySheetId[ACA_SHEET_ID] || [];
  const acaHeaderRowValues = safeValues(acaRowData, 1);

  const colIdx = {};
  ACA_HEADERS.forEach((h) => {
    const idx = acaHeaderRowValues.findIndex(
      (cell) => getCellString(cell).trim().toLowerCase() === h.toLowerCase(),
    );
    if (idx === -1)
      throw new Error(
        `Could not locate "${h}" header in All Column Attributes.`,
      );
    colIdx[h] = idx;
  });

  const minColIdx = Math.min(...Obj.values(colIdx));
  const maxColIdx = Math.max(...Obj.values(colIdx));

  const requests = [];
  let updatedCount = 0;

  for (let k = 2; k < acaRowData.length; k++) {
    const rowValues = safeValues(acaRowData, k);
    if (rowValues.length === 0) continue;

    const columnId = getCellString(rowValues[colIdx["Column ID"]]);
    if (!columnId) continue;

    const correct = computedById[columnId];
    if (!correct) continue; // out of scope: no matching column found elsewhere

    const current = {
      tableName: getCellString(rowValues[colIdx["Table name"]]),
      columnName: getCellString(rowValues[colIdx["Column name"]]),
      isFormula: getCellBool(rowValues[colIdx["Is formula"]]),
      valueName: getCellString(rowValues[colIdx["Value name"]]),
    };

    const needsUpdate =
      current.tableName !== correct.tableName ||
      current.columnName !== correct.columnName ||
      current.isFormula !== correct.isFormula ||
      current.valueName !== correct.valueName;

    if (!needsUpdate) continue;

    const values = [];
    for (let c = minColIdx; c <= maxColIdx; c++) {
      if (c === colIdx["Table name"]) {
        values.push({ userEnteredValue: { stringValue: correct.tableName } });
      } else if (c === colIdx["Column name"]) {
        values.push({ userEnteredValue: { stringValue: correct.columnName } });
      } else if (c === colIdx["Is formula"]) {
        values.push({ userEnteredValue: { boolValue: correct.isFormula } });
      } else if (c === colIdx["Value name"]) {
        values.push({ userEnteredValue: { stringValue: correct.valueName } });
      } else if (c === colIdx["Column ID"]) {
        values.push({ userEnteredValue: { stringValue: columnId } });
      } else {
        values.push({});
      }
    }

    const sheetRowIndex0 = acaInfo.startRow + k;

    requests.push({
      updateCells: {
        range: {
          sheetId: ACA_SHEET_ID,
          startRowIndex: sheetRowIndex0,
          endRowIndex: sheetRowIndex0 + 1,
          startColumnIndex: acaInfo.startCol + minColIdx,
          endColumnIndex: acaInfo.startCol + maxColIdx + 1,
        },
        rows: [{ values }],
        fields: "userEnteredValue",
      },
    });

    updatedCount++;
  }

  if (requests.length > 0) {
    Sheets.Spreadsheets.batchUpdate({ requests }, spreadsheetId);
  }

  Logger.log(`All Column Attributes: ${updatedCount} row(s) updated.`);
  return updatedCount;
}

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

function safeValues(rowData, index) {
  return rowData && rowData[index] && rowData[index].values
    ? rowData[index].values
    : [];
}

function computeValueName(header, columnProps, row4Cell) {
  if (header && header.trim() === "Base ID") return "baseId";

  const dv = columnProps && columnProps.dataValidationRule;
  const condValues = dv && dv.condition && dv.condition.values;
  const rawCondValue =
    condValues && condValues[0] ? condValues[0].userEnteredValue : null;

  if (rawCondValue) {
    const match = /^=validationList\[(.+)\]$/.exec(rawCondValue.trim());
    if (match) return sentenceToCamelCase(match[1]);
  }

  if (!row4Cell) return "string";

  const ev = row4Cell.effectiveValue;
  const numberFormatType =
    row4Cell.effectiveFormat &&
    row4Cell.effectiveFormat.numberFormat &&
    row4Cell.effectiveFormat.numberFormat.type;

  if (ev && ev.numberValue !== undefined) {
    if (
      numberFormatType === "DATE" ||
      numberFormatType === "DATE_TIME" ||
      numberFormatType === "TIME"
    ) {
      return "date";
    }
    return "number";
  }

  if (ev && ev.boolValue !== undefined) return "boolean";

  return "string";
}

function getCellString(cell) {
  if (!cell) return "";
  if (cell.effectiveValue && cell.effectiveValue.stringValue !== undefined) {
    return cell.effectiveValue.stringValue;
  }
  if (cell.formattedValue !== undefined) return cell.formattedValue;
  return "";
}

function getCellBool(cell) {
  if (!cell) return false;
  if (cell.effectiveValue && cell.effectiveValue.boolValue !== undefined) {
    return cell.effectiveValue.boolValue;
  }
  return String(getCellString(cell)).trim().toLowerCase() === "true";
}

function colToA1(colIndex0) {
  let col = colIndex0 + 1;
  let letters = "";
  while (col > 0) {
    const rem = (col - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    col = Math.floor((col - 1) / 26);
  }
  return letters;
}

function sentenceToCamelCase(sentence) {
  return sentence
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((word, index) => {
      if (index === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join("");
}
