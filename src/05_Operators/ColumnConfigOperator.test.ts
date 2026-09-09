import { beforeEach, describe, expect, it } from "vitest";
import { columnConfigs } from "../01_generatedConfigs/columnConfigs";
import {
  stubLogger,
  stubPropertiesService,
} from "../testSupport/fakeAppsScriptGlobals";
import {
  buildGridRows,
  stubSheetsService,
  type FakeCell,
} from "../testSupport/fakeSheetsService";
import { ColumnConfigOperator } from "./ColumnConfigOperator";

// Real committed columnId strings, so fixtures stay honest to what the
// production code actually resolves column names through.
const sc = columnConfigs.sheetConfig;
const cc = columnConfigs.columnConfig;
const SHEET_CONFIG_GID = 210603630;
const COLUMN_CONFIG_GID = 2034522667;
const PROPERTY_GID = 999001;
const NEW_SHEET_GID = 999002;
const UNRESOLVABLE_GID = 424242;

const TEST_SHEET_GID = 2089200354;

const sheetConfigColumnIdRow = [
  sc.sheetGid.columnId,
  sc.sheetTitle.columnId,
  sc.hasIdColumn.columnId,
  sc.letApiAccess.columnId,
  sc.idPrefix.columnId,
];
const columnConfigColumnIdRow = [
  cc.sheetGid.columnId,
  cc.columnId.columnId,
  cc.sheetTitle.columnId,
  cc.header.columnId,
  cc.isFormula.columnId,
  cc.valueTitle.columnId,
  cc.isActionControl.columnId,
  cc.emptyAllowed.columnId,
  cc.customDefaultValue.columnId,
];

const freshlyAppendedRowMissingHeaderAndValueName = [
  PROPERTY_GID,
  "c:prp:ddd",
  "Property",
  "",
  false,
  "",
];
const rowReferencingUnresolvableSheet = [
  UNRESOLVABLE_GID,
  "c:???:eee",
  "",
  "Orphan Field",
  false,
  "string",
];

beforeEach(() => {
  stubPropertiesService({ realEstateSpreadsheetId: "test-spreadsheet-id" });
  stubLogger();
});

// Syncs Sheet Config (so sheetGid -> sheetName resolves for Property/Brand
// New Sheet, via auto-appended rows) and fetches whatever Column Config
// rows the caller seeded — without running the full append/prune column-ID
// lifecycle, keeping these tests focused on toFileSource's own read/skip/
// throw logic rather than re-testing the pre-existing lifecycle.
function initSyncedColumnConfigOperator(): ColumnConfigOperator {
  const columnConfigOperator = ColumnConfigOperator.init();
  const sheetConfigOperator = columnConfigOperator.sheetConfigOperator;
  sheetConfigOperator.sheet.prepFetchColumnsFull("letApiAccess");
  sheetConfigOperator.prepFetchForSync();
  columnConfigOperator.sheet.prepFetchColumnsFull(
    "sheetGid",
    "columnId",
    "header",
    "isFormula",
    "valueTitle",
  );
  columnConfigOperator.ss.fetchAllPrepped();
  sheetConfigOperator.syncToSpreadsheet();
  return columnConfigOperator;
}

// Mirrors ConfigOrchestrator.syncAndFlushConfigSheets's own sequence (see
// CLAUDE.md/README on why Sheet Config and Column Config sync together),
// stopping short of the final batchUpdateGSheets flush these tests don't
// need.
function syncColumnConfigOperator(operator: ColumnConfigOperator): void {
  operator.ss.fetchAllSheetProperties();
  const sheetConfigOperator = operator.sheetConfigOperator;
  sheetConfigOperator.prepFetchForSync();
  operator.prepFetchWithSheetConfig();
  operator.ss.fetchAllPrepped({ skipFetchingProperties: true });
  sheetConfigOperator.syncToSpreadsheet();
  operator.fetchAfterSheetConfigSynced();
  operator.syncToSpreadsheet();
}

describe("ColumnConfigOperator.newColumnConfigs / toFileSource", () => {
  it("groups columns by resolved sheet name", () => {
    stubSheetsService({
      sheets: [
        {
          sheetId: SHEET_CONFIG_GID,
          title: "Sheet Config",
          rows: buildGridRows({
            0: sheetConfigColumnIdRow,
            4: [PROPERTY_GID, "Property", false, true, ""],
            5: [NEW_SHEET_GID, "Brand New Sheet", false, true, ""],
          }),
          table: { endRowIndex: 6 },
        },
        {
          sheetId: COLUMN_CONFIG_GID,
          title: "Column Config",
          rows: buildGridRows({
            0: columnConfigColumnIdRow,
            4: [
              PROPERTY_GID,
              "c:prp:aaa",
              "Property",
              "Rent Amount",
              false,
              "number",
            ],
            5: [
              PROPERTY_GID,
              "c:prp:bbb",
              "Property",
              "Notes",
              false,
              "string",
            ],
            6: [
              NEW_SHEET_GID,
              "c:999002:ccc",
              "Brand New Sheet",
              "Some Field",
              false,
              "string",
            ],
          }),
          table: { endRowIndex: 7 },
        },
        {
          sheetId: PROPERTY_GID,
          title: "Property",
          rows: buildGridRows({ 3: [] }),
        },
        {
          sheetId: NEW_SHEET_GID,
          title: "Brand New Sheet",
          rows: buildGridRows({ 3: [] }),
        },
      ],
    });

    const entries = initSyncedColumnConfigOperator().newColumnConfigs();

    expect(entries.property).toEqual({
      rentAmount: {
        columnId: "c:prp:aaa",
        valueName: "number",
        header: "Rent Amount",
        isFormula: false,
        emptyAllowed: false,
        customDefaultValue: null,
      },
      notes: {
        columnId: "c:prp:bbb",
        valueName: "string",
        header: "Notes",
        isFormula: false,
        emptyAllowed: false,
        customDefaultValue: null,
      },
    });
    expect(entries.brandNewSheet).toEqual({
      someField: {
        columnId: "c:999002:ccc",
        valueName: "string",
        header: "Some Field",
        isFormula: false,
        emptyAllowed: false,
        customDefaultValue: null,
      },
    });
  });

  it("throws when a row is missing its header or value name", () => {
    stubSheetsService({
      sheets: [
        {
          sheetId: SHEET_CONFIG_GID,
          title: "Sheet Config",
          rows: buildGridRows({ 0: sheetConfigColumnIdRow }),
          table: { endRowIndex: 4 },
        },
        {
          sheetId: COLUMN_CONFIG_GID,
          title: "Column Config",
          rows: buildGridRows({
            0: columnConfigColumnIdRow,
            4: freshlyAppendedRowMissingHeaderAndValueName,
          }),
          table: { endRowIndex: 5 },
        },
        {
          sheetId: PROPERTY_GID,
          title: "Property",
          rows: buildGridRows({ 3: [] }),
        },
      ],
    });

    expect(() => initSyncedColumnConfigOperator().newColumnConfigs()).toThrow(
      /is empty/,
    );
  });

  it("throws when a row references a sheetGid unresolvable in Sheet Config", () => {
    stubSheetsService({
      sheets: [
        {
          sheetId: SHEET_CONFIG_GID,
          title: "Sheet Config",
          rows: buildGridRows({ 0: sheetConfigColumnIdRow }),
          table: { endRowIndex: 4 },
        },
        {
          sheetId: COLUMN_CONFIG_GID,
          title: "Column Config",
          rows: buildGridRows({
            0: columnConfigColumnIdRow,
            4: rowReferencingUnresolvableSheet,
          }),
          table: { endRowIndex: 5 },
        },
        {
          sheetId: PROPERTY_GID,
          title: "Property",
          rows: buildGridRows({ 3: [] }),
        },
      ],
    });

    expect(() => initSyncedColumnConfigOperator().newColumnConfigs()).toThrow(
      /no corresponding sheet name in Sheet Config/,
    );
  });

  it("throws when two headers on the same sheet camelCase to the same column name", () => {
    stubSheetsService({
      sheets: [
        {
          sheetId: SHEET_CONFIG_GID,
          title: "Sheet Config",
          rows: buildGridRows({
            0: sheetConfigColumnIdRow,
            4: [PROPERTY_GID, "Property", false, true, ""],
          }),
          table: { endRowIndex: 5 },
        },
        {
          sheetId: COLUMN_CONFIG_GID,
          title: "Column Config",
          rows: buildGridRows({
            0: columnConfigColumnIdRow,
            4: [
              PROPERTY_GID,
              "c:prp:aaa",
              "Property",
              "Rent Amount",
              false,
              "number",
            ],
            5: [
              PROPERTY_GID,
              "c:prp:bbb",
              "Property",
              "Rent  Amount",
              false,
              "number",
            ],
          }),
          table: { endRowIndex: 6 },
        },
        {
          sheetId: PROPERTY_GID,
          title: "Property",
          rows: buildGridRows({ 3: [] }),
        },
      ],
    });

    expect(() => initSyncedColumnConfigOperator().newColumnConfigs()).toThrow(
      /duplicate column name "rentAmount"/,
    );
  });
});

describe("ColumnConfigOperator.syncToSpreadsheet -> _updateProgrammaticValues", () => {
  const testSheetConfigRowWithApiAccess = [
    TEST_SHEET_GID,
    "Test",
    true,
    true,
    "test",
  ];

  function seedSheetConfigFixture() {
    return {
      sheetId: SHEET_CONFIG_GID,
      title: "Sheet Config",
      rows: buildGridRows({
        0: sheetConfigColumnIdRow,
        4: testSheetConfigRowWithApiAccess,
      }),
      table: { endRowIndex: 5 },
    };
  }

  it("corrects sheetTitle/header/isFormula and infers a primitive or Base-ID valueName", () => {
    stubSheetsService({
      sheets: [
        seedSheetConfigFixture(),
        {
          sheetId: COLUMN_CONFIG_GID,
          title: "Column Config",
          rows: buildGridRows({
            0: columnConfigColumnIdRow,
            4: [
              TEST_SHEET_GID,
              "c:test:corr01",
              "Stale Title",
              "Stale Header",
              true,
              "string",
            ],
            5: [TEST_SHEET_GID, "c:test:corr02", "Test", "ID", false, "string"],
          }),
          table: { endRowIndex: 6 },
        },
        {
          sheetId: TEST_SHEET_GID,
          title: "Test",
          rows: buildGridRows({
            0: ["c:test:corr01", "c:test:corr02"],
            3: ["Amount", "ID"],
            4: [42, "xyz"],
          }),
          table: { endRowIndex: 5 },
        },
      ],
    });

    const operator = ColumnConfigOperator.init();
    syncColumnConfigOperator(operator);
    const col = operator.sheet.columns(
      "sheetTitle",
      "header",
      "isFormula",
      "valueTitle",
    );

    expect(col.sheetTitle.value(4)).toBe("Test");
    expect(col.header.value(4)).toBe("Amount");
    expect(col.isFormula.value(4)).toBe(false);
    expect(col.valueTitle.value(4)).toBe("number");

    // Already-correct fields stay untouched; only valueName (stale
    // "string") gets the "ID" -> "id" special case applied.
    expect(col.sheetTitle.value(5)).toBe("Test");
    expect(col.header.value(5)).toBe("ID");
    expect(col.isFormula.value(5)).toBe(false);
    expect(col.valueTitle.value(5)).toBe("id");
  });

  it("detects a named valueConfig from the column's live data-validation formula", () => {
    stubSheetsService({
      sheets: [
        seedSheetConfigFixture(),
        {
          sheetId: COLUMN_CONFIG_GID,
          title: "Column Config",
          rows: buildGridRows({
            0: columnConfigColumnIdRow,
            4: [
              TEST_SHEET_GID,
              "c:test:corr03",
              "Test",
              "Description",
              false,
              "string",
            ],
          }),
          table: { endRowIndex: 5 },
        },
        {
          sheetId: TEST_SHEET_GID,
          title: "Test",
          rows: buildGridRows({
            0: ["c:test:corr03"],
            3: ["Description"],
            4: ["Rent (base)"],
          }),
          table: {
            endRowIndex: 5,
            columnValidationValues: {
              0: ["=valueConfig[Transaction Description]"],
            },
          },
        },
      ],
    });

    const operator = ColumnConfigOperator.init();
    syncColumnConfigOperator(operator);
    const col = operator.sheet.columns("sheetTitle", "header", "valueTitle");

    expect(col.valueTitle.value(4)).toBe("Transaction Description");
    // Already-correct fields are left alone.
    expect(col.sheetTitle.value(4)).toBe("Test");
    expect(col.header.value(4)).toBe("Description");
  });

  it("detects a live formula and a date-formatted number", () => {
    stubSheetsService({
      sheets: [
        seedSheetConfigFixture(),
        {
          sheetId: COLUMN_CONFIG_GID,
          title: "Column Config",
          rows: buildGridRows({
            0: columnConfigColumnIdRow,
            4: [
              TEST_SHEET_GID,
              "c:test:corr04",
              "Test",
              "Move-in Date",
              false,
              "string",
            ],
          }),
          table: { endRowIndex: 5 },
        },
        {
          sheetId: TEST_SHEET_GID,
          title: "Test",
          rows: buildGridRows({
            0: ["c:test:corr04"],
            3: ["Move-in Date"],
            4: [{ value: 45000, isFormula: true, numberFormatType: "DATE" }],
          }),
          table: { endRowIndex: 5 },
        },
      ],
    });

    const operator = ColumnConfigOperator.init();
    syncColumnConfigOperator(operator);
    const col = operator.sheet.columns("isFormula", "valueTitle");

    expect(col.isFormula.value(4)).toBe(true);
    expect(col.valueTitle.value(4)).toBe("date");
  });
});

describe("ColumnConfigOperator.syncToSpreadsheet -> declared column types", () => {
  interface ColumnsUnderTest {
    headers: string[];
    topDataRow?: FakeCell[];
    columnDeclaredTypes?: Record<number, string>;
    columnValidationValues?: Record<number, string[]>;
  }

  function syncColumnsUnderTest({
    headers,
    topDataRow = [],
    columnDeclaredTypes,
    columnValidationValues,
  }: ColumnsUnderTest): ColumnConfigOperator {
    const columnIds = headers.map((_, index) => `c:test:col${index}`);
    const columnConfigRows: Record<number, FakeCell[]> = {
      0: columnConfigColumnIdRow,
    };
    columnIds.forEach((columnId, index) => {
      columnConfigRows[4 + index] = [
        TEST_SHEET_GID,
        columnId,
        "Test",
        "",
        false,
        "",
      ];
    });
    stubSheetsService({
      sheets: [
        {
          sheetId: SHEET_CONFIG_GID,
          title: "Sheet Config",
          rows: buildGridRows({
            0: sheetConfigColumnIdRow,
            4: [TEST_SHEET_GID, "Test", true, true, "test"],
          }),
          table: { endRowIndex: 5 },
        },
        {
          sheetId: COLUMN_CONFIG_GID,
          title: "Column Config",
          rows: buildGridRows(columnConfigRows),
          table: { endRowIndex: 4 + columnIds.length },
        },
        {
          sheetId: TEST_SHEET_GID,
          title: "Test",
          rows: buildGridRows({ 0: columnIds, 3: headers, 4: topDataRow }),
          table: {
            endRowIndex: 5,
            columnDeclaredTypes,
            columnValidationValues,
          },
        },
      ],
    });
    const operator = ColumnConfigOperator.init();
    syncColumnConfigOperator(operator);
    return operator;
  }

  function valueTitles(operator: ColumnConfigOperator, count: number) {
    const col = operator.sheet.columns("valueTitle");
    return Array.from({ length: count }, (_, index) =>
      col.valueTitle.value(4 + index),
    );
  }

  it("maps every declared column type to its value name", () => {
    const operator = syncColumnsUnderTest({
      headers: [
        "Amount",
        "Count",
        "Rate",
        "Moved In",
        "Start Time",
        "Updated At",
        "Notes",
        "Owner",
        "Active",
      ],
      columnDeclaredTypes: {
        0: "CURRENCY",
        1: "DOUBLE",
        2: "PERCENT",
        3: "DATE",
        4: "TIME",
        5: "DATE_TIME",
        6: "TEXT",
        7: "PEOPLE_CHIP",
        8: "BOOLEAN",
      },
    });

    expect(valueTitles(operator, 9)).toEqual([
      "number",
      "number",
      "number",
      "date",
      "date",
      "date",
      "string",
      "string",
      "boolean",
    ]);
  });

  it("prefers the declared type over what the top data row samples to", () => {
    const operator = syncColumnsUnderTest({
      headers: ["Amount"],
      topDataRow: ["not a number at all"],
      columnDeclaredTypes: { 0: "CURRENCY" },
    });

    expect(valueTitles(operator, 1)).toEqual(["number"]);
    expect(operator.untypedColumnsSummary()).toBeUndefined();
  });

  it("prefers the declared type over an empty top data row", () => {
    const operator = syncColumnsUnderTest({
      headers: ["Purchase Price", "Closing Date"],
      columnDeclaredTypes: { 0: "CURRENCY", 1: "DATE" },
    });

    expect(valueTitles(operator, 2)).toEqual(["number", "date"]);
    expect(operator.untypedColumnsSummary()).toBeUndefined();
  });

  it("keeps the ID value name for the ID column whatever type it declares", () => {
    const operator = syncColumnsUnderTest({
      headers: ["ID"],
      topDataRow: ["test:abc"],
      columnDeclaredTypes: { 0: "TEXT" },
    });

    expect(valueTitles(operator, 1)).toEqual(["id"]);
    expect(operator.untypedColumnsSummary()).toBeUndefined();
  });

  it("keeps a Value Config validation rule winning over a declared dropdown type", () => {
    const operator = syncColumnsUnderTest({
      headers: ["Description"],
      topDataRow: ["Rent (base)"],
      columnDeclaredTypes: { 0: "DROPDOWN" },
      columnValidationValues: {
        0: ["=valueConfig[Transaction Description]"],
      },
    });

    expect(valueTitles(operator, 1)).toEqual(["Transaction Description"]);
    expect(operator.untypedColumnsSummary()).toBeUndefined();
  });

  it("falls back to the sample for a dropdown with no Value Config rule", () => {
    const operator = syncColumnsUnderTest({
      headers: ["Property Ref"],
      topDataRow: ["prp:abc123"],
      columnDeclaredTypes: { 0: "DROPDOWN" },
    });

    expect(valueTitles(operator, 1)).toEqual(["string"]);
    expect(operator.untypedColumnsSummary()).toContain(
      "1 column(s) across 1 sheet(s)",
    );
  });

  it("falls back to the sample for a column with no declared type, and counts it", () => {
    const operator = syncColumnsUnderTest({
      headers: ["Amount"],
      topDataRow: [42],
    });

    expect(valueTitles(operator, 1)).toEqual(["number"]);
    expect(operator.untypedColumnsSummary()).toContain(
      "1 column(s) across 1 sheet(s)",
    );
  });

  it("falls back to an empty top cell's number format rather than to text", () => {
    const operator = syncColumnsUnderTest({
      headers: ["Payment", "Closing Date"],
      topDataRow: [
        { value: null, numberFormatType: "CURRENCY" },
        { value: null, numberFormatType: "DATE" },
      ],
    });

    expect(valueTitles(operator, 2)).toEqual(["number", "date"]);
  });

  it("falls back to text for an empty top cell with no number format", () => {
    const operator = syncColumnsUnderTest({
      headers: ["Notes"],
    });

    expect(valueTitles(operator, 1)).toEqual(["string"]);
    expect(operator.untypedColumnsSummary()).toContain(
      "1 column(s) across 1 sheet(s)",
    );
  });

  it("counts a formula column alongside the rest", () => {
    const operator = syncColumnsUnderTest({
      headers: ["Balance"],
      topDataRow: [{ value: 42, isFormula: true }],
    });

    expect(operator.sheet.column("isFormula").value(4)).toBe(true);
    expect(operator.untypedColumnsSummary()).toContain(
      "1 column(s) across 1 sheet(s)",
    );
  });

  it("summarises how many columns on how many sheets are still untyped", () => {
    const operator = syncColumnsUnderTest({
      headers: ["Amount", "Notes", "Moved In"],
      topDataRow: [42, "a note"],
      columnDeclaredTypes: { 2: "DATE" },
    });

    expect(operator.untypedColumnsSummary()).toBe(
      "Succeeded, but 2 column(s) across 1 sheet(s) are untyped, so their " +
        "value names were guessed. See the execution log for the list.",
    );
  });

  it("summarises nothing when every column declares its type", () => {
    const operator = syncColumnsUnderTest({
      headers: ["Amount", "Notes"],
      columnDeclaredTypes: { 0: "CURRENCY", 1: "TEXT" },
    });

    expect(operator.untypedColumnsSummary()).toBeUndefined();
  });
});

describe("ColumnConfigOperator.syncToSpreadsheet -> _addMissingColumnIds", () => {
  it("adds a missing column ID only for the letApiAccess=true sheet, skipping the letApiAccess=false one without fetching it", () => {
    stubSheetsService({
      sheets: [
        {
          sheetId: SHEET_CONFIG_GID,
          title: "Sheet Config",
          rows: buildGridRows({
            0: sheetConfigColumnIdRow,
            // Api-access sheet: gets a missing column ID filled in.
            4: [TEST_SHEET_GID, "Test", true, true, "tst"],

            5: [UNRESOLVABLE_GID, "Ghost", true, false, "gho"],
          }),
          table: { endRowIndex: 6 },
        },
        {
          sheetId: COLUMN_CONFIG_GID,
          title: "Column Config",
          rows: buildGridRows({ 0: columnConfigColumnIdRow }),
          table: { endRowIndex: 4 },
        },
        {
          sheetId: TEST_SHEET_GID,
          title: "Test",
          rows: buildGridRows({
            0: [""],
            3: ["Amount"],
            4: [42],
          }),
          table: { endRowIndex: 5 },
        },
      ],
    });

    const operator = ColumnConfigOperator.init();

    expect(() => syncColumnConfigOperator(operator)).not.toThrow();

    const colIdRow = operator.ss.raw.sheetMeta(TEST_SHEET_GID).colIdRow;
    expect(colIdRow.value(0)).not.toBe("");
  });

  it("adds a missing column ID when the columnId row has never had any grid data set", () => {
    stubSheetsService({
      sheets: [
        {
          sheetId: SHEET_CONFIG_GID,
          title: "Sheet Config",
          rows: buildGridRows({
            0: sheetConfigColumnIdRow,
            4: [TEST_SHEET_GID, "Test", true, true, "tst"],
          }),
          table: { endRowIndex: 5 },
        },
        {
          sheetId: COLUMN_CONFIG_GID,
          title: "Column Config",
          rows: buildGridRows({ 0: columnConfigColumnIdRow }),
          table: { endRowIndex: 4 },
        },
        {
          sheetId: TEST_SHEET_GID,
          title: "Test",
          rows: buildGridRows({
            3: ["Amount"],
            4: [42],
          }),
          // Row 0 has never had a column ID written, so Google's real API
          // omits it entirely from the fetch response rather than
          // returning empty cells for it.
          rowsWithNoGridData: [0],
          table: { endRowIndex: 5 },
        },
      ],
    });

    const operator = ColumnConfigOperator.init();

    expect(() => syncColumnConfigOperator(operator)).not.toThrow();

    const colIdRow = operator.ss.raw.sheetMeta(TEST_SHEET_GID).colIdRow;
    expect(colIdRow.value(0)).not.toBe("");
  });
});

describe("ColumnConfigOperator.syncToSpreadsheet -> _pruneColumnRows", () => {
  const columnConfigHeaderRow = [
    "Sheet GID",
    "Column ID",
    "Sheet title",
    "Header",
    "Is formula",
    "Value title",
    "Is action control",
    "Empty allowed",
    "Custom default value",
  ];

  function seedColumnConfigDescribingItselfBelowABlankTopDataRow() {
    stubSheetsService({
      sheets: [
        {
          sheetId: SHEET_CONFIG_GID,
          title: "Sheet Config",
          rows: buildGridRows({
            0: sheetConfigColumnIdRow,
            4: [COLUMN_CONFIG_GID, "Column Config", false, true, "ccf"],
          }),
          table: { endRowIndex: 5 },
        },
        {
          sheetId: COLUMN_CONFIG_GID,
          title: "Column Config",
          rows: buildGridRows({
            0: columnConfigColumnIdRow,
            3: columnConfigHeaderRow,
            4: [],
            5: [
              COLUMN_CONFIG_GID,
              cc.sheetGid.columnId,
              "Stale Title",
              "Stale Header",
              true,
              "number",
            ],
          }),
          table: { endRowIndex: 6 },
        },
      ],
    });
  }

  it("still resolves programmatic values for a sheet whose own top data row it pruned", () => {
    seedColumnConfigDescribingItselfBelowABlankTopDataRow();

    const operator = ColumnConfigOperator.init();
    syncColumnConfigOperator(operator);
    const col = operator.sheet.columns(
      "sheetTitle",
      "header",
      "isFormula",
      "valueTitle",
    );

    expect(operator.sheet.rowIndexesActive).not.toContain(4);
    expect(col.sheetTitle.value(5)).toBe("Column Config");
    expect(col.header.value(5)).toBe("Sheet GID");
    expect(col.isFormula.value(5)).toBe(false);
    expect(col.valueTitle.value(5)).toBe("string");
  });
});
