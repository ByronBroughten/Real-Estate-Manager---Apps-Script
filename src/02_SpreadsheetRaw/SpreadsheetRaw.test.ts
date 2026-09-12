import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CellValue } from "../00_base/base";
import { getSheetTraitByName } from "../01_generatedConfigs/sheetConfigsTypes";
import { ssConfigGet } from "../01_generatedConfigs/spreadsheetConfigTypes";
import { stubPropertiesService } from "../testSupport/fakeAppsScriptGlobals";
import {
  buildGridRows,
  stubSheetsService,
  type FakeCell,
  type FakeSheetProperties,
} from "../testSupport/fakeSheetsService";
import { assertType, type IsExactly } from "../testSupport/typeAssertions";
import type { CellRaw } from "./CellRaw";
import type { RowCommonRaw } from "./ClassBases/RowCommonRaw";
import { ColumnMetaRaw } from "./ColumnMetaRaw";
import { ColumnRaw } from "./ColumnRaw";
import { RowRaw } from "./RowRaw";
import { SheetMetaRaw } from "./SheetMetaRaw";
import { SheetRaw } from "./SheetRaw";
import { SpreadsheetRaw } from "./SpreadsheetRaw";
import { UniformRowRaw } from "./UniformRowRaw";

const LIGHT_GREEN = { red: 0.851, green: 0.918, blue: 0.827 };

const PROPERTY_GID = getSheetTraitByName("property", "sheetGid");
const UNIT_GID = getSheetTraitByName("unit", "sheetGid");
const HEADER_ROW_INDEX = ssConfigGet("headerRowIndexBase0");
const START_TABLE_COL_INDEX = ssConfigGet("startTableColIndexBase0");
const TOP_DATA_ROW_INDEX = ssConfigGet("topDataRowIdxBase0");
const SCRATCH_GID = 999999;
const TABLE_END_ROW_INDEX = HEADER_ROW_INDEX + 3;

function placedTableSheet(sheet: {
  sheetId: number;
  title: string;
}): FakeSheetProperties {
  return {
    ...sheet,
    rows: buildGridRows({ [HEADER_ROW_INDEX]: ["ID"] }),
    table: { endRowIndex: TABLE_END_ROW_INDEX },
  };
}

function misplacedTableSheet({
  startRowIndex = HEADER_ROW_INDEX,
  startColumnIndex = START_TABLE_COL_INDEX,
  ...sheet
}: {
  sheetId: number;
  title: string;
  startRowIndex?: number;
  startColumnIndex?: number;
}): FakeSheetProperties {
  return {
    ...placedTableSheet(sheet),
    table: {
      endRowIndex: TABLE_END_ROW_INDEX,
      startRowIndex,
      startColumnIndex,
    },
  };
}

function thrownMessage(fn: () => void): string {
  try {
    fn();
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error("Expected the call to throw, but it did not.");
}

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
    raw.sheetMeta(111).headerRow.gatherFetchFull();
    raw.sheetMeta(222).headerRow.gatherFetchFull();

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
    raw.sheetMeta(111).headerRow.gatherFetchFull();

    expect(() => raw.fetchAllGathered()).not.toThrow();
  });

  it("does not throw for a config-known sheet whose Table starts where the layout requires", () => {
    stubSheetsService({
      sheets: [placedTableSheet({ sheetId: PROPERTY_GID, title: "Property" })],
    });

    const raw = SpreadsheetRaw.init();
    raw.sheetMeta(PROPERTY_GID).headerRow.gatherFetchFull();

    expect(() => raw.fetchAllGathered()).not.toThrow();
  });

  it("names both the found and the required position for a Table one row too high", () => {
    stubSheetsService({
      sheets: [
        misplacedTableSheet({
          sheetId: PROPERTY_GID,
          title: "Property",
          startRowIndex: HEADER_ROW_INDEX - 1,
        }),
      ],
    });

    const raw = SpreadsheetRaw.init();
    raw.sheetMeta(PROPERTY_GID).headerRow.gatherFetchFull();

    expect(() => raw.fetchAllGathered()).toThrowError(
      /"Property".*starts at row 3, column A.*must start at row 4, column A/,
    );
  });

  it("names both positions for a Table one column to the right of the layout", () => {
    stubSheetsService({
      sheets: [
        misplacedTableSheet({
          sheetId: PROPERTY_GID,
          title: "Property",
          startColumnIndex: START_TABLE_COL_INDEX + 1,
        }),
      ],
    });

    const raw = SpreadsheetRaw.init();
    raw.sheetMeta(PROPERTY_GID).headerRow.gatherFetchFull();

    expect(() => raw.fetchAllGathered()).toThrowError(
      /"Property".*starts at row 4, column B.*must start at row 4, column A/,
    );
  });

  it("leaves a sheet the config does not know alone, however its Table is placed", () => {
    stubSheetsService({
      sheets: [
        misplacedTableSheet({
          sheetId: SCRATCH_GID,
          title: "Byron's Scratch Sheet",
          startRowIndex: HEADER_ROW_INDEX - 1,
        }),
      ],
    });

    const raw = SpreadsheetRaw.init();
    raw.sheetMeta(SCRATCH_GID).headerRow.gatherFetchFull();

    expect(() => raw.fetchAllGathered()).not.toThrow();
  });

  it("names every misplaced sheet in one error, including one nothing was queued for", () => {
    stubSheetsService({
      sheets: [
        misplacedTableSheet({
          sheetId: PROPERTY_GID,
          title: "Property",
          startRowIndex: HEADER_ROW_INDEX - 1,
        }),
        misplacedTableSheet({
          sheetId: UNIT_GID,
          title: "Unit",
          startColumnIndex: START_TABLE_COL_INDEX + 1,
        }),
      ],
    });

    const raw = SpreadsheetRaw.init();
    raw.sheetMeta(PROPERTY_GID).headerRow.gatherFetchFull();

    expect(() => raw.fetchAllGathered()).toThrowError(/"Property".*"Unit"/);
  });

  it("reports a Table the filtered fetch could not see as misplaced rather than absent", () => {
    stubSheetsService({
      sheets: [
        {
          ...misplacedTableSheet({
            sheetId: PROPERTY_GID,
            title: "Property",
            startRowIndex: HEADER_ROW_INDEX + 2,
          }),
          isTableHiddenFromFilteredFetch: true,
        },
      ],
    });

    const raw = SpreadsheetRaw.init();
    raw.sheetMeta(PROPERTY_GID).headerRow.gatherFetchFull();

    const message = thrownMessage(() => raw.fetchAllGathered());
    expect(message).toMatch(
      /"Property".*starts at row 6, column A.*must start at row 4, column A/,
    );
    expect(message).not.toMatch(/Insert > Table/);
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

describe("ColumnMetaRaw active facts", () => {
  const TABLE_END_ROW = TOP_DATA_ROW_INDEX + 1;

  function stubSheetWithTopDataRow(
    topDataRow: FakeCell[],
    absence?: "rowsWithNoGridData" | "rowsWithNoGridBlock",
  ) {
    stubSheetsService({
      sheets: [
        {
          sheetId: PROPERTY_GID,
          title: "Property",
          rows: buildGridRows({
            0: ["c:prp:aaa", "c:prp:bbb"],
            [HEADER_ROW_INDEX]: ["Purchase Price", "Notes"],
            [TOP_DATA_ROW_INDEX]: topDataRow,
          }),
          ...(absence ? { [absence]: [TOP_DATA_ROW_INDEX] } : {}),
          table: { endRowIndex: TABLE_END_ROW },
        },
      ],
    });
  }

  function fetchedPropertyColumnMeta(colIndex: number): ColumnMetaRaw {
    const raw = SpreadsheetRaw.init();
    raw.sheet(PROPERTY_GID).topRow.gatherFetchFull();
    raw.fetchAllGathered(true);
    return raw.sheetMeta(PROPERTY_GID).column(colIndex);
  }

  function expectBlankFacts(column: ColumnMetaRaw): void {
    expect(column.activeIsFormula).toBe(false);
    expect(column.activeNumberFormatType).toBeUndefined();
    expect(column.activeTopValue).toBe("");
  }

  it("reports blank facts for a top data row returned without any cell data", () => {
    stubSheetWithTopDataRow([], "rowsWithNoGridData");

    expectBlankFacts(fetchedPropertyColumnMeta(0));
  });

  it("reports blank facts for a top data row returned as no grid block at all", () => {
    stubSheetWithTopDataRow([], "rowsWithNoGridBlock");

    expectBlankFacts(fetchedPropertyColumnMeta(0));
  });

  it("reports the same facts an empty cell inside a returned row produces", () => {
    stubSheetWithTopDataRow([null, "a note"]);

    expectBlankFacts(fetchedPropertyColumnMeta(0));
  });

  it("keeps the facts the payload supplied rather than seeding over them", () => {
    stubSheetWithTopDataRow([
      { value: 42, isFormula: true, numberFormatType: "CURRENCY" },
    ]);

    const column = fetchedPropertyColumnMeta(0);

    expect(column.activeIsFormula).toBe(true);
    expect(column.activeNumberFormatType).toBe("CURRENCY");
    expect(column.activeTopValue).toBe(42);
  });

  it("reports blank facts for a full-column fetch of a wholly blank column", () => {
    stubSheetWithTopDataRow([], "rowsWithNoGridData");

    const raw = SpreadsheetRaw.init();
    raw.sheet(PROPERTY_GID).gatherFetchProperties();
    raw.fetchAllGathered();
    raw.sheet(PROPERTY_GID).column(1).gatherFetchFull();
    raw.fetchAllGathered(true);

    expectBlankFacts(raw.sheetMeta(PROPERTY_GID).column(1));
  });

  it("throws naming the sheet and the missing fetch for a column nothing fetched", () => {
    stubSheetsService({
      sheets: [
        {
          sheetId: PROPERTY_GID,
          title: "Property",
          rows: buildGridRows({ [HEADER_ROW_INDEX]: ["Purchase Price"] }),
          table: { endRowIndex: TABLE_END_ROW },
        },
      ],
    });

    const raw = SpreadsheetRaw.init();
    raw.sheet(PROPERTY_GID).gatherFetchProperties();
    raw.fetchAllGathered();

    const message = thrownMessage(
      () => raw.sheetMeta(PROPERTY_GID).column(0).activeIsFormula,
    );
    expect(message).toContain(`"Property" (gid ${PROPERTY_GID})`);
    expect(message).toMatch(/top data row/);
  });

  it("writes no facts for a grid column outside the table", () => {
    stubSheetsService({
      sheets: [
        {
          sheetId: PROPERTY_GID,
          title: "Property",
          rows: buildGridRows({
            0: ["c:prp:aaa"],
            [HEADER_ROW_INDEX]: ["Purchase Price"],
            [TOP_DATA_ROW_INDEX]: [100000, "outside the table"],
          }),
          table: { endRowIndex: TABLE_END_ROW, endColumnIndex: 1 },
        },
      ],
    });

    const raw = SpreadsheetRaw.init();
    raw.sheet(PROPERTY_GID).topRow.gatherFetchFull();
    raw.fetchAllGathered(true);

    expect(raw.sheetMeta(PROPERTY_GID).column(0).activeTopValue).toBe(100000);
    expect(
      () => raw.sheetMeta(PROPERTY_GID).column(1).activeTopValue,
    ).toThrowError(/No active facts/);
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

  it("sends one appendCells whose rows array is the full append, so a Sheets table grows by every row rather than by one", () => {
    const { batchUpdateCalls } = stubSheetsService({
      sheets: [{ sheetId: 111, title: "Leases", table: { endRowIndex: 11 } }],
    });

    const raw = SpreadsheetRaw.init();
    raw.fetchAllSheetProperties();
    raw.sheet(111).appendDataRow();
    raw.sheet(111).appendDataRow();
    raw.sheet(111).appendDataRow();
    raw.batchUpdateGSheets();

    expect(batchUpdateCalls[0]?.requests).toEqual([
      {
        appendCells: {
          sheetId: 111,
          tableId: "fake-table-111",
          rows: [{}, {}, {}],
          fields: "userEnteredValue",
        },
      },
    ]);
  });

  it("keeps a second sheet's append as its own request rather than folding it into the first table's", () => {
    const { batchUpdateCalls } = stubSheetsService({
      sheets: [
        { sheetId: 111, title: "Leases", table: { endRowIndex: 11 } },
        { sheetId: 222, title: "Units", table: { endRowIndex: 6 } },
      ],
    });

    const raw = SpreadsheetRaw.init();
    raw.fetchAllSheetProperties();
    raw.sheet(111).appendDataRow();
    raw.sheet(222).appendDataRow();
    raw.sheet(111).appendDataRow();
    raw.batchUpdateGSheets();

    expect(batchUpdateCalls[0]?.requests).toEqual([
      {
        appendCells: {
          sheetId: 111,
          tableId: "fake-table-111",
          rows: [{}, {}],
          fields: "userEnteredValue",
        },
      },
      {
        appendCells: {
          sheetId: 222,
          tableId: "fake-table-222",
          rows: [{}],
          fields: "userEnteredValue",
        },
      },
    ]);
  });

  it("still gathers an append queued after a deletion on the same sheet, since row indexes only shift once the deletes are sent", () => {
    const { batchUpdateCalls } = stubSheetsService({
      sheets: [{ sheetId: 111, title: "Leases", table: { endRowIndex: 11 } }],
    });

    const raw = SpreadsheetRaw.init();
    raw.fetchAllSheetProperties();
    raw.sheet(111).row(5).delete();
    raw.sheet(111).appendDataRow();

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
    raw.sheet(111).row(5).delete();
    raw.sheet(111).row(10).delete();
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

describe("SpreadsheetRaw.gatherRawRequest", () => {
  it("sends a raw request last, after every request the framework models", () => {
    const { batchUpdateCalls } = stubSheetsService({
      sheets: [{ sheetId: 111, title: "Leases", table: { endRowIndex: 11 } }],
    });

    const raw = SpreadsheetRaw.init();
    raw.fetchAllSheetProperties();
    raw.gatherRawRequest({ updateTable: { table: { tableId: "t" } } });
    raw.sheet(111).row(5).cell(2).updateValue("Processing...");
    raw.sheet(111).row(10).delete();
    raw.batchUpdateGSheets();

    const requests = batchUpdateCalls[0]?.requests ?? [];
    expect(requests.map((request) => Object.keys(request)[0])).toEqual([
      "updateCells",
      "deleteDimension",
      "updateTable",
    ]);
  });

  it("discards a raw request alongside every other queued change", () => {
    const { batchUpdateCalls } = stubSheetsService();

    const raw = SpreadsheetRaw.init();
    raw.gatherRawRequest({ updateTable: { table: { tableId: "t" } } });
    raw.discardQueuedChanges();
    raw.batchUpdateGSheets();

    expect(batchUpdateCalls).toEqual([]);
  });
});

describe("RowRaw.delete", () => {
  function stubSheetWithDataRows(dataRowCount: number) {
    return stubSheetsService({
      sheets: [
        {
          sheetId: 111,
          title: "Leases",
          table: { endRowIndex: TOP_DATA_ROW_INDEX + dataRowCount },
        },
      ],
    });
  }

  it("refuses to delete the only data row, since a new row copies its formulas from the rows already there", () => {
    stubSheetWithDataRows(1);

    const raw = SpreadsheetRaw.init();
    raw.fetchAllSheetProperties();

    expect(() => raw.sheet(111).topRow.delete()).toThrowError(
      /last data row.*may never be left with none/,
    );
  });

  it("refuses the delete that would take the last of several to zero", () => {
    stubSheetWithDataRows(3);

    const raw = SpreadsheetRaw.init();
    raw.fetchAllSheetProperties();
    raw.sheet(111).row(4).delete();
    raw.sheet(111).row(5).delete();

    expect(() => raw.sheet(111).row(6).delete()).toThrowError(
      /last data row.*may never be left with none/,
    );
  });

  it("still emits a row deletion when other data rows survive it", () => {
    const { batchUpdateCalls } = stubSheetWithDataRows(2);

    const raw = SpreadsheetRaw.init();
    raw.fetchAllSheetProperties();
    raw.sheet(111).row(5).delete();
    raw.batchUpdateGSheets();

    expect(batchUpdateCalls[0]?.requests).toEqual([
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
    ]);
  });

  it("counts a row appended and then deleted as neither, since the two cancel before the flush", () => {
    stubSheetWithDataRows(1);

    const raw = SpreadsheetRaw.init();
    raw.fetchAllSheetProperties();
    raw.sheet(111).appendDataRow().delete();

    expect(() => raw.sheet(111).topRow.delete()).toThrowError(/last data row/);
  });
});

describe("CellRaw.updateValue", () => {
  it("sends a write to a row that was never fetched, since a write needs no fetched state", () => {
    const { batchUpdateCalls } = stubSheetsService({
      sheets: [{ sheetId: 111, title: "Leases", table: { endRowIndex: 11 } }],
    });

    const raw = SpreadsheetRaw.init();
    raw.fetchAllSheetProperties();
    raw.sheet(111).row(5).cell(2).updateValue("Processing...");
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
    const cell = raw.sheet(111).row(5).cell(2);
    cell.updateValue("Processing...");

    expect(() => cell.valueOrEmpty()).toThrowError(/does not have a value set/);
  });

  it("throws for a data row past the table's last row rather than writing off the grid", () => {
    stubSheetsService({
      sheets: [{ sheetId: 111, title: "Leases", table: { endRowIndex: 11 } }],
    });

    const raw = SpreadsheetRaw.init();
    raw.fetchAllSheetProperties();

    expect(() => raw.sheet(111).row(11).cell(2).updateValue("x")).toThrowError(
      /past the last row/,
    );
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
    raw.sheet(111).row(4).gatherFetchFull();
    raw.fetchAllGathered();
    const cell = raw.sheet(111).row(4).cell(1);
    cell.updateValue("new");

    expect(cell.valueOrEmpty()).toBe("new");
  });
});

describe("SpreadsheetRaw.discardQueuedChanges", () => {
  it("sends nothing for changes queued before the discard", () => {
    const { batchUpdateCalls } = stubSheetsService({
      sheets: [{ sheetId: 111, title: "Leases", table: { endRowIndex: 11 } }],
    });

    const raw = SpreadsheetRaw.init();
    raw.fetchAllSheetProperties();
    raw.sheet(111).row(5).delete();
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
    raw.sheet(111).row(5).delete();
    raw.discardQueuedChanges();
    raw.sheet(111).appendDataRow();
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

describe("ColumnRaw.updateAllCells", () => {
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
    raw.sheet(111).column(1).gatherFetchFull();
    raw.fetchAllGathered();
    return raw;
  }

  it("sends one repeatCell for the whole column instead of one write per row", () => {
    const { batchUpdateCalls } = stubFilledSheet();

    const raw = fetchedColumn();
    raw.sheet(111).column(1).updateAllCells({ value: "new" });
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
    raw.sheet(111).column(1).updateAllCells({ value: "new" });

    expect(raw.sheet(111).column(1).valueArrOrEmpty).toEqual([
      "new",
      "new",
      "new",
    ]);
  });

  it("orders a per-cell write after the fill, so the cell wins", () => {
    const { batchUpdateCalls } = stubFilledSheet();

    const raw = fetchedColumn();
    raw.sheet(111).column(1).updateAllCells({ value: "filled" });
    raw.sheet(111).row(5).cell(1).updateValue("overridden");
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

  it("carries a background colour alongside the value in the one fill request", () => {
    const { batchUpdateCalls } = stubFilledSheet();

    const raw = fetchedColumn();
    raw
      .sheet(111)
      .column(1)
      .updateAllCells({ value: "new", backgroundColor: LIGHT_GREEN });
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
          cell: {
            userEnteredValue: { stringValue: "new" },
            userEnteredFormat: { backgroundColor: LIGHT_GREEN },
          },
          fields: "userEnteredValue,userEnteredFormat.backgroundColor",
        },
      },
    ]);
  });

  it("leaves a row appended after the fill alone, since the fill's bound is snapshotted", () => {
    const { batchUpdateCalls } = stubFilledSheet();

    const raw = fetchedColumn();
    raw.sheet(111).column(1).updateAllCells({ value: "filled" });
    raw.sheet(111).appendDataRow();
    raw.batchUpdateGSheets();

    const fill = (batchUpdateCalls[0]?.requests ?? []).find(
      (r) => r.repeatCell,
    );
    expect(fill?.repeatCell?.range?.endRowIndex).toBe(7);
  });
});

describe("ColumnRaw.updateActiveCells", () => {
  function stubSelectionSheet() {
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
            7: ["r:lse:4", "old"],
            8: ["r:lse:5", "old"],
          }),
          table: { endRowIndex: 9 },
        },
      ],
    });
  }
  function fetchedSelectionSheet() {
    const raw = SpreadsheetRaw.init();
    raw.sheetMeta(111).colIdRow.gatherFetchFull();
    raw.sheet(111).column(1).gatherFetchFull();
    raw.fetchAllGathered();
    return raw;
  }
  function fillRanges(
    calls: GoogleAppsScript.Sheets.Schema.BatchUpdateSpreadsheetRequest[],
  ) {
    return calls
      .flatMap((call) => call.requests ?? [])
      .filter((request) => request.repeatCell)
      .map((request) => ({
        startRowIndex: request.repeatCell?.range?.startRowIndex,
        endRowIndex: request.repeatCell?.range?.endRowIndex,
      }));
  }

  it("sends one request for a column whose active rows are all contiguous", () => {
    const { batchUpdateCalls } = stubSelectionSheet();

    const raw = fetchedSelectionSheet();
    raw.sheet(111).column(1).updateActiveCells({ value: "new" });
    raw.batchUpdateGSheets();

    expect(fillRanges(batchUpdateCalls)).toEqual([
      { startRowIndex: 4, endRowIndex: 9 },
    ]);
  });

  it("sends one request per contiguous run rather than one per row", () => {
    const { batchUpdateCalls } = stubSelectionSheet();

    const raw = fetchedSelectionSheet();
    raw.sheet(111).removeRowsExcept(4, 5, 8);
    raw.sheet(111).column(1).updateActiveCells({ value: "new" });
    raw.batchUpdateGSheets();

    expect(fillRanges(batchUpdateCalls)).toEqual([
      { startRowIndex: 4, endRowIndex: 6 },
      { startRowIndex: 8, endRowIndex: 9 },
    ]);
  });

  it("carries value and background colour together under a mask naming both", () => {
    const { batchUpdateCalls } = stubSelectionSheet();

    const raw = fetchedSelectionSheet();
    raw.sheet(111).removeRowsExcept(4);
    raw
      .sheet(111)
      .column(1)
      .updateActiveCells({ value: "new", backgroundColor: LIGHT_GREEN });
    raw.batchUpdateGSheets();

    expect(batchUpdateCalls[0]?.requests).toEqual([
      {
        repeatCell: {
          range: {
            sheetId: 111,
            startRowIndex: 4,
            endRowIndex: 5,
            startColumnIndex: 1,
            endColumnIndex: 2,
          },
          cell: {
            userEnteredValue: { stringValue: "new" },
            userEnteredFormat: { backgroundColor: LIGHT_GREEN },
          },
          fields: "userEnteredValue,userEnteredFormat.backgroundColor",
        },
      },
    ]);
  });

  it("leaves values alone when only a background colour is written", () => {
    const { batchUpdateCalls } = stubSelectionSheet();

    const raw = fetchedSelectionSheet();
    raw.sheet(111).removeRowsExcept(4);
    raw
      .sheet(111)
      .column(1)
      .updateActiveCells({ backgroundColor: LIGHT_GREEN });
    raw.batchUpdateGSheets();

    expect(batchUpdateCalls[0]?.requests?.[0]?.repeatCell?.cell).toEqual({
      userEnteredFormat: { backgroundColor: LIGHT_GREEN },
    });
    expect(raw.sheet(111).column(1).valueArrOrEmpty).toEqual(["old"]);
  });

  it("writes nothing when no row is active", () => {
    const { batchUpdateCalls } = stubSelectionSheet();

    const raw = fetchedSelectionSheet();
    raw.sheet(111).removeRowsExcept();
    raw.sheet(111).column(1).updateActiveCells({ value: "new" });
    raw.batchUpdateGSheets();

    expect(batchUpdateCalls).toEqual([]);
  });

  it("mirrors the write into row state, so a read before the flush sees it", () => {
    stubSelectionSheet();

    const raw = fetchedSelectionSheet();
    raw.sheet(111).removeRowsExcept(4, 8);
    raw.sheet(111).column(1).updateActiveCells({ value: "new" });

    expect(raw.sheet(111).column(1).valueArrOrEmpty).toEqual(["new", "new"]);
  });
});

describe("SheetRaw.removeRowsExcept", () => {
  function stubPrunableSheet() {
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
  function fetchedPrunableSheet() {
    const raw = SpreadsheetRaw.init();
    raw.sheetMeta(111).colIdRow.gatherFetchFull();
    raw.sheet(111).column(1).gatherFetchFull();
    raw.fetchAllGathered();
    return raw;
  }

  it("drops every data row that was not kept", () => {
    stubPrunableSheet();

    const raw = fetchedPrunableSheet();
    raw.sheet(111).removeRowsExcept(5);

    expect(raw.sheet(111).rowIndexesActive).toEqual([5]);
  });

  it("keeps the uniform rows, so a column still resolves by its id afterwards", () => {
    stubPrunableSheet();

    const raw = fetchedPrunableSheet();
    raw.sheet(111).removeRowsExcept(5);

    expect(raw.sheetMeta(111).columnByActiveId("c:lse:bbb").colIndex).toBe(1);
  });

  it("makes a whole-column fill throw, so it can't overwrite the excluded rows", () => {
    stubPrunableSheet();

    const raw = fetchedPrunableSheet();
    raw.sheet(111).removeRowsExcept(5);

    expect(() =>
      raw.sheet(111).column(1).updateAllCells({ value: "new" }),
    ).toThrowError(/pruned to a selection/);
  });
});

describe("CellRaw.updateBackgroundColor", () => {
  it("sends one updateCells request masking only the background colour, with no value", () => {
    const { batchUpdateCalls } = stubSheetsService({
      sheets: [{ sheetId: 111, title: "Leases", table: { endRowIndex: 11 } }],
    });

    const raw = SpreadsheetRaw.init();
    raw.fetchAllSheetProperties();
    raw.sheet(111).row(5).cell(2).updateBackgroundColor(LIGHT_GREEN);
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
              values: [{ userEnteredFormat: { backgroundColor: LIGHT_GREEN } }],
            },
          ],
          fields: "userEnteredFormat.backgroundColor",
        },
      },
    ]);
  });

  it("collapses a value and a colour on one cell into a single request masking both", () => {
    const { batchUpdateCalls } = stubSheetsService({
      sheets: [{ sheetId: 111, title: "Leases", table: { endRowIndex: 11 } }],
    });

    const raw = SpreadsheetRaw.init();
    raw.fetchAllSheetProperties();
    raw.sheet(111).row(5).cell(2).updateValue("2026-09-05 10:00:00");
    raw.sheet(111).row(5).cell(2).updateBackgroundColor(LIGHT_GREEN);
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
              values: [
                {
                  userEnteredValue: { stringValue: "2026-09-05 10:00:00" },
                  userEnteredFormat: { backgroundColor: LIGHT_GREEN },
                },
              ],
            },
          ],
          fields: "userEnteredValue,userEnteredFormat.backgroundColor",
        },
      },
    ]);
  });

  it("leaves a value queued for the cell intact when the colour is queued after it", () => {
    const { batchUpdateCalls } = stubSheetsService({
      sheets: [{ sheetId: 111, title: "Leases", table: { endRowIndex: 11 } }],
    });

    const raw = SpreadsheetRaw.init();
    raw.fetchAllSheetProperties();
    raw.sheet(111).row(5).cell(2).updateValue("kept");
    raw.sheet(111).row(5).cell(2).updateBackgroundColor(LIGHT_GREEN);
    raw.batchUpdateGSheets();

    const values =
      batchUpdateCalls[0]?.requests?.[0]?.updateCells?.rows?.[0]?.values;
    expect(values?.[0]?.userEnteredValue).toEqual({ stringValue: "kept" });
  });

  it("leaves the cell unreadable, since the read path never fetches colour", () => {
    stubSheetsService({
      sheets: [{ sheetId: 111, title: "Leases", table: { endRowIndex: 11 } }],
    });

    const raw = SpreadsheetRaw.init();
    raw.fetchAllSheetProperties();
    const cell = raw.sheet(111).row(5).cell(2);
    cell.updateBackgroundColor(LIGHT_GREEN);

    expect(cell.isActive).toBe(false);
    expect(() => cell.valueOrEmpty()).toThrowError(/does not have a value set/);
  });
});

// A mis-wired accessor still type-checks; the instance checks catch it.
describe("SpreadsheetRaw navigation", () => {
  it("gives each accessor the class its return type names", () => {
    const raw = SpreadsheetRaw.init();
    const sheet = raw.sheet(111);
    const sheetMeta = raw.sheetMeta(111);
    const column = sheet.column(0);
    const columnMeta = sheetMeta.column(0);

    assertType<IsExactly<typeof sheet, SheetRaw>>(true);
    assertType<IsExactly<typeof sheetMeta, SheetMetaRaw>>(true);
    assertType<IsExactly<typeof sheet.meta, SheetMetaRaw>>(true);
    assertType<IsExactly<typeof sheetMeta.primary, SheetRaw>>(true);
    assertType<IsExactly<typeof column, ColumnRaw>>(true);
    assertType<IsExactly<typeof columnMeta, ColumnMetaRaw>>(true);
    assertType<IsExactly<typeof column.sheet, SheetRaw>>(true);
    assertType<IsExactly<typeof columnMeta.sheet, SheetMetaRaw>>(true);
    assertType<IsExactly<typeof column.meta, ColumnMetaRaw>>(true);
    assertType<IsExactly<typeof columnMeta.primary, ColumnRaw>>(true);
    assertType<IsExactly<ReturnType<typeof sheet.row>, RowRaw>>(true);
    assertType<IsExactly<ReturnType<typeof sheet.rowCommon>, RowCommonRaw>>(
      true,
    );

    expect(sheet.meta).toBeInstanceOf(SheetMetaRaw);
    expect(sheetMeta.primary).toBeInstanceOf(SheetRaw);
    expect(column).toBeInstanceOf(ColumnRaw);
    expect(columnMeta).toBeInstanceOf(ColumnMetaRaw);
    expect(column.sheet).toBeInstanceOf(SheetRaw);
    expect(columnMeta.sheet).toBeInstanceOf(SheetMetaRaw);
    expect(column.meta).toBeInstanceOf(ColumnMetaRaw);
    expect(columnMeta.primary).toBeInstanceOf(ColumnRaw);
    expect(sheet.row(4)).toBeInstanceOf(RowRaw);
    expect(sheet.rowCommon(4)).toBeInstanceOf(RowRaw);
    expect(sheet.rowCommon(0)).toBeInstanceOf(UniformRowRaw);
  });
});

describe("Raw value types", () => {
  it("declares the blank the wire can hold, with nothing validating it away", () => {
    assertType<
      IsExactly<ReturnType<CellRaw<"boolean">["valueOrEmpty"]>, boolean | "">
    >(true);
    assertType<IsExactly<ReturnType<RowRaw["valueOrEmpty"]>, CellValue | "">>(
      true,
    );
    assertType<
      IsExactly<
        ReturnType<UniformRowRaw<"action">["valueOrEmpty"]>,
        boolean | ""
      >
    >(true);
  });
});

describe("SpreadsheetRaw.findReplace", () => {
  function stubFilledSheet() {
    return stubSheetsService({
      sheets: [
        {
          sheetId: 111,
          title: "Leases",
          rows: buildGridRows({
            0: ["c:lse:aaa", "c:lse:bbb"],
            4: ["r:lse:1", "Currency"],
            5: ["r:lse:2", "Caretaking"],
            6: ["r:lse:3", "Currency"],
          }),
          table: { endRowIndex: 7 },
        },
      ],
    });
  }
  function fetchedColumn() {
    const raw = SpreadsheetRaw.init();
    raw.sheet(111).column(1).gatherFetchFull();
    raw.fetchAllGathered();
    return raw;
  }

  it("scopes a column's replace to that column's data rows", () => {
    const { batchUpdateCalls } = stubFilledSheet();

    const raw = fetchedColumn();
    raw.sheet(111).column(1).findReplace({
      find: "Currency",
      replacement: "Payment",
      matchEntireCell: true,
    });
    raw.batchUpdateGSheets();

    expect(batchUpdateCalls[0]?.requests).toEqual([
      {
        findReplace: {
          find: "Currency",
          replacement: "Payment",
          matchEntireCell: true,
          range: {
            sheetId: 111,
            startRowIndex: 4,
            endRowIndex: 7,
            startColumnIndex: 1,
            endColumnIndex: 2,
          },
        },
      },
    ]);
  });

  it("scopes a sheet's replace by sheetId rather than by range", () => {
    const { batchUpdateCalls } = stubFilledSheet();

    const raw = SpreadsheetRaw.init();
    raw.fetchAllSheetProperties();
    raw.sheet(111).findReplace({ find: "Currency", replacement: "Payment" });
    raw.batchUpdateGSheets();

    expect(batchUpdateCalls[0]?.requests).toEqual([
      {
        findReplace: {
          find: "Currency",
          replacement: "Payment",
          sheetId: 111,
        },
      },
    ]);
  });

  it("carries an allSheets scope straight through", () => {
    const { batchUpdateCalls } = stubFilledSheet();

    const raw = SpreadsheetRaw.init();
    raw.findReplace({
      find: "Currency",
      replacement: "Payment",
      scope: { allSheets: true },
      includeFormulas: true,
    });
    raw.batchUpdateGSheets();

    expect(batchUpdateCalls[0]?.requests).toEqual([
      {
        findReplace: {
          find: "Currency",
          replacement: "Payment",
          includeFormulas: true,
          allSheets: true,
        },
      },
    ]);
  });

  it("sends after the per-cell writes, whose text it would otherwise miss", () => {
    const { batchUpdateCalls } = stubFilledSheet();

    const raw = fetchedColumn();
    raw.findReplace({
      find: "Currency",
      replacement: "Payment",
      scope: { allSheets: true },
    });
    raw.sheet(111).row(5).cell(1).updateValue("Currency");
    raw.sheet(111).row(6).delete();
    raw.batchUpdateGSheets();

    const requests = batchUpdateCalls[0]?.requests ?? [];
    expect(requests.map((request) => Object.keys(request)[0])).toEqual([
      "updateCells",
      "findReplace",
      "deleteDimension",
    ]);
  });

  it("leaves fetched values readable until the flush actually sends", () => {
    stubFilledSheet();

    const raw = fetchedColumn();
    raw
      .sheet(111)
      .column(1)
      .findReplace({ find: "Currency", replacement: "Payment" });

    expect(raw.sheet(111).column(1).valueArrOrEmpty).toEqual([
      "Currency",
      "Caretaking",
      "Currency",
    ]);
  });

  it("makes a read after the flush throw rather than return a pre-replace value", () => {
    stubFilledSheet();

    const raw = fetchedColumn();
    raw
      .sheet(111)
      .column(1)
      .findReplace({ find: "Currency", replacement: "Payment" });
    raw.batchUpdateGSheets();

    expect(() => raw.sheet(111).row(4).cell(1).valueOrEmpty()).toThrowError(
      /went stale when a findReplace was sent/,
    );
  });

  it("leaves fetched values alone when no findReplace was queued", () => {
    stubFilledSheet();

    const raw = fetchedColumn();
    raw.sheet(111).row(4).cell(1).updateValue("Payment");
    raw.batchUpdateGSheets();

    expect(raw.sheet(111).column(1).valueArrOrEmpty).toEqual([
      "Payment",
      "Caretaking",
      "Currency",
    ]);
  });

  it("makes the values readable again after a re-fetch", () => {
    stubFilledSheet();

    const raw = fetchedColumn();
    raw
      .sheet(111)
      .column(1)
      .findReplace({ find: "Currency", replacement: "Payment" });
    raw.batchUpdateGSheets();
    raw.sheet(111).column(1).gatherFetchFull();
    raw.fetchAllGathered();

    expect(raw.sheet(111).column(1).valueArrOrEmpty).toEqual([
      "Currency",
      "Caretaking",
      "Currency",
    ]);
  });

  it("discards a queued replace alongside every other change", () => {
    const { batchUpdateCalls } = stubFilledSheet();

    const raw = SpreadsheetRaw.init();
    raw.findReplace({
      find: "Currency",
      replacement: "Payment",
      scope: { allSheets: true },
    });
    raw.discardQueuedChanges();
    raw.batchUpdateGSheets();

    expect(batchUpdateCalls).toEqual([]);
  });
});
