import { beforeEach, describe, expect, it } from "vitest";
import { columnConfigs } from "../01_generatedConfigs/columnConfigs";
import {
  stubLogger,
  stubPropertiesService,
} from "../testSupport/fakeAppsScriptGlobals";
import { buildGridRows, stubSheetsService } from "../testSupport/fakeSheetsService";
import { syncAndFlushConfigSheets, generateConfigFilesSources } from "./ConfigFilesGenerator";

// Real, already-committed sheet — ColumnConfigOperator's column-ID lifecycle
// (gatherColumnIdsForSheetGidsApiAccesses/addMissingColumnids/etc.) resolves
// sheets by gid through the deployed sheetConfigs.ts (SpreadsheetSchemaNamed
// .sheetByGid), so unlike SheetConfigOperator's own sync, this lifecycle
// can't be exercised against a fictional/brand-new sheet — only real ones.
const TEST_SHEET_GID = 2089200354;
const SHEET_CONFIG_GID = 210603630;
const COLUMN_CONFIG_GID = 2034522667;

const sc = columnConfigs.sheetConfig;
const cc = columnConfigs.columnConfig;

beforeEach(() => {
  stubPropertiesService({ realEstateSpreadsheetId: "test-spreadsheet-id" });
  stubLogger();
});

function seedFixture() {
  return stubSheetsService({
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
          // Pre-existing row for the "test" sheet, with API access so its
          // column IDs get gathered/appended rather than generated.
          4: [TEST_SHEET_GID, "Test", true, true, "test"],
        }),
        table: { endRowIndex: 5 },
      },
      {
        sheetId: COLUMN_CONFIG_GID,
        title: "Column Config",
        // appendRowWithVals (used by ColumnConfigOperator._appendColumnRows)
        // resolves every non-formula column of the sheet's schema against
        // this row, not just the ones toFileSource reads — so all of the
        // real committed Column Config columns need to be present here.
        rows: buildGridRows({
          0: [
            cc.sheetGid.columnId,
            cc.columnId.columnId,
            cc.sheetTitle.columnId,
            cc.header.columnId,
            cc.isFormula.columnId,
            cc.valueName.columnId,
            cc.isActionControl.columnId,
            cc.emptyAllowed.columnId,
            cc.customDefaultValue.columnId,
          ],
        }),
        table: { endRowIndex: 4 },
      },
      {
        sheetId: TEST_SHEET_GID,
        title: "Test",
        rows: buildGridRows({ 0: ["c:test:xyz123"], 3: [] }),
      },
    ],
  });
}

describe("syncAndFlushConfigSheets", () => {
  it("flushes Sheet Config and Column Config changes in a single batchUpdate call", () => {
    const { batchUpdateCalls } = seedFixture();

    const { sheetConfigOperator } = syncAndFlushConfigSheets();

    expect(batchUpdateCalls.length).toBe(1);
    expect(batchUpdateCalls[0]?.requests?.length).toBeGreaterThan(0);
    // The column ID gathered from the "test" sheet made it into a newly
    // appended Column Config row, which is part of what got flushed.
    expect(sheetConfigOperator.sheetEntries().test).toEqual({
      sheetGid: TEST_SHEET_GID,
      idPrefix: "test",
      hasIdColumn: true,
    });
  });
});

describe("generateConfigFilesSources", () => {
  it("returns both files' source as one JSON payload, reflecting the synced state", () => {
    seedFixture();

    const parsed = JSON.parse(generateConfigFilesSources());

    expect(typeof parsed.sheetConfigs).toBe("string");
    expect(typeof parsed.columnConfigs).toBe("string");
    expect(parsed.sheetConfigs).toContain('"test"');
    // The "test" sheet's column ID was gathered and appended to Column
    // Config as part of the sync, but toFileSource correctly leaves it out
    // of the generated source — it has no header/valueName yet (nobody's
    // filled those in on the sheet), so it'd be garbage data if emitted.
    expect(parsed.columnConfigs).not.toContain("c:test:xyz123");
  });
});
