import { beforeEach, describe, expect, it, vi } from "vitest";
import { stubPropertiesService } from "../testSupport/fakeAppsScriptGlobals";
import {
  buildGridRows,
  stubSheetsService,
} from "../testSupport/fakeSheetsService";
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

  it("sends no request when no ranges were gathered, since empty dataFilters would fetch the whole spreadsheet", () => {
    const { getByDataFilterCalls } = stubSheetsService({
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
    raw.fetchAllGathered();

    expect(getByDataFilterCalls).toEqual([]);
    expect(raw.activeSheetGids).toEqual([]);
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

  it("still gathers an append queued after a deletion on the same sheet, since row indexes only shift once the deletes are sent", () => {
    const { batchUpdateCalls } = stubSheetsService({
      sheets: [{ sheetId: 111, title: "Leases", table: { endRowIndex: 11 } }],
    });

    const raw = SpreadsheetRaw.init();
    raw.fetchAllSheetProperties();
    raw.sheet(111).data.row(5).delete();
    raw.sheet(111).data.appendDataRow();

    expect(() => raw.batchUpdateGSheets()).not.toThrow();
    expect(batchUpdateCalls[0]?.requests?.[0]).toEqual({
      appendCells: {
        sheetId: 111,
        tableId: "fake-table-111",
        rows: [{}],
        fields: "userEnteredValue",
      },
    });
    expect(raw.sheet(111).rowIndexesAreValid).toBe(false);
  });

  it("sends same-sheet row deletions in descending startIndex order so an earlier deletion can't shift a later one out from under it", () => {
    const { batchUpdateCalls } = stubSheetsService({
      sheets: [{ sheetId: 111, title: "Leases", table: { endRowIndex: 11 } }],
    });

    const raw = SpreadsheetRaw.init();
    raw.fetchAllSheetProperties();
    raw.sheet(111).data.row(5).delete();
    raw.sheet(111).data.row(10).delete();
    raw.batchUpdateGSheets();

    expect(batchUpdateCalls).toEqual([
      {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: 111,
                dimension: "ROWS",
                startIndex: 10,
                endIndex: 11,
              },
            },
          },
          {
            deleteDimension: {
              range: {
                sheetId: 111,
                dimension: "ROWS",
                startIndex: 5,
                endIndex: 6,
              },
            },
          },
        ],
      },
    ]);
  });
});

describe("CellRaw.updateValue", () => {
  it("sends a write to a row that was never fetched, since a write needs no fetched state", () => {
    const { batchUpdateCalls } = stubSheetsService({
      sheets: [{ sheetId: 111, title: "Leases", table: { endRowIndex: 11 } }],
    });

    const raw = SpreadsheetRaw.init();
    raw.fetchAllSheetProperties();
    raw.sheet(111).data.row(5).cell(2).updateValue("Processing...");
    raw.batchUpdateGSheets();

    expect(batchUpdateCalls[0]?.requests).toEqual([
      {
        updateCells: {
          range: {
            sheetId: 111,
            startRowIndex: 5,
            endRowIndex: 6,
            startColumnIndex: 2,
            endColumnIndex: 3,
          },
          rows: [
            {
              values: [{ userEnteredValue: { stringValue: "Processing..." } }],
            },
          ],
          fields: "userEnteredValue",
        },
      },
    ]);
  });

  it("leaves an unfetched row unreadable, so a forgotten fetch still fails loudly on read", () => {
    stubSheetsService({
      sheets: [{ sheetId: 111, title: "Leases", table: { endRowIndex: 11 } }],
    });

    const raw = SpreadsheetRaw.init();
    raw.fetchAllSheetProperties();
    const cell = raw.sheet(111).data.row(5).cell(2);
    cell.updateValue("Processing...");

    expect(() => cell.value()).toThrowError(/does not have a value set/);
  });

  it("throws for a data row past the table's last row rather than writing off the grid", () => {
    stubSheetsService({
      sheets: [{ sheetId: 111, title: "Leases", table: { endRowIndex: 11 } }],
    });

    const raw = SpreadsheetRaw.init();
    raw.fetchAllSheetProperties();

    expect(() =>
      raw.sheet(111).data.row(11).cell(2).updateValue("x"),
    ).toThrowError(/past the last row/);
  });

  it("reflects the write in row state when the row was fetched, so a later read sees it", () => {
    stubSheetsService({
      sheets: [
        {
          sheetId: 111,
          title: "Leases",
          rows: buildGridRows({
            0: ["c:lse:aaa", "c:lse:bbb"],
            4: ["r:lse:1", "old"],
          }),
          table: { endRowIndex: 5 },
        },
      ],
    });

    const raw = SpreadsheetRaw.init();
    raw.sheet(111).data.row(4).gatherFetchFull();
    raw.fetchAllGathered();
    const cell = raw.sheet(111).data.row(4).cell(1);
    cell.updateValue("new");

    expect(cell.value()).toBe("new");
  });
});

describe("SpreadsheetRaw.discardQueuedChanges", () => {
  it("sends nothing for changes queued before the discard", () => {
    const { batchUpdateCalls } = stubSheetsService({
      sheets: [{ sheetId: 111, title: "Leases", table: { endRowIndex: 11 } }],
    });

    const raw = SpreadsheetRaw.init();
    raw.fetchAllSheetProperties();
    raw.sheet(111).data.row(5).delete();
    raw.discardQueuedChanges();
    raw.batchUpdateGSheets();

    expect(batchUpdateCalls).toEqual([]);
    expect(raw.sheet(111).rowIndexesAreValid).toBe(true);
  });

  it("still sends changes queued after the discard, so a failure handler can report status", () => {
    const { batchUpdateCalls } = stubSheetsService({
      sheets: [{ sheetId: 111, title: "Leases", table: { endRowIndex: 11 } }],
    });

    const raw = SpreadsheetRaw.init();
    raw.fetchAllSheetProperties();
    raw.sheet(111).data.row(5).delete();
    raw.discardQueuedChanges();
    raw.sheet(111).data.appendDataRow();
    raw.batchUpdateGSheets();

    expect(batchUpdateCalls[0]?.requests).toEqual([
      {
        appendCells: {
          sheetId: 111,
          tableId: "fake-table-111",
          rows: [{}],
          fields: "userEnteredValue",
        },
      },
    ]);
  });
});

describe("SpreadsheetRaw.spreadsheetId", () => {
  it("reads the script property once and reuses it across instances sharing the state", () => {
    const properties = stubPropertiesService({
      realEstateSpreadsheetId: "test-spreadsheet-id",
    });
    const getProperty = vi.spyOn(properties, "getProperty");

    const raw = SpreadsheetRaw.init();
    expect(raw.spreadsheetId).toBe("test-spreadsheet-id");
    expect(raw.spreadsheetId).toBe("test-spreadsheet-id");
    expect(raw.sheet(111).spreadsheetId).toBe("test-spreadsheet-id");

    expect(getProperty).toHaveBeenCalledTimes(1);
  });
  it("throws every time when the property is missing", () => {
    stubPropertiesService({});

    const raw = SpreadsheetRaw.init();
    expect(() => raw.spreadsheetId).toThrowError(/Spreadsheet ID not found/);
    expect(() => raw.spreadsheetId).toThrowError(/Spreadsheet ID not found/);
  });
});

describe("DataColumnRaw.updateAllValues", () => {
  function stubFilledSheet() {
    return stubSheetsService({
      sheets: [
        {
          sheetId: 111,
          title: "Leases",
          rows: buildGridRows({
            0: ["c:lse:aaa", "c:lse:bbb"],
            4: ["r:lse:1", "old"],
            5: ["r:lse:2", "old"],
            6: ["r:lse:3", "old"],
          }),
          table: { endRowIndex: 7 },
        },
      ],
    });
  }
  function fetchedColumn() {
    const raw = SpreadsheetRaw.init();
    raw.sheet(111).data.column(1).gatherFetchFull();
    raw.fetchAllGathered();
    return raw;
  }

  it("sends one repeatCell for the whole column instead of one write per row", () => {
    const { batchUpdateCalls } = stubFilledSheet();

    const raw = fetchedColumn();
    raw.sheet(111).data.column(1).updateAllValues("new");
    raw.batchUpdateGSheets();

    expect(batchUpdateCalls[0]?.requests).toEqual([
      {
        repeatCell: {
          range: {
            sheetId: 111,
            startRowIndex: 4,
            endRowIndex: 7,
            startColumnIndex: 1,
            endColumnIndex: 2,
          },
          cell: { userEnteredValue: { stringValue: "new" } },
          fields: "userEnteredValue",
        },
      },
    ]);
  });

  it("mirrors the fill into row state, so a read before the flush sees it", () => {
    stubFilledSheet();

    const raw = fetchedColumn();
    raw.sheet(111).data.column(1).updateAllValues("new");

    expect(raw.sheet(111).data.column(1).valueArr).toEqual([
      "new",
      "new",
      "new",
    ]);
  });

  it("orders a per-cell write after the fill, so the cell wins", () => {
    const { batchUpdateCalls } = stubFilledSheet();

    const raw = fetchedColumn();
    raw.sheet(111).data.column(1).updateAllValues("filled");
    raw.sheet(111).data.row(5).cell(1).updateValue("overridden");
    raw.batchUpdateGSheets();

    const requests = batchUpdateCalls[0]?.requests ?? [];
    expect(requests[0]?.repeatCell?.cell?.userEnteredValue).toEqual({
      stringValue: "filled",
    });
    expect(
      requests[1]?.updateCells?.rows?.[0]?.values?.[0]?.userEnteredValue,
    ).toEqual({
      stringValue: "overridden",
    });
  });

  it("leaves a row appended after the fill alone, since the fill's bound is snapshotted", () => {
    const { batchUpdateCalls } = stubFilledSheet();

    const raw = fetchedColumn();
    raw.sheet(111).data.column(1).updateAllValues("filled");
    raw.sheet(111).data.appendDataRow();
    raw.batchUpdateGSheets();

    const fill = (batchUpdateCalls[0]?.requests ?? []).find(
      (r) => r.repeatCell,
    );
    expect(fill?.repeatCell?.range?.endRowIndex).toBe(7);
  });
});
