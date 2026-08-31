import { beforeEach, describe, expect, it } from "vitest";
import { stubPropertiesService } from "../testSupport/fakeAppsScriptGlobals";
import { buildGridRows, stubSheetsService } from "../testSupport/fakeSheetsService";
import { SpreadsheetRaw } from "./SpreadsheetRaw";

beforeEach(() => {
  stubPropertiesService({ realEstateSpreadsheetId: "test-spreadsheet-id" });
});

describe("SpreadsheetRaw.fetchAllSheetProperties", () => {
  it("integrates sheet properties from Sheets.Spreadsheets.get into raw state", () => {
    stubSheetsService({
      sheets: [{ sheetId: 111, title: "Leases" }],
    });

    const raw = SpreadsheetRaw.init();
    raw.fetchAllSheetProperties();

    expect(raw.activeSheetGids).toEqual([111]);
    expect(raw.sheet(111).title).toBe("Leases");
  });
});

describe("SpreadsheetRaw.fetchAllGathered", () => {
  it("throws one aggregate error naming every sheet queued for a full fetch that has no Table", () => {
    stubSheetsService({
      sheets: [
        { sheetId: 111, title: "Task Generic" },
        { sheetId: 222, title: "Task Material" },
      ],
    });

    const raw = SpreadsheetRaw.init();
    raw.sheet(111).headerRow.gatherFetchFull();
    raw.sheet(222).headerRow.gatherFetchFull();

    expect(() => raw.fetchAllGathered()).toThrowError(
      /"Task Generic" \(gid 111\).*"Task Material" \(gid 222\)/,
    );
  });

  it("does not throw for a sheet with a Table", () => {
    stubSheetsService({
      sheets: [
        {
          sheetId: 111,
          title: "Leases",
          rows: buildGridRows({ 0: ["ID"] }),
          table: { endRowIndex: 4 },
        },
      ],
    });

    const raw = SpreadsheetRaw.init();
    raw.sheet(111).headerRow.gatherFetchFull();

    expect(() => raw.fetchAllGathered()).not.toThrow();
  });
});

describe("SpreadsheetRaw.batchUpdateGSheets", () => {
  it("sends exactly the sort request gathered for a sheet-level sort change", () => {
    const { batchUpdateCalls } = stubSheetsService();

    const raw = SpreadsheetRaw.init();
    raw.sheet(111).requestSortGSheet({
      colIdxToSortBy: 2,
      sortOrder: "ASCENDING",
    });
    raw.batchUpdateGSheets();

    expect(batchUpdateCalls).toEqual([
      {
        requests: [
          {
            sortRange: {
              range: { sheetId: 111, startRowIndex: 4, startColumnIndex: 0 },
              sortSpecs: [{ dimensionIndex: 2, sortOrder: "ASCENDING" }],
            },
          },
        ],
      },
    ]);
  });

  it("sends no request when there is nothing to save", () => {
    const { batchUpdateCalls } = stubSheetsService();

    SpreadsheetRaw.init().batchUpdateGSheets();

    expect(batchUpdateCalls).toEqual([]);
  });
});
