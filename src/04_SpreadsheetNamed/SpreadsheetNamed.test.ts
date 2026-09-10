import { beforeEach, describe, expect, it } from "vitest";
import { columnConfigs } from "../01_generatedConfigs/columnConfigs";
import { sheetConfigs } from "../01_generatedConfigs/sheetConfigs";
import { ssConfigGet } from "../01_generatedConfigs/spreadsheetConfigTypes";
import { stubPropertiesService } from "../testSupport/fakeAppsScriptGlobals";
import {
  blankSheetConfigRow,
  filledSheetConfigRow,
  stubSheetConfigSheet,
} from "../testSupport/fakeSheetConfigSheet";
import {
  buildGridRows,
  stubSheetsService,
  type FakeCell,
} from "../testSupport/fakeSheetsService";
import { assertType, type IsExactly } from "../testSupport/typeAssertions";
import { ColumnMetaNamed } from "./ColumnMetaNamed";
import { ColumnNamed } from "./ColumnNamed";
import { RowNamed } from "./RowNamed";
import { SheetMetaNamed } from "./SheetMetaNamed";
import { SheetNamed } from "./SheetNamed";
import { SpreadsheetNamed } from "./SpreadsheetNamed";

// A mis-wired accessor still type-checks; the instance checks catch it.
describe("SpreadsheetNamed navigation", () => {
  it("gives each accessor the class its return type names", () => {
    const ss = SpreadsheetNamed.init();
    const sheet = ss.sheet("occupancy");
    const sheetMeta = ss.sheetMeta("occupancy");
    const column = sheet.column("id");
    const columnMeta = sheetMeta.column("id");

    assertType<IsExactly<typeof sheet, SheetNamed<"occupancy">>>(true);
    assertType<IsExactly<typeof sheetMeta, SheetMetaNamed<"occupancy">>>(true);
    assertType<IsExactly<typeof sheet.meta, SheetMetaNamed<"occupancy">>>(true);
    assertType<IsExactly<typeof sheetMeta.primary, SheetNamed<"occupancy">>>(
      true,
    );
    assertType<IsExactly<typeof column, ColumnNamed<"occupancy", "id">>>(true);
    assertType<
      IsExactly<typeof columnMeta, ColumnMetaNamed<"occupancy", "id">>
    >(true);
    assertType<IsExactly<typeof column.sheet, SheetNamed<"occupancy">>>(true);
    assertType<IsExactly<typeof columnMeta.sheet, SheetMetaNamed<"occupancy">>>(
      true,
    );
    assertType<
      IsExactly<typeof column.meta, ColumnMetaNamed<"occupancy", "id">>
    >(true);
    assertType<
      IsExactly<typeof columnMeta.primary, ColumnNamed<"occupancy", "id">>
    >(true);
    assertType<IsExactly<ReturnType<typeof sheet.row>, RowNamed<"occupancy">>>(
      true,
    );

    expect(sheet.meta).toBeInstanceOf(SheetMetaNamed);
    expect(sheetMeta.primary).toBeInstanceOf(SheetNamed);
    expect(column).toBeInstanceOf(ColumnNamed);
    expect(columnMeta).toBeInstanceOf(ColumnMetaNamed);
    expect(column.sheet).toBeInstanceOf(SheetNamed);
    expect(columnMeta.sheet).toBeInstanceOf(SheetMetaNamed);
    expect(column.meta).toBeInstanceOf(ColumnMetaNamed);
    expect(columnMeta.primary).toBeInstanceOf(ColumnNamed);
    expect(sheet.row(sheet.schema.topDataRowIdx)).toBeInstanceOf(RowNamed);
  });
});

const TOP_DATA_ROW_INDEX = ssConfigGet("topDataRowIdxBase0");
const OCCUPANCY_GID = sheetConfigs.occupancy.sheetGid;
const ID_COLUMN_ID = columnConfigs.occupancy.id.columnId;
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

function fetchedOccupancySheet(): SheetNamed<"occupancy"> {
  const ss = SpreadsheetNamed.init();
  ss.sheet("occupancy").prepFetchColumnsFull("id", "updateTermsSelect");
  ss.fetchAllPrepped();
  return ss.sheet("occupancy");
}

describe("Named value accessors", () => {
  beforeEach(() => {
    stubPropertiesService({ realEstateSpreadsheetId: "test-spreadsheet-id" });
    stubOccupancyWithBlankRow();
  });

  it("names the sheet, the column and the row when CellNamed.value hits a blank cell", () => {
    const cell = fetchedOccupancySheet().column("id").cell(BLANK_ROW_INDEX);

    expect(() => cell.value()).toThrowError(
      new RegExp(`"id".*"occupancy".*${BLANK_ROW_INDEX}`),
    );
  });

  it("keeps the generated column id out of the Named message", () => {
    const cell = fetchedOccupancySheet().column("id").cell(BLANK_ROW_INDEX);

    expect(() => cell.value()).not.toThrowError(new RegExp(ID_COLUMN_ID));
  });

  it("returns the empty string from CellNamed.valueOrEmpty on that same cell", () => {
    const cell = fetchedOccupancySheet().column("id").cell(BLANK_ROW_INDEX);

    expect(cell.valueOrEmpty()).toBe("");
  });

  it("reads a filled cell identically through both forms", () => {
    const cell = fetchedOccupancySheet().column("id").cell(FILLED_ROW_INDEX);

    expect(cell.value()).toBe("r:occ:row4");
    expect(cell.valueOrEmpty()).toBe("r:occ:row4");
  });

  it("reads an untouched checkbox as empty rather than false", () => {
    const row = fetchedOccupancySheet().row(BLANK_ROW_INDEX);

    expect(row.valueOrEmpty("updateTermsSelect")).toBe("");
    expect(() => row.value("updateTermsSelect")).toThrowError(/is empty/);
  });

  it("throws from ColumnNamed.value and returns empty from valueOrEmpty", () => {
    const column = fetchedOccupancySheet().column("id");

    expect(() => column.value(BLANK_ROW_INDEX)).toThrowError(/is empty/);
    expect(column.valueOrEmpty(BLANK_ROW_INDEX)).toBe("");
  });

  it("throws from RowNamed.value and returns empty from RowNamed.valueOrEmpty", () => {
    const row = fetchedOccupancySheet().row(BLANK_ROW_INDEX);

    expect(() => row.value("id")).toThrowError(/is empty/);
    expect(row.valueOrEmpty("id")).toBe("");
  });

  it("keeps blanks in the bag returned by RowNamed.valuesOrEmpty", () => {
    const row = fetchedOccupancySheet().row(BLANK_ROW_INDEX);

    expect(row.valuesOrEmpty("id", "updateTermsSelect")).toEqual({
      id: "",
      updateTermsSelect: "",
    });
  });

  it("throws from valueArr when a fetched cell is blank, but not from the marked forms", () => {
    const column = fetchedOccupancySheet().column("id");

    expect(() => column.valueArr).toThrowError(/is empty/);
    expect(column.valueArrOrEmpty).toEqual(["r:occ:row4", ""]);
    expect(column.valueArrFilterEmpty).toEqual(["r:occ:row4"]);
  });

  it("lets rowsFiltered select the rows whose column is blank", () => {
    const sheet = fetchedOccupancySheet();

    expect(sheet.rowsFiltered({ id: "" }).map((row) => row.rowIndex)).toEqual([
      BLANK_ROW_INDEX,
    ]);
  });

  it("sorts rows by a column that some of them leave blank", () => {
    const sheet = fetchedOccupancySheet();

    const sorted = sheet.sortRowsbyColumnName(sheet.rows, "id");

    expect(sorted.map((row) => row.rowIndex)).toEqual([
      BLANK_ROW_INDEX,
      FILLED_ROW_INDEX,
    ]);
  });
});

function fetchedSheetConfig(): SpreadsheetNamed {
  const ss = SpreadsheetNamed.init();
  ss.sheet("sheetConfig").prepFetchColumnsFull(
    "sheetGid",
    "sheetTitle",
    "hasIdColumn",
    "letApiAccess",
    "idPrefix",
  );
  ss.fetchAllPrepped();
  return ss;
}

function deleteRequestIndexes(
  calls: GoogleAppsScript.Sheets.Schema.BatchUpdateSpreadsheetRequest[],
): (number | undefined)[] {
  return calls
    .flatMap((call) => call.requests ?? [])
    .filter((request) => request.deleteDimension)
    .map((request) => request.deleteDimension?.range?.startIndex);
}

function appendRequestCount(
  calls: GoogleAppsScript.Sheets.Schema.BatchUpdateSpreadsheetRequest[],
): number {
  return calls
    .flatMap((call) => call.requests ?? [])
    .filter((request) => request.appendCells).length;
}

describe("SheetNamed.rowByValue", () => {
  beforeEach(() => {
    stubPropertiesService({ realEstateSpreadsheetId: "test-spreadsheet-id" });
  });

  it("returns the one row whose column holds the value", () => {
    stubOccupancyWithBlankRow();

    const row = fetchedOccupancySheet().rowByValue("id", "r:occ:row4");

    expect(row.rowIndex).toBe(FILLED_ROW_INDEX);
  });

  it("throws naming the sheet, the column and the value when nothing matches", () => {
    stubOccupancyWithBlankRow();
    const sheet = fetchedOccupancySheet();

    expect(() => sheet.rowByValue("id", "r:occ:absent")).toThrowError(
      /occupancy.*id.*r:occ:absent.*0 did/,
    );
  });

  it("throws rather than picking one when two rows match", () => {
    stubOccupancyWithDuplicateIds();
    const sheet = fetchedOccupancySheet();

    expect(() => sheet.rowByValue("id", "r:occ:dup")).toThrowError(/but 2 did/);
  });

  // The blank row reads "" through valueOrEmpty, so it is a match like any other.
  it("counts the sheet's blank row as a match for an empty value", () => {
    stubOccupancyWithBlankRow();

    const row = fetchedOccupancySheet().rowByValue("id", "");

    expect(row.rowIndex).toBe(BLANK_ROW_INDEX);
  });
});

function stubOccupancyWithDuplicateIds() {
  return stubSheetsService({
    sheets: [
      {
        sheetId: OCCUPANCY_GID,
        title: "Occupancy",
        rows: buildGridRows({
          0: [ID_COLUMN_ID, SELECT_COLUMN_ID],
          3: ["ID", "Update terms, select"],
          4: ["r:occ:dup", true],
          5: ["r:occ:dup", true],
        }),
        table: { endRowIndex: 6 },
      },
    ],
  });
}

describe("SheetNamed.DELETE_ALL_DATA_ROWS", () => {
  beforeEach(() => {
    stubPropertiesService({ realEstateSpreadsheetId: "test-spreadsheet-id" });
  });

  it("deletes every data row but the top one, and leaves that one blank", () => {
    const { batchUpdateCalls } = stubSheetConfigSheet({
      4: filledSheetConfigRow,
      5: filledSheetConfigRow,
      6: filledSheetConfigRow,
    });

    const ss = fetchedSheetConfig();
    ss.sheet("sheetConfig").DELETE_ALL_DATA_ROWS();
    ss.batchUpdateGSheets();

    expect(deleteRequestIndexes(batchUpdateCalls)).toEqual([6, 5]);
    expect(ss.sheet("sheetConfig").topRow.isBlank).toBe(true);
  });

  it("writes nothing at all for a sheet already down to its blank row", () => {
    const { batchUpdateCalls } = stubSheetConfigSheet({
      4: blankSheetConfigRow,
    });

    const ss = fetchedSheetConfig();
    ss.sheet("sheetConfig").DELETE_ALL_DATA_ROWS();
    ss.batchUpdateGSheets();

    expect(batchUpdateCalls).toEqual([]);
  });
});

describe("SheetNamed.appendRowWithVals", () => {
  beforeEach(() => {
    stubPropertiesService({ realEstateSpreadsheetId: "test-spreadsheet-id" });
  });

  it("reuses the blank row of an emptied sheet rather than appending beneath it", () => {
    const { batchUpdateCalls } = stubSheetConfigSheet({
      4: blankSheetConfigRow,
    });

    const ss = fetchedSheetConfig();
    const row = ss.sheet("sheetConfig").appendRowWithVals({ idPrefix: "prp" });
    ss.batchUpdateGSheets();

    expect(row.rowIndex).toBe(TOP_DATA_ROW_INDEX);
    expect(appendRequestCount(batchUpdateCalls)).toBe(0);
    expect(row.value("idPrefix")).toBe("prp");
  });

  it("appends beneath a one-row sheet that still holds data", () => {
    const { batchUpdateCalls } = stubSheetConfigSheet({
      4: filledSheetConfigRow,
    });

    const ss = fetchedSheetConfig();
    const row = ss.sheet("sheetConfig").appendRowWithVals({ idPrefix: "unt" });
    ss.batchUpdateGSheets();

    expect(row.rowIndex).toBe(TOP_DATA_ROW_INDEX + 1);
    expect(appendRequestCount(batchUpdateCalls)).toBe(1);
  });

  it("reuses the blank row once and appends for the second row", () => {
    const { batchUpdateCalls } = stubSheetConfigSheet({
      4: blankSheetConfigRow,
    });

    const ss = fetchedSheetConfig();
    const sheet = ss.sheet("sheetConfig");
    const first = sheet.appendRowWithVals({ idPrefix: "one" });
    const second = sheet.appendRowWithVals({ idPrefix: "two" });
    ss.batchUpdateGSheets();

    expect([first.rowIndex, second.rowIndex]).toEqual([
      TOP_DATA_ROW_INDEX,
      TOP_DATA_ROW_INDEX + 1,
    ]);
    expect(appendRequestCount(batchUpdateCalls)).toBe(1);
  });

  // The wipe has to lift the reservation the first append took, or the second strands a row.
  it("hands the same row to a second append once a wipe has released it", () => {
    const { batchUpdateCalls } = stubSheetConfigSheet({
      4: blankSheetConfigRow,
    });

    const ss = fetchedSheetConfig();
    const sheet = ss.sheet("sheetConfig");
    sheet.appendRowWithVals({ idPrefix: "one" });
    sheet.DELETE_ALL_DATA_ROWS();
    const rebuilt = sheet.appendRowWithVals({ idPrefix: "two" });
    ss.batchUpdateGSheets();

    expect(rebuilt.rowIndex).toBe(TOP_DATA_ROW_INDEX);
    expect(appendRequestCount(batchUpdateCalls)).toBe(0);
    expect(rebuilt.value("idPrefix")).toBe("two");
  });

  it("reuses the row a wipe just cleared, so the wipe and rebuild leave only rebuilt rows", () => {
    const { batchUpdateCalls } = stubSheetConfigSheet({
      4: filledSheetConfigRow,
      5: filledSheetConfigRow,
    });

    const ss = fetchedSheetConfig();
    const sheet = ss.sheet("sheetConfig");
    sheet.DELETE_ALL_DATA_ROWS();
    const row = sheet.appendRowWithVals({ idPrefix: "new" });
    ss.batchUpdateGSheets();

    expect(row.rowIndex).toBe(TOP_DATA_ROW_INDEX);
    expect(appendRequestCount(batchUpdateCalls)).toBe(0);
    expect(deleteRequestIndexes(batchUpdateCalls)).toEqual([5]);
  });
});
