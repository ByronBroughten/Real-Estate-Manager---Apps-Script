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

describe("SheetConfigOperator.newSheetConfigs / toFileSource", () => {
  it("carries forward an existing sheet and appends+corrects a brand-new one", () => {
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
        },
        // Present in the spreadsheet but with NO existing Sheet Config
        // row — this is the exact regression scenario from the original
        // bug: a sheet new to this run must resolve correctly from this
        // run's own sync, not a stale deployed sheetConfigs.ts.
        {
          sheetId: NEW_SHEET_GID,
          title: "Brand New Sheet",
          rows: buildGridRows({ 3: [] }),
        },
      ],
    });

    const operator = SheetConfigOperator.init();
    operator.fetchAndUpdateAll();
    const sheetConfigs = operator.newSheetConfigs();

    expect(sheetConfigs.property).toEqual({
      sheetGid: PROPERTY_GID,
      idPrefix: "prp",
      hasIdColumn: false,
    });
    expect(sheetConfigs.brandNewSheet).toEqual({
      sheetGid: NEW_SHEET_GID,
      idPrefix: "",
      hasIdColumn: false,
    });
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
          }),
          table: { endRowIndex: 4 },
        },
        {
          sheetId: NEW_SHEET_GID,
          title: "Brand New Sheet",
          rows: buildGridRows({ 3: [] }),
        },
      ],
    });

    const operator = SheetConfigOperator.init();
    operator.fetchAndUpdateAll();

    expect(operator.sheetNamesByGid().get(NEW_SHEET_GID)).toBe("brandNewSheet");
    expect(operator.toFileSource()).toContain('"brandNewSheet"');
  });
});
