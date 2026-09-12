import { beforeEach, describe, expect, it } from "vitest";
import { columnConfigs } from "../01_generatedConfigs/columnConfigs";
import { sheetConfigs } from "../01_generatedConfigs/sheetConfigs";
import type { Value, VnToCvn } from "../01_generatedConfigs/valueSchemas";
import { stubPropertiesService } from "../testSupport/fakeAppsScriptGlobals";
import {
  blankSheetConfigRow,
  filledSheetConfigRow,
  SHEET_CONFIG_GID,
  stubSheetConfigSheet,
} from "../testSupport/fakeSheetConfigSheet";
import {
  buildGridRows,
  stubSheetsService,
  type FakeCell,
} from "../testSupport/fakeSheetsService";
import { assertType, type IsExactly } from "../testSupport/typeAssertions";
import { ColumnIndexed } from "./ColumnIndexed";
import { ColumnMetaIndexed } from "./ColumnMetaIndexed";
import { RowIndexed } from "./RowIndexed";
import { SheetIndexed } from "./SheetIndexed";
import { SheetMetaIndexed } from "./SheetMetaIndexed";
import { SpreadsheetIndexed } from "./SpreadsheetIndexed";
import { SpreadsheetIndexedBase } from "./SpreadsheetIndexedBase";

const OCCUPANCY_GID = sheetConfigs.occupancy.sheetGid;
const ID_COLUMN_ID = columnConfigs.occupancy.id.columnId;

// A mis-wired accessor still type-checks; the instance checks catch it.
describe("SpreadsheetIndexed navigation", () => {
  it("gives each accessor the class its return type names", () => {
    const ssi = new SpreadsheetIndexed(
      SpreadsheetIndexedBase.initSpreadsheetIndexedProps(),
    );
    const sheet = ssi.sheet(OCCUPANCY_GID);
    const sheetMeta = ssi.sheetMeta(OCCUPANCY_GID);
    const column = sheet.column(ID_COLUMN_ID);
    const columnMeta = sheetMeta.column(ID_COLUMN_ID);

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

const SELECT_COLUMN_ID = columnConfigs.occupancy.updateTermsSelect.columnId;
const FILLED_ROW_INDEX = 4;
const BLANK_ROW_INDEX = 5;

// Row 5 is the blank row; its checkbox is untouched, so it reads blank not false.
function stubOccupancyWithBlankRow() {
  return stubSheetsService({
    sheets: [
      {
        sheetId: OCCUPANCY_GID,
        title: "Occupancy",
        rows: buildGridRows({
          0: [ID_COLUMN_ID, SELECT_COLUMN_ID],
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
    SpreadsheetIndexedBase.initSpreadsheetIndexedProps(),
  );
  const sheet = ssi.sheet(OCCUPANCY_GID);
  sheet.column(ID_COLUMN_ID).prepFetchFull();
  sheet.column(SELECT_COLUMN_ID).prepFetchFull();
  ssi.fetchAllPrepped();
  return sheet;
}

describe("Indexed value accessors", () => {
  beforeEach(() => {
    stubPropertiesService({ realEstateSpreadsheetId: "test-spreadsheet-id" });
    stubOccupancyWithBlankRow();
  });

  it("throws from CellIndexed.valueNotEmpty on a blank cell, naming the column id and the row", () => {
    const cell = fetchedOccupancySheet()
      .column(ID_COLUMN_ID)
      .cell(BLANK_ROW_INDEX);

    expect(() => cell.valueNotEmpty()).toThrowError(
      new RegExp(`${ID_COLUMN_ID}.*${BLANK_ROW_INDEX}`),
    );
  });

  it("returns the empty string from CellIndexed.valueOrEmpty on that same cell", () => {
    const cell = fetchedOccupancySheet()
      .column(ID_COLUMN_ID)
      .cell(BLANK_ROW_INDEX);

    expect(cell.valueOrEmpty()).toBe("");
  });

  it("reads a specifically fetched cell that Sheets omitted as empty, not unfetched", () => {
    stubSheetsService({
      sheets: [
        {
          sheetId: OCCUPANCY_GID,
          title: "Occupancy",
          rows: buildGridRows({
            0: [ID_COLUMN_ID, SELECT_COLUMN_ID],
            3: ["ID", "Update terms, select"],
            4: ["r:occ:row4", true],
            5: [null, null],
          }),
          rowsWithNoGridData: [BLANK_ROW_INDEX],
          table: { endRowIndex: 6 },
        },
      ],
    });
    const ssi = new SpreadsheetIndexed(
      SpreadsheetIndexedBase.initSpreadsheetIndexedProps(),
    );
    const sheet = ssi.sheet(OCCUPANCY_GID);
    sheet.column(ID_COLUMN_ID).prepFetchSpecific([BLANK_ROW_INDEX]);
    ssi.fetchAllPrepped();

    expect(sheet.column(ID_COLUMN_ID).cell(BLANK_ROW_INDEX).valueOrEmpty()).toBe(
      "",
    );
  });

  it("reads a filled cell identically through both forms", () => {
    const cell = fetchedOccupancySheet()
      .column(ID_COLUMN_ID)
      .cell(FILLED_ROW_INDEX);

    expect(cell.valueNotEmpty()).toBe("r:occ:row4");
    expect(cell.valueOrEmpty()).toBe("r:occ:row4");
  });

  it("reads an untouched checkbox as unchecked through every accessor", () => {
    const sheet = fetchedOccupancySheet();
    const column = new ColumnIndexed<"checkbox">({
      ...sheet.sheetIndexedProps,
      columnId: SELECT_COLUMN_ID,
    });

    expect(column.valueOrEmpty(BLANK_ROW_INDEX)).toBe(false);
    expect(column.valueNotEmpty(BLANK_ROW_INDEX)).toBe(false);
    expect(column.valueNotEmpty(FILLED_ROW_INDEX)).toBe(true);
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
    const column = fetchedOccupancySheet().column(ID_COLUMN_ID);

    expect(() => column.valueNotEmpty(BLANK_ROW_INDEX)).toThrowError(
      /is empty/,
    );
    expect(column.valueOrEmpty(BLANK_ROW_INDEX)).toBe("");
  });

  it("throws from RowIndexed.valueNotEmpty and returns empty from RowIndexed.valueOrEmpty", () => {
    const row = fetchedOccupancySheet().row(BLANK_ROW_INDEX);

    expect(() => row.valueNotEmpty(ID_COLUMN_ID)).toThrowError(/is empty/);
    expect(row.valueOrEmpty(ID_COLUMN_ID)).toBe("");
  });

  it("throws from valueArrNotEmpty when a fetched cell is blank, but not from the blank-tolerant forms", () => {
    const column = fetchedOccupancySheet().column(ID_COLUMN_ID);

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
    SpreadsheetIndexedBase.initSpreadsheetIndexedProps(),
  );
  const sheet = ssi.sheet(SHEET_CONFIG_GID);
  sheet.topRow.prepFetchFull();
  ssi.fetchAllPrepped();
  return sheet;
}

function unfetchedSheetConfig(): SheetIndexed {
  const ssi = new SpreadsheetIndexed(
    SpreadsheetIndexedBase.initSpreadsheetIndexedProps(),
  );
  ssi.sheetMeta(SHEET_CONFIG_GID).ensureColumnIdsAreFetched();
  return ssi.sheet(SHEET_CONFIG_GID);
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
      SpreadsheetIndexedBase.initSpreadsheetIndexedProps(),
    );
    const sheet = ssi.sheet(SHEET_CONFIG_GID);
    sheet.topRow.prepFetchFull();
    ssi.fetchAllPrepped();
    sheet.topRow.clearValues();
    ssi.raw.batchUpdateGSheets();

    expect(writtenValuesByColIndex(batchUpdateCalls)).toEqual([
      [0, ""],
      [1, ""],
      [2, ""],
      [3, ""],
      [4, ""],
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
});

function writtenValuesByColIndex(
  calls: GoogleAppsScript.Sheets.Schema.BatchUpdateSpreadsheetRequest[],
): [number | undefined, unknown][] {
  return calls
    .flatMap((call) => call.requests ?? [])
    .filter((request) => request.updateCells)
    .map((request) => [
      request.updateCells?.range?.startColumnIndex,
      request.updateCells?.rows?.[0]?.values?.[0]?.userEnteredValue
        ?.stringValue,
    ]);
}
