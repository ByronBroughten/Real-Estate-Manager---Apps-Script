function buildSpreadsheetColumnMeta() {
  syncColTraits();
}

// Try claude code for reimplementing these one at a time.
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

const sheetNames = {
  "210603630": "sheetConfig",
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
  "2034522667": "columnConfig",
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

function syncColTraits() {
  const spreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();

  const ALL_COL_ATTR_SHEET_ID = 2034522667;

  // ---- 1. One getByDataFilter call that pulls everything we need ----
  // For every sheet: row 2 (column IDs), row 3 (headers), row 4 (first data
  // row — used to detect "is formula" and to infer data type).
  // For "All Column Attributes" specifically: row 2 through the last row,
  // since its rows from row 4 onward are the records we need to validate.
  const dataFilters = Object.keys(sheetNames).map(function (gid) {
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
    const sheetName = sheetNames[String(sheetId)];
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
        sheetName: sheetName,
        colIndex: c,
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
          sheetName: cellText(values[1]),
          colIndex: cellNumber(values[2]),
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
      rec.sheetName !== actual.sheetName ||
      rec.colIndex !== actual.colIndex ||
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
            startColumnIndex: 1, // column B ("Sheet name camel case") — column A (Column ID) is never touched
            endColumnIndex: 7, // through column G ("Value name")
          },
          rows: [
            {
              values: [
                { userEnteredValue: { stringValue: u.actual.sheetName } },
                { userEnteredValue: { numberValue: u.actual.colIndex } },
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
