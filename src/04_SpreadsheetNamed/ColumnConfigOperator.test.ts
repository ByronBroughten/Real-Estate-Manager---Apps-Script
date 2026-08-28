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
            // Freshly appended, not yet filled in by a human.
            7: [PROPERTY_GID, "c:prp:ddd", "Property", "", false, ""],
            // References a sheet with no Sheet Config row at all.
            8: [UNRESOLVABLE_GID, "c:???:eee", "", "Orphan Field", false, "string"],
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
