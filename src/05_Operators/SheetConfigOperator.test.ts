import { beforeEach, describe, expect, it } from "vitest";
import { columnConfigs } from "../01_generatedConfigs/columnConfigs";
import {
  stubLogger,
  stubPropertiesService,
} from "../testSupport/fakeAppsScriptGlobals";
import {
  buildGridRows,
  stubSheetsService,
} from "../testSupport/fakeSheetsService";
import { SheetConfigOperator } from "./SheetConfigOperator";

// Real committed columnId strings for the Sheet Config sheet's own columns
// (src/01_generatedConfigs/columnConfigs.ts) — using these rather than
// made-up ids means the fixture stays honest to what the production code
// actually resolves column names through.
const sc = columnConfigs.sheetConfig;
const SHEET_CONFIG_GID = 210603630;
const PROPERTY_GID = 999001;
const NEW_SHEET_GID = 999002;

const existingPropertyConfigRow = [
  PROPERTY_GID,
  "Property",
  false,
  true,
  "prp",
];

beforeEach(() => {
  stubPropertiesService({ realEstateSpreadsheetId: "test-spreadsheet-id" });
  stubLogger();
});

// newSheetConfigs()/sheetNamesByGid()/toFileSource() all read letApiAccess,
// which prepFetchForSync doesn't prep on its own — production code only
// preps it via ColumnConfigOperator.prepFetchWithSheetConfig, so a
// standalone SheetConfigOperator test has to prep it itself.
//
// fetchAllSheetProperties() has to run first, matching
// ConfigOrchestrator.syncAndFlushConfigSheets's order — it's what populates
// ss.raw.activeSheetGids (prepFetchForSync's own loop, and hence
// skipFetchingProperties below) with every live sheet, including ones with
// no Sheet Config row yet.
function syncSheetConfigOperator(operator: SheetConfigOperator): void {
  operator.ss.raw.fetchAllSheetProperties();
  operator.sheet.data.prepFetchColumnsFull("letApiAccess");
  operator.prepFetchForSync();
  operator.ss.fetchAllPrepped({ skipFetchingProperties: true });
  operator.syncToSpreadsheet();
}

describe("SheetConfigOperator.newSheetConfigs / toFileSource", () => {
  it("carries forward an existing sheet and appends a brand-new one, excluded until manually enabled", () => {
    stubSheetsService({
      sheets: [
        {
          sheetId: SHEET_CONFIG_GID,
          title: "Sheet Config",
          rows: buildGridRows({
            0: [
              sc.sheetGid.columnId,
              sc.sheetTitle.columnId,
              sc.hasIdColumn.columnId,
              sc.letApiAccess.columnId,
              sc.idPrefix.columnId,
            ],
            4: existingPropertyConfigRow,
          }),
          table: { endRowIndex: 5 },
        },
        // Referenced by the existing row above; no "ID" header, so
        // hasIdColumn should stay false (a no-op correction).
        {
          sheetId: PROPERTY_GID,
          title: "Property",
          rows: buildGridRows({ 3: [] }),
          table: { endRowIndex: 4 },
        },
        // Present in the spreadsheet but with NO existing Sheet Config row.
        {
          sheetId: NEW_SHEET_GID,
          title: "Brand New Sheet",
          rows: buildGridRows({ 3: [] }),
          table: { endRowIndex: 4 },
        },
      ],
    });

    const operator = SheetConfigOperator.init();
    syncSheetConfigOperator(operator);
    const sheetConfigs = operator.newSheetConfigs();

    expect(sheetConfigs.property).toEqual({
      sheetGid: PROPERTY_GID,
      idPrefix: "prp",
      hasIdColumn: false,
    });
    // A newly-discovered sheet gets a Sheet Config row appended, but stays
    // excluded from the generated file until a human sets letApiAccess.
    expect(sheetConfigs.brandNewSheet).toBeUndefined();
    expect(operator.sheet.data.column("sheetGid").hasValue(NEW_SHEET_GID)).toBe(
      true,
    );
  });

  it("resolves sheetGid -> sheetName for a sheet not yet in any deployed config", () => {
    stubSheetsService({
      sheets: [
        {
          sheetId: SHEET_CONFIG_GID,
          title: "Sheet Config",
          rows: buildGridRows({
            0: [
              sc.sheetGid.columnId,
              sc.sheetTitle.columnId,
              sc.hasIdColumn.columnId,
              sc.letApiAccess.columnId,
              sc.idPrefix.columnId,
            ],
            // A human already turned on API access for this sheet, but no
            // deploy has run since — this run's own live sync is the only
            // place the mapping exists.
            4: [NEW_SHEET_GID, "Brand New Sheet", false, true, ""],
          }),
          table: { endRowIndex: 5 },
        },
        {
          sheetId: NEW_SHEET_GID,
          title: "Brand New Sheet",
          rows: buildGridRows({ 3: [] }),
          table: { endRowIndex: 4 },
        },
      ],
    });

    const operator = SheetConfigOperator.init();
    syncSheetConfigOperator(operator);

    expect(operator.sheetNamesByGid().get(NEW_SHEET_GID)).toBe("brandNewSheet");
    expect(operator.toFileSource()).toContain('"brandNewSheet"');
  });
});
