import { beforeEach, describe, expect, it } from "vitest";
import { columnConfigs } from "../01_generatedConfigs/columnConfigs";
import {
  stubLogger,
  stubPropertiesService,
} from "../testSupport/fakeAppsScriptGlobals";
import { buildGridRows, stubSheetsService } from "../testSupport/fakeSheetsService";
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
// Real, already-committed sheet gid — _updateProgrammaticValues (like the
// rest of ColumnConfigOperator's lifecycle) resolves sheets by gid through
// the deployed sheetConfigs.ts (SpreadsheetSchemaNamed.sheetByGid), so it
// can't be exercised against a fictional sheet gid, only a real one (see
// ConfigOrchestrator.test.ts's seedFixture for the same constraint).
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
  cc.valueName.columnId,
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
  sheetConfigOperator.fetchAndUpdateAll();
  columnConfigOperator.sheetData.prepFetchColumnsFull(
    "sheetGid",
    "columnId",
    "header",
    "isFormula",
    "valueName",
  );
  columnConfigOperator.ss.fetchAllPrepped();
  return columnConfigOperator;
}

describe("ColumnConfigOperator.columnEntries / toFileSource", () => {
  it("groups columns by resolved sheet name and skips incomplete/unresolvable rows", () => {
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
            4: [PROPERTY_GID, "c:prp:aaa", "Property", "Rent Amount", false, "number"],
            5: [PROPERTY_GID, "c:prp:bbb", "Property", "Notes", false, "string"],
            6: [NEW_SHEET_GID, "c:999002:ccc", "Brand New Sheet", "Some Field", false, "string"],
            7: freshlyAppendedRowMissingHeaderAndValueName,
            8: rowReferencingUnresolvableSheet,
          }),
          table: { endRowIndex: 9 },
        },
        { sheetId: PROPERTY_GID, title: "Property", rows: buildGridRows({ 3: [] }) },
        {
          sheetId: NEW_SHEET_GID,
          title: "Brand New Sheet",
          rows: buildGridRows({ 3: [] }),
        },
      ],
    });

    const entries = initSyncedColumnConfigOperator().columnEntries();

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
    // The incomplete row and the unresolvable-sheet row must not surface
    // anywhere in the output.
    expect(Object.values(entries).flatMap(Object.values)).not.toContainEqual(
      expect.objectContaining({ columnId: "c:prp:ddd" }),
    );
    expect(Object.values(entries).flatMap(Object.values)).not.toContainEqual(
      expect.objectContaining({ columnId: "c:???:eee" }),
    );
  });

  it("throws when two headers on the same sheet camelCase to the same column name", () => {
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
            4: [PROPERTY_GID, "c:prp:aaa", "Property", "Rent Amount", false, "number"],
            5: [PROPERTY_GID, "c:prp:bbb", "Property", "Rent  Amount", false, "number"],
          }),
          table: { endRowIndex: 6 },
        },
        { sheetId: PROPERTY_GID, title: "Property", rows: buildGridRows({ 3: [] }) },
      ],
    });

    expect(() => initSyncedColumnConfigOperator().columnEntries()).toThrow(
      /duplicate column name "rentAmount"/,
    );
  });
});

describe("ColumnConfigOperator.fetchAndUpdateColumnConfig -> _updateProgrammaticValues", () => {
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
            4: [TEST_SHEET_GID, "c:test:corr01", "Stale Title", "Stale Header", true, "string"],
            5: [TEST_SHEET_GID, "c:test:corr02", "Test", "Base ID", false, "string"],
          }),
          table: { endRowIndex: 6 },
        },
        {
          sheetId: TEST_SHEET_GID,
          title: "Test",
          rows: buildGridRows({
            0: ["c:test:corr01", "c:test:corr02"],
            3: ["Amount", "Base ID"],
            4: [42, "xyz"],
          }),
          table: { endRowIndex: 5 },
        },
      ],
    });

    const operator = ColumnConfigOperator.init();
    operator.fetchAndUpdateColumnConfig();
    const col = operator.sheetData.columns(
      "sheetTitle",
      "header",
      "isFormula",
      "valueName",
    );

    expect(col.sheetTitle.value(4)).toBe("Test");
    expect(col.header.value(4)).toBe("Amount");
    expect(col.isFormula.value(4)).toBe(false);
    expect(col.valueName.value(4)).toBe("number");

    // Already-correct fields stay untouched; only valueName (stale
    // "string") gets the "Base ID" -> "id" special case applied.
    expect(col.sheetTitle.value(5)).toBe("Test");
    expect(col.header.value(5)).toBe("Base ID");
    expect(col.isFormula.value(5)).toBe(false);
    expect(col.valueName.value(5)).toBe("id");
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
            4: [TEST_SHEET_GID, "c:test:corr03", "Test", "Description", false, "string"],
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
    operator.fetchAndUpdateColumnConfig();
    const col = operator.sheetData.columns("sheetTitle", "header", "valueName");

    expect(col.valueName.value(4)).toBe("transactionDescription");
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
            4: [TEST_SHEET_GID, "c:test:corr04", "Test", "Move-in Date", false, "string"],
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
    operator.fetchAndUpdateColumnConfig();
    const col = operator.sheetData.columns("isFormula", "valueName");

    expect(col.isFormula.value(4)).toBe(true);
    expect(col.valueName.value(4)).toBe("date");
  });
});
