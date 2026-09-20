import { beforeEach, describe, expect, it } from "vitest";
import { columnConfigs } from "../01_SpreadsheetSchema/generated/columnConfigs";
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
// (src/01_SpreadsheetSchema/generated/columnConfigs.ts) — using these rather than
// made-up ids means the fixture stays honest to what the production code
// actually resolves column names through.
const sc = columnConfigs.sheetConfig;
const sheetConfigGid = 210603630;
const propertyGid = 999001;
const newSheetGid = 999002;
const unitGid = 999003;

const sheetConfigColumnIdRow = [
  sc.sheetGid.columnId,
  sc.sheetTitle.columnId,
  sc.letApiAccess.columnId,
];

const existingPropertyConfigRow = [propertyGid, "Property", true];

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
// ss.raw.activeSheetGids (the catalogue walk, and hence
// skipFetchingProperties below) with every live sheet, including ones with
// no Sheet Config row yet.
function syncSheetConfigOperator(operator: SheetConfigOperator): void {
  operator.ss.raw.fetchAllSheetProperties();
  operator.sheet.prepFetchColumnsFull("letApiAccess");
  operator.prepFetchForSync();
  operator.ss.fetchAllPrepped({ skipFetchingProperties: true });
  operator.syncToSpreadsheet();
}

describe("SheetConfigOperator.newSheetConfigs / toFileSource", () => {
  it("carries forward an existing sheet and appends a brand-new one, excluded until manually enabled", () => {
    stubSheetsService({
      sheets: [
        {
          sheetId: sheetConfigGid,
          title: "Sheet Config",
          rows: buildGridRows({
            0: sheetConfigColumnIdRow,
            4: existingPropertyConfigRow,
          }),
          table: { endRowIndex: 5 },
        },
        // Referenced by the existing row above; no "ID" header, so
        // hasIdColumn is emitted false from the header-row sample.
        {
          sheetId: propertyGid,
          title: "Property",
          rows: buildGridRows({ 3: [] }),
          table: { endRowIndex: 5 },
        },
        // Present in the spreadsheet but with NO existing Sheet Config row.
        {
          sheetId: newSheetGid,
          title: "Brand New Sheet",
          rows: buildGridRows({ 3: [] }),
          table: { endRowIndex: 5 },
        },
      ],
    });

    const operator = SheetConfigOperator.init();
    syncSheetConfigOperator(operator);
    const sheetConfigs = operator.newSheetConfigs();

    expect(sheetConfigs.property).toEqual({
      sheetGid: propertyGid,
      idPrefix: "prp",
      hasIdColumn: false,
    });
    // A newly-discovered sheet gets a Sheet Config row appended, but stays
    // excluded from the generated file until a human sets letApiAccess.
    expect(sheetConfigs.brandNewSheet).toBeUndefined();
    expect(operator.sheet.column("sheetGid").hasValue(newSheetGid)).toBe(true);
  });

  it("resolves sheetGid -> sheetName for a sheet not yet in any deployed config", () => {
    stubSheetsService({
      sheets: [
        {
          sheetId: sheetConfigGid,
          title: "Sheet Config",
          rows: buildGridRows({
            0: sheetConfigColumnIdRow,
            // A human already turned on API access for this sheet, but no
            // deploy has run since — this run's own live sync is the only
            // place the mapping exists.
            4: [newSheetGid, "Brand New Sheet", true],
          }),
          table: { endRowIndex: 5 },
        },
        {
          sheetId: newSheetGid,
          title: "Brand New Sheet",
          rows: buildGridRows({ 3: [] }),
          table: { endRowIndex: 5 },
        },
      ],
    });

    const operator = SheetConfigOperator.init();
    syncSheetConfigOperator(operator);

    expect(operator.sheetNamesByGid().get(newSheetGid)).toBe("brandNewSheet");
    expect(operator.newSheetConfigs().brandNewSheet).toEqual({
      sheetGid: newSheetGid,
      idPrefix: "bns",
      hasIdColumn: false,
    });
  });

  // A checkbox nobody has ever touched reads blank, not false.
  it("excludes a sheet whose API-access checkbox has never been ticked", () => {
    stubSheetsService({
      sheets: [
        {
          sheetId: sheetConfigGid,
          title: "Sheet Config",
          rows: buildGridRows({
            0: sheetConfigColumnIdRow,
            4: [propertyGid, "Property", null, "prp"],
          }),
          table: { endRowIndex: 5 },
        },
        {
          sheetId: propertyGid,
          title: "Property",
          rows: buildGridRows({ 3: [] }),
          table: { endRowIndex: 5 },
        },
      ],
    });

    const operator = SheetConfigOperator.init();
    syncSheetConfigOperator(operator);

    expect(operator.newSheetConfigs().property).toBeUndefined();
    expect(operator.sheetGidsApiAccesses()).toEqual([sheetConfigGid]);
  });

  // Every seeded row names a sheet that no longer exists, so the prune reaches the last one.
  it("clears the last stale row rather than deleting it, and syncs past it without throwing", () => {
    stubSheetsService({
      sheets: [
        {
          sheetId: sheetConfigGid,
          title: "Sheet Config",
          rows: buildGridRows({
            0: sheetConfigColumnIdRow,
            4: existingPropertyConfigRow,
            5: [newSheetGid, "Gone", true],
          }),
          table: { endRowIndex: 6 },
        },
      ],
    });

    const operator = SheetConfigOperator.init();

    expect(() => syncSheetConfigOperator(operator)).not.toThrow();
    expect(operator.sheet.row(5).isBlank).toBe(true);
    expect(operator.newSheetConfigs().property).toBeUndefined();
    expect(operator.newSheetConfigs().sheetConfig).toEqual({
      sheetGid: sheetConfigGid,
      idPrefix: "scf",
      hasIdColumn: false,
    });
  });

  it("assigns an ID prefix from the tab title when a Let api access sheet has no column IDs", () => {
    stubSheetsService({
      sheets: [
        {
          sheetId: sheetConfigGid,
          title: "Sheet Config",
          rows: buildGridRows({
            0: sheetConfigColumnIdRow,
            4: [propertyGid, "Property", true],
          }),
          table: { endRowIndex: 5 },
        },
        {
          sheetId: propertyGid,
          title: "Property",
          rows: buildGridRows({ 3: [] }),
          table: { endRowIndex: 5 },
        },
      ],
    });

    const operator = SheetConfigOperator.init();
    syncSheetConfigOperator(operator);

    expect(operator.newSheetConfigs().property).toEqual({
      sheetGid: propertyGid,
      idPrefix: "prp",
      hasIdColumn: false,
    });
  });

  it("emits has-ID from the described sheet's header row and still corrects the sheet title", () => {
    stubSheetsService({
      sheets: [
        {
          sheetId: sheetConfigGid,
          title: "Sheet Config",
          rows: buildGridRows({
            0: sheetConfigColumnIdRow,
            4: [propertyGid, "Stale Title", true],
          }),
          table: { endRowIndex: 5 },
        },
        {
          sheetId: propertyGid,
          title: "Property",
          rows: buildGridRows({ 3: ["Name"] }),
          table: { endRowIndex: 5 },
        },
      ],
    });

    const operator = SheetConfigOperator.init();
    syncSheetConfigOperator(operator);

    expect(operator.sheet.column("sheetTitle").value(4)).toBe("Property");
    expect(operator.newSheetConfigs().property?.hasIdColumn).toBe(false);
  });

  it("corrects a draft tab's title from the live tab name without reading its Table", () => {
    stubSheetsService({
      sheets: [
        {
          sheetId: sheetConfigGid,
          title: "Sheet Config",
          rows: buildGridRows({
            0: sheetConfigColumnIdRow,
            4: [propertyGid, "Stale Title", false],
          }),
          table: { endRowIndex: 5 },
        },
        {
          sheetId: propertyGid,
          title: "Property",
          rows: buildGridRows({ 3: ["Name"] }),
          table: { endRowIndex: 4 },
        },
      ],
    });

    const operator = SheetConfigOperator.init();
    syncSheetConfigOperator(operator);

    expect(operator.sheet.column("sheetTitle").value(4)).toBe("Property");
    expect(operator.newSheetConfigs().property).toBeUndefined();
  });

  it("emits has-ID true when the described sheet's header row has the ID header", () => {
    stubSheetsService({
      sheets: [
        {
          sheetId: sheetConfigGid,
          title: "Sheet Config",
          rows: buildGridRows({
            0: sheetConfigColumnIdRow,
            4: [propertyGid, "Property", true],
          }),
          table: { endRowIndex: 5 },
        },
        {
          sheetId: propertyGid,
          title: "Property",
          rows: buildGridRows({ 3: ["ID", "Name"] }),
          table: { endRowIndex: 5 },
        },
      ],
    });

    const operator = SheetConfigOperator.init();
    syncSheetConfigOperator(operator);

    expect(operator.newSheetConfigs().property?.hasIdColumn).toBe(true);
  });

  it("throws when two sheets share a sampled ID prefix, named by sheet title", () => {
    stubSheetsService({
      sheets: [
        {
          sheetId: sheetConfigGid,
          title: "Sheet Config",
          rows: buildGridRows({
            0: sheetConfigColumnIdRow,
            4: [propertyGid, "Property", true],
            5: [unitGid, "Unit", true],
          }),
          table: { endRowIndex: 6 },
        },
        {
          sheetId: propertyGid,
          title: "Property",
          rows: buildGridRows({ 0: ["c:prp:aaa"], 3: [] }),
          table: { endRowIndex: 5 },
        },
        {
          sheetId: unitGid,
          title: "Unit",
          rows: buildGridRows({ 0: ["c:prp:bbb"], 3: [] }),
          table: { endRowIndex: 5 },
        },
      ],
    });

    const operator = SheetConfigOperator.init();
    syncSheetConfigOperator(operator);

    expect(() => operator.toFileSource()).toThrow(/Property.*Unit.*"prp"/);
  });
});
