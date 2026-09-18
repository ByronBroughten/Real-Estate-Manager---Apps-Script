import { beforeEach, describe, expect, it } from "vitest";
import { columnConfigs } from "../01_SpreadsheetSchema/generated/columnConfigs";
import { sheetConfigs } from "../01_SpreadsheetSchema/generated/sheetConfigs";
import type { Value, VnToCvn } from "../01_SpreadsheetSchema/valueSchemas";
import { stubPropertiesService } from "../testSupport/fakeAppsScriptGlobals";
import {
  blankSheetConfigRow,
  filledSheetConfigRow,
  sheetConfigGid,
  sheetConfigColumnIdRow,
  stubSheetConfigSheet,
} from "../testSupport/fakeSheetConfigSheet";
import {
  buildGridRows,
  stubSheetsService,
} from "../testSupport/fakeSheetsService";
import { assertType, type IsExactly } from "../testSupport/typeAssertions";
import { SpreadsheetBaseIndexed } from "./ClassBases/SpreadsheetBaseIndexed";
import type { FetchTargetIndexed } from "./ClassTypes/StateIndexed";
import { ColumnIndexed } from "./ColumnIndexed";
import { ColumnMetaIndexed } from "./ColumnMetaIndexed";
import { RowIndexed } from "./RowIndexed";
import { SheetIndexed } from "./SheetIndexed";
import { SheetMetaIndexed } from "./SheetMetaIndexed";
import { SpreadsheetIndexed } from "./SpreadsheetIndexed";

const occupancyGid = sheetConfigs.occupancy.sheetGid;
const idColumnId = columnConfigs.occupancy.id.columnId;

// A mis-wired accessor still type-checks; the instance checks catch it.
describe("SpreadsheetIndexed navigation", () => {
  it("gives each accessor the class its return type names", () => {
    stubSheetsService();
    const ssi = new SpreadsheetIndexed(
      SpreadsheetBaseIndexed.initSpreadsheetIndexedProps(),
    );
    const sheet = ssi.sheet(occupancyGid);
    const sheetMeta = ssi.sheetMeta(occupancyGid);
    const column = sheet.column(idColumnId);
    const columnMeta = sheetMeta.column(idColumnId);

    assertType<IsExactly<typeof sheet, SheetIndexed>>(true);
    assertType<IsExactly<typeof sheetMeta, SheetMetaIndexed>>(true);
    assertType<IsExactly<typeof sheet.meta, SheetMetaIndexed>>(true);
    assertType<IsExactly<typeof sheetMeta.primary, SheetIndexed>>(true);
    assertType<IsExactly<typeof column, ColumnIndexed>>(true);
    assertType<IsExactly<typeof columnMeta, ColumnMetaIndexed>>(true);
    assertType<IsExactly<typeof column.sheet, SheetIndexed>>(true);
    assertType<IsExactly<typeof columnMeta.sheet, SheetMetaIndexed>>(true);
    assertType<IsExactly<typeof column.meta, ColumnMetaIndexed>>(true);
    assertType<IsExactly<typeof columnMeta.primary, ColumnIndexed>>(true);
    assertType<IsExactly<ReturnType<typeof sheet.row>, RowIndexed>>(true);

    expect(sheet.meta).toBeInstanceOf(SheetMetaIndexed);
    expect(sheetMeta.primary).toBeInstanceOf(SheetIndexed);
    expect(column).toBeInstanceOf(ColumnIndexed);
    expect(columnMeta).toBeInstanceOf(ColumnMetaIndexed);
    expect(column.sheet).toBeInstanceOf(SheetIndexed);
    expect(columnMeta.sheet).toBeInstanceOf(SheetMetaIndexed);
    expect(column.meta).toBeInstanceOf(ColumnMetaIndexed);
    expect(columnMeta.primary).toBeInstanceOf(ColumnIndexed);
    expect(sheet.row(sheet.schema.topDataRowIdx)).toBeInstanceOf(RowIndexed);
  });
});

const selectColumnId = columnConfigs.occupancy.updateTermsSelect.columnId;
const filledRowIndex = 4;
const blankRowIndex = 5;

// Row 5 is the blank row; its checkbox is untouched, so it reads blank not false.
function stubOccupancyWithBlankRow() {
  return stubSheetsService({
    sheets: [
      {
        sheetId: occupancyGid,
        title: "Occupancy",
        rows: buildGridRows({
          0: [idColumnId, selectColumnId],
          3: ["ID", "Update terms, select"],
          4: ["r:occ:row4", true],
          5: [null, null],
        }),
        table: { endRowIndex: 6 },
      },
    ],
  });
}

function fetchedOccupancySheet(): SheetIndexed {
  const ssi = new SpreadsheetIndexed(
    SpreadsheetBaseIndexed.initSpreadsheetIndexedProps(),
  );
  const sheet = ssi.sheet(occupancyGid);
  sheet.column(idColumnId).prepFetchFull();
  sheet.column(selectColumnId).prepFetchFull();
  ssi.fetchAllPrepped();
  return sheet;
}

describe("Indexed value accessors", () => {
  beforeEach(() => {
    stubPropertiesService({ realEstateSpreadsheetId: "test-spreadsheet-id" });
    stubOccupancyWithBlankRow();
  });

  it("throws from CellIndexed.valueNotEmpty on a blank cell, naming the column id and the row", () => {
    const cell = fetchedOccupancySheet().column(idColumnId).cell(blankRowIndex);

    expect(() => cell.valueNotEmpty()).toThrowError(
      new RegExp(`${idColumnId}.*${blankRowIndex}`),
    );
  });

  it("returns the empty string from CellIndexed.valueOrEmpty on that same cell", () => {
    const cell = fetchedOccupancySheet().column(idColumnId).cell(blankRowIndex);

    expect(cell.valueOrEmpty()).toBe("");
  });

  it("reads a specifically fetched cell that Sheets omitted as empty, not unfetched", () => {
    stubSheetsService({
      sheets: [
        {
          sheetId: occupancyGid,
          title: "Occupancy",
          rows: buildGridRows({
            0: [idColumnId, selectColumnId],
            3: ["ID", "Update terms, select"],
            4: ["r:occ:row4", true],
            5: [null, null],
          }),
          rowsWithNoGridData: [blankRowIndex],
          table: { endRowIndex: 6 },
        },
      ],
    });
    const ssi = new SpreadsheetIndexed(
      SpreadsheetBaseIndexed.initSpreadsheetIndexedProps(),
    );
    const sheet = ssi.sheet(occupancyGid);
    sheet.column(idColumnId).prepFetchSpecific([blankRowIndex]);
    ssi.fetchAllPrepped();

    expect(sheet.column(idColumnId).cell(blankRowIndex).valueOrEmpty()).toBe(
      "",
    );
  });

  it("reads a filled cell identically through both forms", () => {
    const cell = fetchedOccupancySheet()
      .column(idColumnId)
      .cell(filledRowIndex);

    expect(cell.valueNotEmpty()).toBe("r:occ:row4");
    expect(cell.valueOrEmpty()).toBe("r:occ:row4");
  });

  it("reads an untouched checkbox as unchecked through every accessor", () => {
    const sheet = fetchedOccupancySheet();
    const column = new ColumnIndexed<"checkbox">({
      ...sheet.sheetIndexedProps,
      columnId: selectColumnId,
    });

    expect(column.valueOrEmpty(blankRowIndex)).toBe(false);
    expect(column.valueNotEmpty(blankRowIndex)).toBe(false);
    expect(column.valueNotEmpty(filledRowIndex)).toBe(true);
    expect(column.valueArrOrEmpty).toEqual([true, false]);
    expect(column.valueArrNotEmpty).toEqual([true, false]);
    assertType<IsExactly<ReturnType<typeof column.valueNotEmpty>, boolean>>(
      true,
    );
    assertType<IsExactly<ReturnType<typeof column.valueOrEmpty>, boolean>>(
      true,
    );
  });

  it("throws from ColumnIndexed.valueNotEmpty and returns empty from valueOrEmpty", () => {
    const column = fetchedOccupancySheet().column(idColumnId);

    expect(() => column.valueNotEmpty(blankRowIndex)).toThrowError(/is empty/);
    expect(column.valueOrEmpty(blankRowIndex)).toBe("");
  });

  it("throws from RowIndexed.valueNotEmpty and returns empty from RowIndexed.valueOrEmpty", () => {
    const row = fetchedOccupancySheet().row(blankRowIndex);

    expect(() => row.valueNotEmpty(idColumnId)).toThrowError(/is empty/);
    expect(row.valueOrEmpty(idColumnId)).toBe("");
  });

  it("throws from valueArrNotEmpty when a fetched cell is blank, but not from the blank-tolerant forms", () => {
    const column = fetchedOccupancySheet().column(idColumnId);

    expect(() => column.valueArrNotEmpty).toThrowError(/is empty/);
    expect(column.valueArrOrEmpty).toEqual(["r:occ:row4", ""]);
    expect(column.valueArrFilterEmpty).toEqual(["r:occ:row4"]);
  });

  it("gives the checkbox value name a type with no blank in it", () => {
    assertType<IsExactly<Value<"checkbox">, boolean>>(true);
    assertType<IsExactly<Value<"boolean">, boolean | "">>(true);
  });

  // What toWireValue asserts rather than proves, proved here.
  it("sends the checkbox value name down to the boolean wire type", () => {
    assertType<IsExactly<VnToCvn<"checkbox">, "boolean">>(true);
    assertType<IsExactly<VnToCvn<"boolean">, "boolean">>(true);
    assertType<IsExactly<VnToCvn<"id">, "string">>(true);
    assertType<IsExactly<VnToCvn<"yesOrNo">, "string">>(true);
  });
});

// Google omits a row nothing was ever written to, which is what "never read" looks like.
function stubSheetConfigWithUnreadTopRow() {
  return stubSheetConfigSheet({ 4: blankSheetConfigRow }, [4]);
}

function fetchedSheetConfig(): SheetIndexed {
  const ssi = new SpreadsheetIndexed(
    SpreadsheetBaseIndexed.initSpreadsheetIndexedProps(),
  );
  const sheet = ssi.sheet(sheetConfigGid);
  sheet.topRow.prepFetchFull();
  ssi.fetchAllPrepped();
  return sheet;
}

function unfetchedSheetConfig(): SheetIndexed {
  const ssi = new SpreadsheetIndexed(
    SpreadsheetBaseIndexed.initSpreadsheetIndexedProps(),
  );
  ssi.sheetMeta(sheetConfigGid).ensureColumnIdsAreFetched();
  return ssi.sheet(sheetConfigGid);
}

describe("RowIndexed.isBlank / isReusable", () => {
  beforeEach(() => {
    stubPropertiesService({ realEstateSpreadsheetId: "test-spreadsheet-id" });
  });

  it("calls a row whose every non-formula cell is empty blank", () => {
    stubSheetConfigSheet({ 4: blankSheetConfigRow });

    expect(fetchedSheetConfig().topRow.isBlank).toBe(true);
  });

  it("calls a row holding any non-formula value not blank", () => {
    stubSheetConfigSheet({ 4: filledSheetConfigRow });

    expect(fetchedSheetConfig().topRow.isBlank).toBe(false);
  });

  it("calls a row nothing fetched not blank, since nothing read it", () => {
    stubSheetConfigWithUnreadTopRow();

    expect(unfetchedSheetConfig().topRow.isBlank).toBe(false);
  });

  it("makes a blank row reusable until an append reserves it", () => {
    stubSheetConfigSheet({ 4: blankSheetConfigRow });

    const sheet = fetchedSheetConfig();
    expect(sheet.topRow.isReusable).toBe(true);

    sheet.appendRowDefault();
    expect(sheet.topRow.isReusable).toBe(false);
  });
});

describe("SheetIndexed.hasNoData", () => {
  beforeEach(() => {
    stubPropertiesService({ realEstateSpreadsheetId: "test-spreadsheet-id" });
  });

  it("is true for a sheet whose one row is blank", () => {
    stubSheetConfigSheet({ 4: blankSheetConfigRow });

    expect(fetchedSheetConfig().hasNoData).toBe(true);
  });

  it("is false while any row still holds data", () => {
    stubSheetConfigSheet({ 4: blankSheetConfigRow, 5: filledSheetConfigRow });

    expect(fetchedSheetConfig().hasNoData).toBe(false);
  });
});

describe("RowIndexed.clearValues", () => {
  beforeEach(() => {
    stubPropertiesService({ realEstateSpreadsheetId: "test-spreadsheet-id" });
  });

  it("empties every non-formula cell and touches no formula cell", () => {
    const { batchUpdateCalls } = stubSheetConfigSheet({
      4: filledSheetConfigRow,
    });

    const ssi = new SpreadsheetIndexed(
      SpreadsheetBaseIndexed.initSpreadsheetIndexedProps(),
    );
    const sheet = ssi.sheet(sheetConfigGid);
    sheet.topRow.prepFetchFull();
    ssi.fetchAllPrepped();
    sheet.topRow.clearValues();
    ssi.raw.batchUpdateGSheets();

    expect(writtenValuesByColIndex(batchUpdateCalls)).toEqual([
      [0, ""],
      [1, ""],
      [2, ""],
      [3, ""],
    ]);
    expect(sheet.topRow.isBlank).toBe(true);
  });

  // The cell is cleared to a blank on the wire; the value name is what reads it back.
  it("leaves a cleared checkbox reading unchecked rather than blank", () => {
    stubSheetConfigSheet({ 4: filledSheetConfigRow });

    const sheet = fetchedSheetConfig();
    sheet.topRow.clearValues();

    expect(
      sheet.topRow.valueOrEmpty(
        columnConfigs.sheetConfig.letApiAccess.columnId,
      ),
    ).toBe(false);
    expect(sheet.topRow.isBlank).toBe(true);
  });

  // The default and the blank must agree, or an append and a read back disagree.
  it("defaults a checkbox cell to the same unchecked a blank reads as", () => {
    stubSheetConfigSheet({ 4: filledSheetConfigRow });

    const columnId = columnConfigs.sheetConfig.letApiAccess.columnId;
    const cell = fetchedSheetConfig().topRow.cell(columnId);
    cell.updateToDefault();

    expect(cell.valueOrEmpty()).toBe(false);
  });
});

describe("SheetIndexed.appendRowDefault", () => {
  beforeEach(() => {
    stubPropertiesService({ realEstateSpreadsheetId: "test-spreadsheet-id" });
  });

  it("throws when the sheet's one data row was never fetched, naming the prefetch owed", () => {
    stubSheetConfigWithUnreadTopRow();

    expect(() => unfetchedSheetConfig().appendRowDefault()).toThrowError(
      /never fetched.*Prefetch that row first/,
    );
  });

  it("skips a configured column missing from the column-ID row and writes the rest", () => {
    const omittedColumnId = columnConfigs.sheetConfig.letApiAccess.columnId;
    const columnIdRow = sheetConfigColumnIdRow.filter(
      (columnId) => columnId !== omittedColumnId,
    );
    const { batchUpdateCalls } = stubSheetsService({
      sheets: [
        {
          sheetId: sheetConfigGid,
          title: "Sheet Config",
          rows: buildGridRows({
            0: columnIdRow,
            4: [null, null, null, true],
          }),
          table: { endRowIndex: 5 },
        },
      ],
    });

    const ssi = new SpreadsheetIndexed(
      SpreadsheetBaseIndexed.initSpreadsheetIndexedProps(),
    );
    const sheet = ssi.sheet(sheetConfigGid);
    sheet.topRow.prepFetchFull();
    ssi.fetchAllPrepped();
    sheet.appendRowDefault();
    ssi.raw.batchUpdateGSheets();

    expect(writtenValuesByColIndex(batchUpdateCalls)).toEqual([
      [0, ""],
      [1, ""],
      [2, ""],
    ]);
  });
});

const testGid = sheetConfigs.test.sheetGid;
const testNumberColumnId = columnConfigs.test.num.columnId;
const testFormulaColumnId = columnConfigs.test.formulaTest.columnId;

describe("Indexed formula writes", () => {
  beforeEach(() => {
    stubPropertiesService({ realEstateSpreadsheetId: "test-spreadsheet-id" });
    stubSheetsService({
      sheets: [
        {
          sheetId: testGid,
          title: "Test",
          rows: buildGridRows({
            0: Object.values(columnConfigs.test).map(
              (column) => column.columnId,
            ),
          }),
          table: { endRowIndex: 6 },
        },
      ],
    });
  });

  it("refuses a formula write on a non-formula column", () => {
    const ssi = new SpreadsheetIndexed(
      SpreadsheetBaseIndexed.initSpreadsheetIndexedProps(),
    );
    ssi.raw.fetchAllSheetProperties();

    expect(() =>
      ssi.sheet(testGid).column(testNumberColumnId).updateAllFormulas("=1"),
    ).toThrowError(/not a formula column/);
  });

  it("queues a formula write on Formula test", () => {
    const ssi = new SpreadsheetIndexed(
      SpreadsheetBaseIndexed.initSpreadsheetIndexedProps(),
    );
    ssi.raw.fetchAllSheetProperties();

    expect(() =>
      ssi
        .sheet(testGid)
        .column(testFormulaColumnId)
        .updateAllFormulas("=2+SINGLE(test[Number])"),
    ).not.toThrow();
  });
});

describe("SpreadsheetIndexed.fetchAllPrepped / FetchTargetIndexed", () => {
  beforeEach(() => {
    stubPropertiesService({ realEstateSpreadsheetId: "test-spreadsheet-id" });
  });

  function recordedGridRanges(calls: object[]): unknown[] {
    const resource = calls[0] as {
      dataFilters: { gridRange: unknown }[];
    };
    return resource.dataFilters.map((filter) => filter.gridRange);
  }

  function occupancyWithTwoColumns() {
    return stubSheetsService({
      sheets: [
        {
          sheetId: occupancyGid,
          title: "Occupancy",
          rows: buildGridRows({
            0: [idColumnId, selectColumnId],
            3: ["ID", "Update terms, select"],
            4: ["r:occ:row4", true],
            5: [null, null],
          }),
          table: { endRowIndex: 6 },
        },
      ],
    });
  }

  function lastFetchedRanges(getByDataFilterCalls: object[]): unknown[] {
    const lastCall = getByDataFilterCalls[getByDataFilterCalls.length - 1];
    if (lastCall === undefined) return [];
    return recordedGridRanges([lastCall]);
  }

  it("narrows FetchTargetIndexed by kind", () => {
    type FullRow = Extract<FetchTargetIndexed, { kind: "fullRow" }>;
    type FullColumn = Extract<FetchTargetIndexed, { kind: "fullDataColumn" }>;
    type SingleCell = Extract<FetchTargetIndexed, { kind: "singleCell" }>;

    assertType<IsExactly<FullRow, { kind: "fullRow"; row: number }>>(true);
    assertType<
      IsExactly<FullColumn, { kind: "fullDataColumn"; column: string }>
    >(true);
    assertType<
      IsExactly<SingleCell, { kind: "singleCell"; row: number; column: string }>
    >(true);
  });

  it("resolves a full-row target to that row's table columns", () => {
    const { getByDataFilterCalls } = occupancyWithTwoColumns();
    const ssi = new SpreadsheetIndexed(
      SpreadsheetBaseIndexed.initSpreadsheetIndexedProps(),
    );
    ssi.sheet(occupancyGid).topRow.prepFetchFull();
    ssi.fetchAllPrepped();

    expect(lastFetchedRanges(getByDataFilterCalls)).toEqual(
      expect.arrayContaining([
        {
          sheetId: occupancyGid,
          startRowIndex: filledRowIndex,
          endRowIndex: filledRowIndex + 1,
          startColumnIndex: 0,
        },
      ]),
    );
  });

  it("resolves a full-data-column target to that column's data rows", () => {
    const { getByDataFilterCalls } = occupancyWithTwoColumns();
    const ssi = new SpreadsheetIndexed(
      SpreadsheetBaseIndexed.initSpreadsheetIndexedProps(),
    );
    ssi.sheet(occupancyGid).column(idColumnId).prepFetchFull();
    ssi.fetchAllPrepped();

    expect(lastFetchedRanges(getByDataFilterCalls)).toEqual(
      expect.arrayContaining([
        {
          sheetId: occupancyGid,
          startRowIndex: filledRowIndex,
          startColumnIndex: 0,
          endColumnIndex: 1,
        },
      ]),
    );
  });

  it("resolves a single-cell target to that cell's grid range", () => {
    const { getByDataFilterCalls } = occupancyWithTwoColumns();
    const ssi = new SpreadsheetIndexed(
      SpreadsheetBaseIndexed.initSpreadsheetIndexedProps(),
    );
    ssi.sheet(occupancyGid).column(idColumnId).cell(filledRowIndex).prepFetch();
    ssi.fetchAllPrepped();

    expect(lastFetchedRanges(getByDataFilterCalls)).toEqual(
      expect.arrayContaining([
        {
          sheetId: occupancyGid,
          startRowIndex: filledRowIndex,
          endRowIndex: filledRowIndex + 1,
          startColumnIndex: 0,
          endColumnIndex: 1,
        },
      ]),
    );
  });
});

function writtenValuesByColIndex(
  calls: GoogleAppsScript.Sheets.Schema.BatchUpdateSpreadsheetRequest[],
): [number | undefined, unknown][] {
  return calls
    .flatMap((call) => call.requests ?? [])
    .filter((request) => request.updateCells)
    .map((request) => {
      const userEnteredValue =
        request.updateCells?.rows?.[0]?.values?.[0]?.userEnteredValue;
      return [
        request.updateCells?.range?.startColumnIndex,
        userEnteredValue?.stringValue ??
          userEnteredValue?.boolValue ??
          userEnteredValue?.numberValue,
      ];
    });
}
