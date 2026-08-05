function buildSpreadsheetColumnMeta() {
  ensureIdColumnOnAllTables();
  fillMissingRowIds();

  appendTableAttributes();
  fixTableNames();

  // ensureColumnIds();
  pruneAllColumnAttributes();
  appendAllColumnAttributes();
  syncAllColumnAttributes();
}

function sentenceToCamelCase(sentence) {
  return sentence
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "") // remove straight & curly apostrophes
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((word, index) => {
      if (index === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join("");
}

function makeRowId(idPrefix) {
  const length = 7;
  const alphabet =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-";
  let result = idPrefix + "-";
  for (let i = 0; i < length; i++) {
    result += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return result;
}

const tableNames = {
  "210603630": "allTableAttributes",
  "1967106628": "config",
  "2119236084": "validationList",
  "243663296": "year",
  "290870631": "api",
  "706564734": "buildOccLedger",
  "1202471195": "addOccChargeOnetime",
  "1485718763": "addHhPaymentOnetime",
  "1964495656": "addExpenses",
  "87312116": "propertyProspect",
  "1631083349": "householdProspect",
  "522260317": "tenantPros",
  "619816967": "property",
  "1237193065": "furnace",
  "321313883": "unit",
  "1934805379": "resident",
  "560379920": "pet",
  "0": "household",
  "1079739305": "occupancy",
  "471889863": "nonResidentPayer",
  "939656506": "paymentGroup",
  "445175805": "occupancyTerms",
  "825934775": "occCharge",
  "1817648883": "occChargeReduce",
  "1544131100": "occPayment",
  "348639454": "occPayAllocation",
  "1281153954": "subsidyWorker",
  "332858329": "subsidyProgram",
  "1155067179": "subsidyAgreement",
  "194710324": "subsidyTerms",
  "1467694925": "subsidyCharge",
  "1105274181": "subsidyPayment",
  "186254136": "subPayAllocation",
  "1536785367": "biller",
  "449009036": "propertyExpense",
  "41846794": "businessExpense",
  "802789198": "propertyYear",
  "1452711715": "householdYear",
  "731807482": "hhLedger",
  "2034522667": "allColumnAttributes",
  "2089200354": "test",
  "1246014413": "export",
  "1814139876": "finance",
  "443518874": "recurringTransaction",
  "2007051676": "quotes",
  "368826933": "rentComp",
  "1485032491": "paymentStandard",
  "73926003": "materialCost",
  "1539440300": "capex",
  "695651834": "variable",
  "1529539239": "valueName",
};
const sheetIdPrefixes = {
  "210603630": "tab",
  "1967106628": "cnf",
  "2119236084": "rng",
  "243663296": "yer",
  "290870631": "api",
  "706564734": "bol",
  "1202471195": "aoco",
  "1485718763": "aopo",
  "1964495656": "ape",
  "87312116": "ppr",
  "1631083349": "hpr",
  "522260317": "rpr",
  "619816967": "prp",
  "1237193065": "frn",
  "321313883": "unt",
  "1934805379": "rsd",
  "560379920": "pet",
  "0": "hsh",
  "1079739305": "occ",
  "471889863": "nrp",
  "939656506": "pgr",
  "445175805": "otr",
  "825934775": "och",
  "1817648883": "ocr",
  "1544131100": "opy",
  "348639454": "opa",
  "1281153954": "swr",
  "332858329": "spr",
  "1155067179": "sag",
  "194710324": "str",
  "1467694925": "sch",
  "1105274181": "spy",
  "186254136": "spa",
  "1536785367": "bil",
  "449009036": "pex",
  "41846794": "bex",
  "802789198": "pyr",
  "1452711715": "oyr",
  "731807482": "old",
  "2034522667": "col",
  "2089200354": "tst",
  "1246014413": "epr",
  "1814139876": "fnc",
  "443518874": "rtr",
  "2007051676": "qts",
  "368826933": "rcp",
  "1485032491": "pst",
  "73926003": "mcs",
  "1539440300": "cpx",
  "695651834": "vrb",
  "1529539239": "vnm",
};

function ensureIdColumnOnAllTables() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const spreadsheetId = ss.getId();
  const sheets = ss.getSheets();
  if (sheets.length === 0) return;

  // ---------------------------------------------------------------------
  // 1. SINGLE READ CALL
  //    getByDataFilter lets us ask, in one request, for:
  //      a) every sheet's table definition (tableId + exact range), and
  //      b) just row 3 (the header row) of every sheet's grid data.
  //    That's everything we need to decide which tables are missing "ID",
  //    without pulling the whole spreadsheet.
  // ---------------------------------------------------------------------
  const dataFilters = sheets.map(function (sheet) {
    return {
      gridRange: {
        sheetId: sheet.getSheetId(),
        startRowIndex: 2, // row 3, 0-indexed
        endRowIndex: 3,
      },
    };
  });

  const readResp = Sheets.Spreadsheets.getByDataFilter(
    {
      dataFilters: dataFilters,
      includeGridData: true,
    },
    spreadsheetId,
    {
      fields:
        "sheets(properties(sheetId,title),tables(tableId,range)," +
        "data(rowData(values(formattedValue))))",
    },
  );

  // ---------------------------------------------------------------------
  // 2. Decide which sheets need a fix
  // ---------------------------------------------------------------------
  const requests = [];
  let fixedCount = 0;

  (readResp.sheets || []).forEach(function (sheetResult) {
    const sheetId = sheetResult.properties.sheetId;
    const table = (sheetResult.tables || [])[0];
    if (!table) return; // no native table on this sheet -> nothing to do

    const startCol = table.range.startColumnIndex || 0; // should be 0 (col A)
    const endCol = table.range.endColumnIndex; // exclusive

    const rowValues =
      (sheetResult.data &&
        sheetResult.data[0] &&
        sheetResult.data[0].rowData &&
        sheetResult.data[0].rowData[0] &&
        sheetResult.data[0].rowData[0].values) ||
      [];

    const headerTexts = rowValues.slice(startCol, endCol).map(function (v) {
      return v && v.formattedValue ? v.formattedValue.trim().toLowerCase() : "";
    });

    if (headerTexts.indexOf("id") !== -1) return; // already has an ID column

    // --- Build the fix for this sheet ----------------------------------
    // a) Insert a whole new column at position A (index 0). Because the
    //    insertion point coincides exactly with the table's left edge
    //    (startColumnIndex), Sheets treats the new column as belonging to
    //    the table and *expands* table.range to include it, rather than
    //    just shifting the whole table one column to the right. This is
    //    the documented way to add a column "within" a table
    //    (see: Sheets API guide -> Tables -> "Modify the table size").
    requests.push({
      insertDimension: {
        range: {
          sheetId: sheetId,
          dimension: "COLUMNS",
          startIndex: 0,
          endIndex: 1,
        },
        inheritFromBefore: false, // nothing exists before column A to inherit from
      },
    });

    // b) Label the newly inserted header cell (row 3, column A) "ID".
    requests.push({
      updateCells: {
        range: {
          sheetId: sheetId,
          startRowIndex: 2,
          endRowIndex: 3,
          startColumnIndex: 0,
          endColumnIndex: 1,
        },
        rows: [{ values: [{ userEnteredValue: { stringValue: "ID" } }] }],
        fields: "userEnteredValue",
      },
    });

    fixedCount++;
  });

  if (requests.length === 0) {
    Logger.log(
      'Every table already has an "ID" header column. No changes made.',
    );
    return;
  }

  // ---------------------------------------------------------------------
  // 3. SINGLE WRITE CALL - apply every fix (across every sheet) at once
  // ---------------------------------------------------------------------
  Sheets.Spreadsheets.batchUpdate({ requests: requests }, spreadsheetId);

  Logger.log('Added an "ID" header column to ' + fixedCount + " table(s).");
}

function fillMissingRowIds() {
  const ID_HEADER_TEXT = "ID";

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const spreadsheetId = ss.getId();
  const targetSheetIds = Object.keys(sheetIdPrefixes).map(Number);

  // -------------------------------------------------------------------
  // 1) ONE metadata-only call: every sheet's native Table definition.
  //    Gives us, per table, its exact row/column bounds and column
  //    names -- with zero cell data transferred.
  // -------------------------------------------------------------------
  const metaFields =
    "sheets(properties.sheetId," +
    "tables(range,rowsProperties.footerColorStyle," +
    "columnProperties(columnIndex,columnName)))";

  const meta = Sheets.Spreadsheets.get(spreadsheetId, { fields: metaFields });

  // sheetId -> { idColumnIndex, dataStartRow, dataEndRow (exclusive) }
  const tableInfoBySheet = {};

  (meta.sheets || []).forEach((sheet) => {
    const sheetId = sheet.properties.sheetId;
    if (targetSheetIds.indexOf(sheetId) === -1) return; // not one of ours

    const tables = sheet.tables || [];
    if (tables.length !== 1) {
      throw new Error(
        `Sheet ${sheetId} has ${tables.length} native table(s); expected exactly 1.`,
      );
    }
    const table = tables[0];

    const idCol = table.columnProperties.find(
      (c) => (c.columnName || "").trim() === ID_HEADER_TEXT,
    );
    if (!idCol) {
      throw new Error(
        `Sheet ${sheetId}: no column named "${ID_HEADER_TEXT}" found in its table.`,
      );
    }

    const dataStartRow = table.range.startRowIndex + 1; // skip header row
    const dataEndRow = table.range.endRowIndex;
    if (dataEndRow > dataStartRow) {
      tableInfoBySheet[sheetId] = {
        idColumnIndex: table.range.startColumnIndex + idCol.columnIndex,
        dataStartRow: dataStartRow,
        dataEndRow: dataEndRow,
      };
    }
    // else: table has no data rows at all -- nothing to check/fill.
  });

  const sheetsWithData = Object.keys(tableInfoBySheet).map(Number);
  if (sheetsWithData.length === 0) {
    Logger.log("No data rows found in any table; nothing to do.");
    return;
  }

  // -------------------------------------------------------------------
  // 2) ONE call: fetch ONLY the ID column's cells, only across each
  //    table's real data rows -- never the whole table, never "to the
  //    bottom of the sheet".
  // -------------------------------------------------------------------
  const dataFilters = sheetsWithData.map((sheetId) => {
    const info = tableInfoBySheet[sheetId];
    return {
      gridRange: {
        sheetId: sheetId,
        startRowIndex: info.dataStartRow,
        endRowIndex: info.dataEndRow,
        startColumnIndex: info.idColumnIndex,
        endColumnIndex: info.idColumnIndex + 1,
      },
    };
  });

  // getByDataFilter returns NO grid data at all unless you set a fields
  // mask (or includeGridData=true, which is far heavier). We only need
  // effectiveValue.stringValue to test for a non-empty string ID.
  const dataFields =
    "sheets(properties.sheetId,data.rowData.values.effectiveValue)";

  const idColumnData = Sheets.Spreadsheets.getByDataFilter(
    { dataFilters: dataFilters },
    spreadsheetId,
    { fields: dataFields },
  );

  // -------------------------------------------------------------------
  // 3) Walk each table's ID column and build write requests only for
  //    the rows missing a non-empty string ID. Contiguous missing rows
  //    are grouped into a single UpdateCellsRequest each, to keep the
  //    eventual batchUpdate payload small.
  // -------------------------------------------------------------------
  const updateRequests = [];
  let filledCount = 0;

  (idColumnData.sheets || []).forEach((sheetResult) => {
    const sheetId = sheetResult.properties.sheetId;
    const info = tableInfoBySheet[sheetId];
    const idPrefix = sheetIdPrefixes[String(sheetId)];
    const gridData = sheetResult.data && sheetResult.data[0];
    const rowData = (gridData && gridData.rowData) || [];

    let runStart = -1;
    let runIds = [];

    const flushRun = () => {
      if (runStart === -1) return;
      updateRequests.push({
        updateCells: {
          range: {
            sheetId: sheetId,
            startRowIndex: info.dataStartRow + runStart,
            endRowIndex: info.dataStartRow + runStart + runIds.length,
            startColumnIndex: info.idColumnIndex,
            endColumnIndex: info.idColumnIndex + 1,
          },
          rows: runIds.map((id) => ({
            values: [{ userEnteredValue: { stringValue: id } }],
          })),
          fields: "userEnteredValue",
        },
      });
      filledCount += runIds.length;
      runStart = -1;
      runIds = [];
    };

    // rowData can be shorter than the requested range if trailing rows
    // are entirely empty -- treat any missing entry as an empty cell.
    const rowCount = info.dataEndRow - info.dataStartRow;
    for (let offset = 0; offset < rowCount; offset++) {
      const row = rowData[offset];
      const cell = row && row.values && row.values[0];
      const value =
        cell && cell.effectiveValue && cell.effectiveValue.stringValue;
      const hasId = typeof value === "string" && value.trim() !== "";

      if (hasId) {
        flushRun();
      } else {
        if (runStart === -1) runStart = offset;
        runIds.push(makeRowId(idPrefix));
      }
    }
    flushRun();
  });

  // -------------------------------------------------------------------
  // 4) ONE call (only if needed): write every generated ID back.
  // -------------------------------------------------------------------
  if (updateRequests.length > 0) {
    Sheets.Spreadsheets.batchUpdate(
      { requests: updateRequests },
      spreadsheetId,
    );
  }

  Logger.log(
    `Filled ${filledCount} missing ID(s) across ${updateRequests.length} contiguous run(s) ` +
      `in ${sheetsWithData.length} table(s).`,
  );
}

function appendTableAttributes() {
  const ATTR_SHEET_NAME = "All Table Attributes";
  const HEADER_GID = "Sheet GID";
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
    throw new Error('Sheet "' + ATTR_SHEET_NAME + '" not found.');
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

function fixTableNames() {
  const ATTR_SHEET_NAME = "All Table Attributes";
  const HEADER_GID = "Sheet GID";
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
    throw new Error('Sheet "' + ATTR_SHEET_NAME + '" not found.');
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

// Ensure column ids

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
        '" sheet (gid ' +
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

function appendColumnRows(spreadsheetId) {
  spreadsheetId =
    spreadsheetId || SpreadsheetApp.getActiveSpreadsheet().getId();

  const ALL_COLUMN_ATTRIBUTES_GID = 2034522667;

  // ---- 1. One getByDataFilter call covering every sheet. ----
  // Row 2 (zero-based index 1) holds column IDs for every table. For
  // "All Column Attributes" the filter is left open-ended (no
  // endRowIndex) so it also returns row 3 (headers) and rows 4+ (its
  // existing data) in the same call.
  const dataFilters = Object.keys(tableNames).map(function (gidStr) {
    const sheetId = Number(gidStr);
    const gridRange: {
      sheetId: number;
      startRowIndex: number;
      endRowIndex?: number;
    } = { sheetId: sheetId, startRowIndex: 1 }; // row 2 onward
    if (sheetId !== ALL_COLUMN_ATTRIBUTES_GID) {
      gridRange.endRowIndex = 2; // row 2 only
    }
    return { gridRange: gridRange };
  });

  // A "fields" mask is critical here: without it, the API returns the full
  // CellData object for every cell — including all formatting metadata
  // (borders, colors, number formats, etc.) — which multiplied across every
  // sheet plus the open-ended All Column Attributes range is what triggers
  // "Response Code: 413. Message: response too large." Restricting the
  // response to just sheetId + formattedValue keeps the payload minimal.
  const readResponse = Sheets.Spreadsheets.getByDataFilter(
    { dataFilters: dataFilters, includeGridData: true },
    spreadsheetId,
    {
      fields:
        "sheets.properties.sheetId,sheets.data.rowData.values.formattedValue",
    },
  );

  const sheetsById = {};
  (readResponse.sheets || []).forEach(function (sheet) {
    sheetsById[sheet.properties.sheetId] = sheet;
  });

  function cellText(cell) {
    return cell && cell.formattedValue ? cell.formattedValue.trim() : "";
  }

  // Row 2 is always the first RowData returned for a sheet, since every
  // filter's startRowIndex is 1.
  function getRow2Values(sheetId) {
    const sheet = sheetsById[sheetId];
    const rowData =
      sheet && sheet.data && sheet.data[0] && sheet.data[0].rowData;
    const row = rowData && rowData[0];
    return (row && row.values) || [];
  }

  // ---- 2. Locate "Column ID" / "Table name" columns in All Column Attributes. ----
  const allColAttrSheet = sheetsById[ALL_COLUMN_ATTRIBUTES_GID];
  const allColAttrRows =
    (allColAttrSheet &&
      allColAttrSheet.data &&
      allColAttrSheet.data[0] &&
      allColAttrSheet.data[0].rowData) ||
    [];
  // allColAttrRows[0] = row 2 (IDs), [1] = row 3 (headers), [2..] = row 4+ (data)

  const headerRowValues = (allColAttrRows[1] && allColAttrRows[1].values) || [];
  let colIdColIndex = -1;
  let tableNameColIndex = -1;
  headerRowValues.forEach(function (cell, idx) {
    const key = sentenceToCamelCase(cellText(cell));
    if (key === "id") colIdColIndex = idx;
    if (key === "tableName") tableNameColIndex = idx;
  });

  if (colIdColIndex === -1 || tableNameColIndex === -1) {
    throw new Error(
      'Could not locate "ID" and/or "Table name" headers in row 3 of All Column Attributes.',
    );
  }

  // ---- 3. Existing column IDs already documented (rows 4+). ----
  const existingColumnIds = new Set();
  for (let r = 2; r < allColAttrRows.length; r++) {
    const values = allColAttrRows[r].values || [];
    const id = cellText(values[colIdColIndex]);
    if (id) existingColumnIds.add(id);
  }

  // ---- 4. Find every column, across every sheet, missing from that set. ----
  const missingRows = [];
  Object.keys(tableNames).forEach(function (gidStr) {
    const sheetId = Number(gidStr);
    const tableName = tableNames[gidStr];
    getRow2Values(sheetId).forEach(function (cell) {
      const columnId = cellText(cell);
      if (!columnId) return; // blank/trailing cell, not a real column
      if (existingColumnIds.has(columnId)) return; // already documented
      existingColumnIds.add(columnId); // guard against duplicate IDs across sheets
      missingRows.push({ columnId: columnId, tableName: tableName });
    });
  });

  if (missingRows.length === 0) {
    Logger.log(
      "All Column Attributes is already up to date. No rows appended.",
    );
    return { appended: 0, columnIds: [] };
  }

  // ---- 5. One batchUpdate call to append all missing rows. ----
  const numCols = Math.max(colIdColIndex, tableNameColIndex) + 1;
  const rows = missingRows.map(function (col) {
    const values = [];
    for (let i = 0; i < numCols; i++) values.push({});
    values[colIdColIndex] = { userEnteredValue: { stringValue: col.columnId } };
    values[tableNameColIndex] = {
      userEnteredValue: { stringValue: col.tableName },
    };
    return { values: values };
  });

  Sheets.Spreadsheets.batchUpdate(
    {
      requests: [
        {
          appendCells: {
            sheetId: ALL_COLUMN_ATTRIBUTES_GID,
            rows: rows,
            fields: "userEnteredValue",
          },
        },
      ],
    },
    spreadsheetId,
  );

  const appendedIds = missingRows.map(function (c) {
    return c.columnId;
  });
  Logger.log(
    "Appended " +
      missingRows.length +
      " row(s) to All Column Attributes: " +
      appendedIds.join(", "),
  );

  return { appended: missingRows.length, columnIds: appendedIds };
}

function syncAllColumnAttributes() {
  const spreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();

  const ALL_COL_ATTR_SHEET_ID = 2034522667;

  // ---- 1. One getByDataFilter call that pulls everything we need ----
  // For every sheet: row 2 (column IDs), row 3 (headers), row 4 (first data
  // row — used to detect "is formula" and to infer data type).
  // For "All Column Attributes" specifically: row 2 through the last row,
  // since its rows from row 4 onward are the records we need to validate.
  const dataFilters = Object.keys(tableNames).map(function (gid) {
    const sheetId = Number(gid);
    const gridRange: {
      sheetId: number;
      startRowIndex: number;
      endRowIndex?: number;
    } = { sheetId: sheetId, startRowIndex: 1 }; // row 2 onward (0-based)
    if (sheetId !== ALL_COL_ATTR_SHEET_ID) {
      gridRange.endRowIndex = 4; // stop after row 4
    }
    return { gridRange: gridRange };
  });

  const fields =
    "sheets(properties(sheetId)," +
    "data(rowData(values(formattedValue,effectiveValue,userEnteredValue,effectiveFormat.numberFormat.type)))," +
    "tables(columnProperties(dataValidationRule.condition.values.userEnteredValue)))";

  const response = Sheets.Spreadsheets.getByDataFilter(
    { dataFilters: dataFilters, includeGridData: true },
    spreadsheetId,
    { fields: fields },
  );

  // ---- 2. Compute the "correct" attributes for every column ID in the spreadsheet ----
  const actualByColumnId = {};
  const allColAttrRecords = []; // rows currently stored in All Column Attributes

  response.sheets.forEach(function (sheet) {
    const sheetId = sheet.properties.sheetId;
    const tableName = tableNames[String(sheetId)];
    const grid = sheet.data && sheet.data[0];
    const rowData = (grid && grid.rowData) || [];
    const row2 = (rowData[0] && rowData[0].values) || []; // column IDs
    const row3 = (rowData[1] && rowData[1].values) || []; // headers
    const row4 = (rowData[2] && rowData[2].values) || []; // first data row
    const table = sheet.tables && sheet.tables[0];
    const numCols =
      (table && table.columnProperties && table.columnProperties.length) ||
      row2.length;

    for (let c = 0; c < numCols; c++) {
      const columnId = cellText(row2[c]);
      if (!columnId) continue;

      const header = cellText(row3[c]);
      const camelCaseHeader = sentenceToCamelCase(header);
      const dataCell = row4[c];
      const isFormula = !!(
        dataCell &&
        dataCell.userEnteredValue &&
        dataCell.userEnteredValue.formulaValue !== undefined
      );

      let valueName;
      if (header === "Base ID") {
        valueName = "baseId";
      } else {
        const colProps =
          table && table.columnProperties && table.columnProperties[c];
        const rawValidation =
          colProps &&
          colProps.dataValidationRule &&
          colProps.dataValidationRule.condition &&
          colProps.dataValidationRule.condition.values &&
          colProps.dataValidationRule.condition.values[0] &&
          colProps.dataValidationRule.condition.values[0].userEnteredValue;
        const match =
          rawValidation && rawValidation.match(/^=validationList\[(.+)\]$/);
        if (match) {
          valueName = sentenceToCamelCase(match[1]);
        } else {
          valueName = getDataType(dataCell);
        }
      }

      actualByColumnId[columnId] = {
        tableName: tableName,
        columnIndex: c,
        header: header,
        camelCaseHeader: camelCaseHeader,
        isFormula: isFormula,
        valueName: valueName,
      };
    }

    // Collect All Column Attributes' own data rows (row 4 onward) for validation.
    if (sheetId === ALL_COL_ATTR_SHEET_ID) {
      for (let i = 2; i < rowData.length; i++) {
        const values = (rowData[i] && rowData[i].values) || [];
        if (!values.length) continue;
        const columnId = cellText(values[0]);
        if (!columnId) continue; // blank row — nothing to validate

        allColAttrRecords.push({
          rowIndex0based: 1 + i, // sheet row (0-based) this record lives on
          columnId: columnId,
          tableName: cellText(values[1]),
          columnIndex: cellNumber(values[2]),
          header: cellText(values[3]),
          camelCaseHeader: cellText(values[4]),
          isFormula: cellBool(values[5]),
          valueName: cellText(values[6]),
        });
      }
    }
  });

  // ---- 3. Diff stored records against the computed "actual" values ----
  const updates = [];
  const columnIdsNotFound = [];

  allColAttrRecords.forEach(function (rec) {
    const actual = actualByColumnId[rec.columnId];
    if (!actual) {
      columnIdsNotFound.push(rec.columnId);
      return;
    }

    const isStale =
      rec.tableName !== actual.tableName ||
      rec.columnIndex !== actual.columnIndex ||
      rec.header !== actual.header ||
      rec.camelCaseHeader !== actual.camelCaseHeader ||
      rec.isFormula !== actual.isFormula ||
      rec.valueName !== actual.valueName;

    if (isStale) {
      updates.push({ rowIndex0based: rec.rowIndex0based, actual: actual });
    }
  });

  // ---- 4. Write back only the rows that were wrong, in a single batchUpdate call ----
  if (updates.length) {
    const requests = updates.map(function (u) {
      return {
        updateCells: {
          range: {
            sheetId: ALL_COL_ATTR_SHEET_ID,
            startRowIndex: u.rowIndex0based,
            endRowIndex: u.rowIndex0based + 1,
            startColumnIndex: 1, // column B ("Table name") — column A (Column ID) is never touched
            endColumnIndex: 7, // through column G ("Value name")
          },
          rows: [
            {
              values: [
                { userEnteredValue: { stringValue: u.actual.tableName } },
                { userEnteredValue: { numberValue: u.actual.columnIndex } },
                { userEnteredValue: { stringValue: u.actual.header } },
                { userEnteredValue: { stringValue: u.actual.camelCaseHeader } },
                { userEnteredValue: { boolValue: u.actual.isFormula } },
                { userEnteredValue: { stringValue: u.actual.valueName } },
              ],
            },
          ],
          fields: "userEnteredValue",
        },
      };
    });

    Sheets.Spreadsheets.batchUpdate({ requests: requests }, spreadsheetId);
  }

  // ---- 5. Report ----
  Logger.log(
    "Checked %s All Column Attributes record(s). Corrected %s row(s).",
    allColAttrRecords.length,
    updates.length,
  );
  if (columnIdsNotFound.length) {
    Logger.log(
      "Column ID(s) listed in All Column Attributes but not found anywhere in the spreadsheet: %s",
      columnIdsNotFound.join(", "),
    );
  }

  return {
    correctedRowCount: updates.length,
    columnIdsNotFound: columnIdsNotFound,
  };
}

function cellText(cell) {
  if (!cell) return "";
  if (cell.effectiveValue) {
    if (cell.effectiveValue.stringValue !== undefined)
      return cell.effectiveValue.stringValue;
    if (cell.effectiveValue.numberValue !== undefined)
      return String(cell.effectiveValue.numberValue);
    if (cell.effectiveValue.boolValue !== undefined)
      return String(cell.effectiveValue.boolValue);
  }
  if (cell.formattedValue !== undefined) return cell.formattedValue;
  return "";
}

function cellNumber(cell) {
  return cell &&
    cell.effectiveValue &&
    cell.effectiveValue.numberValue !== undefined
    ? cell.effectiveValue.numberValue
    : null;
}

function cellBool(cell) {
  return !!(
    cell &&
    cell.effectiveValue &&
    cell.effectiveValue.boolValue === true
  );
}

function getDataType(cell) {
  if (!cell || !cell.effectiveValue) return "string";
  const ev = cell.effectiveValue;
  if (ev.boolValue !== undefined) return "boolean";
  if (ev.numberValue !== undefined) {
    const fmtType =
      cell.effectiveFormat &&
      cell.effectiveFormat.numberFormat &&
      cell.effectiveFormat.numberFormat.type;
    if (fmtType === "DATE" || fmtType === "DATE_TIME" || fmtType === "TIME")
      return "date";
    return "number";
  }
  if (ev.stringValue !== undefined) return "string";
  return "string";
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
