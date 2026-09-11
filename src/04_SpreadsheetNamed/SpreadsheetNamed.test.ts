import { beforeEach, describe, expect, it } from "vitest";
import { columnConfigs } from "../01_generatedConfigs/columnConfigs";
import { sheetConfigs } from "../01_generatedConfigs/sheetConfigs";
import type { SheetName } from "../01_generatedConfigs/sheetConfigsTypes";
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
import {
  assertNotType,
  assertType,
  type IsExactly,
} from "../testSupport/typeAssertions";
import type { DateSerial } from "../utils/Dat";
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
const NEXT_START_DATE_COLUMN_ID =
  columnConfigs.occupancy.nextTermsStartDate.columnId;
const NEXT_END_DATE_COLUMN_ID =
  columnConfigs.occupancy.nextTermsEndDate.columnId;
const NEXT_START_DATE_SERIAL = 45000;
const NEXT_END_DATE_SERIAL = 45365;
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
          0: [
            ID_COLUMN_ID,
            SELECT_COLUMN_ID,
            NEXT_START_DATE_COLUMN_ID,
            NEXT_END_DATE_COLUMN_ID,
          ],
          3: [
            "ID",
            "Update terms, select",
            "Next terms start date",
            "Next terms end date",
          ],
          4: ["r:occ:row4", true, NEXT_START_DATE_SERIAL, NEXT_END_DATE_SERIAL],
          5: [null, null, null, null],
        }),
        table: { endRowIndex: 6 },
      },
    ],
  });
}

function fetchedOccupancySheet(): SheetNamed<"occupancy"> {
  const ss = SpreadsheetNamed.init();
  ss.sheet("occupancy").prepFetchColumnsFull(
    "id",
    "updateTermsSelect",
    "nextTermsStartDate",
    "nextTermsEndDate",
  );
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

  // The same read one tier up, which is what proves Indexed and Named agree.
  it("reads an untouched checkbox as unchecked, with no blank in the type", () => {
    const sheet = fetchedOccupancySheet();
    const column = sheet.column("updateTermsSelect");

    expect(column.valueOrEmpty(BLANK_ROW_INDEX)).toBe(false);
    expect(column.value(BLANK_ROW_INDEX)).toBe(false);
    expect(column.value(FILLED_ROW_INDEX)).toBe(true);
    expect(sheet.row(BLANK_ROW_INDEX).value("updateTermsSelect")).toBe(false);
    assertType<IsExactly<ReturnType<typeof column.value>, boolean>>(true);
    assertType<IsExactly<ReturnType<typeof column.valueOrEmpty>, boolean>>(
      true,
    );
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
      updateTermsSelect: false,
    });
  });

  it("throws from valueArr when a fetched cell is blank, but not from the marked forms", () => {
    const column = fetchedOccupancySheet().column("id");

    expect(() => column.valueArr).toThrowError(/is empty/);
    expect(column.valueArrOrEmpty).toEqual(["r:occ:row4", ""]);
    expect(column.valueArrFilterEmpty).toEqual(["r:occ:row4"]);
  });

  it("throws from CellNamed.valueNotEmpty on a blank cell, naming it the same way", () => {
    const cell = fetchedOccupancySheet().column("id").cell(BLANK_ROW_INDEX);

    expect(() => cell.valueNotEmpty()).toThrowError(
      new RegExp(`"id".*"occupancy".*${BLANK_ROW_INDEX}`),
    );
  });

  it("throws from both blank-excluding reads on a column whose box is unticked", () => {
    const sheet = fetchedOccupancySheet();
    const column = sheet.column("nextTermsStartDate");

    expect(() => column.value(BLANK_ROW_INDEX)).toThrowError(
      new RegExp(`"nextTermsStartDate".*"occupancy".*${BLANK_ROW_INDEX}`),
    );
    expect(() => column.valueNotEmpty(BLANK_ROW_INDEX)).toThrowError(
      /is empty/,
    );
    expect(() => column.valueArr).toThrowError(/is empty/);
    expect(() => column.valueArrNotEmpty).toThrowError(/is empty/);
    expect(() =>
      sheet.row(BLANK_ROW_INDEX).valueNotEmpty("nextTermsStartDate"),
    ).toThrowError(/is empty/);
    expect(column.valueOrEmpty(BLANK_ROW_INDEX)).toBe("");
  });

  it("reads a filled cell identically through all three words", () => {
    const column = fetchedOccupancySheet().column("nextTermsStartDate");

    expect(column.value(FILLED_ROW_INDEX)).toBe(NEXT_START_DATE_SERIAL);
    expect(column.valueNotEmpty(FILLED_ROW_INDEX)).toBe(NEXT_START_DATE_SERIAL);
    expect(column.valueOrEmpty(FILLED_ROW_INDEX)).toBe(NEXT_START_DATE_SERIAL);
  });

  it("keeps the blank out of the unmarked read's type on a column whose box is unticked", () => {
    const column = fetchedOccupancySheet().column("nextTermsStartDate");
    const cell = column.cell(FILLED_ROW_INDEX);
    const row = fetchedOccupancySheet().row(FILLED_ROW_INDEX);

    assertType<IsExactly<ReturnType<typeof cell.value>, DateSerial>>(true);
    assertType<IsExactly<ReturnType<typeof cell.valueNotEmpty>, DateSerial>>(
      true,
    );
    assertType<IsExactly<ReturnType<typeof column.value>, DateSerial>>(true);
    assertType<IsExactly<ReturnType<typeof column.valueNotEmpty>, DateSerial>>(
      true,
    );
    assertType<
      IsExactly<ReturnType<typeof column.valueOrEmpty>, DateSerial | "">
    >(true);
    assertType<
      IsExactly<ReturnType<typeof row.value<"nextTermsStartDate">>, DateSerial>
    >(true);
  });

  // A plain number would pass an assignment check against DateSerial's supertype.
  it("gives a date column a value type no rent or count can be handed to", () => {
    const column = fetchedOccupancySheet().column("nextTermsStartDate");
    const numberColumn = fetchedOccupancySheet().column("residentCount");

    assertNotType<IsExactly<ReturnType<typeof column.value>, number>>(false);
    assertNotType<IsExactly<DateSerial, number>>(false);
    assertType<IsExactly<ReturnType<typeof numberColumn.value>, number>>(true);
  });

  it("hands back the blank rather than throwing on a column whose box is ticked", () => {
    const sheet = fetchedOccupancySheet();
    const column = sheet.column("nextTermsEndDate");

    expect(column.value(BLANK_ROW_INDEX)).toBe("");
    expect(sheet.row(BLANK_ROW_INDEX).value("nextTermsEndDate")).toBe("");
    expect(column.valueArr).toEqual([NEXT_END_DATE_SERIAL, ""]);
  });

  it("still throws from the blank-excluding reads on a column whose box is ticked", () => {
    const sheet = fetchedOccupancySheet();
    const column = sheet.column("nextTermsEndDate");

    expect(() => column.valueNotEmpty(BLANK_ROW_INDEX)).toThrowError(
      /is empty/,
    );
    expect(() => column.valueArrNotEmpty).toThrowError(/is empty/);
    expect(() =>
      sheet.row(BLANK_ROW_INDEX).valueNotEmpty("nextTermsEndDate"),
    ).toThrowError(/is empty/);
  });

  it("keeps the blank in the unmarked read's type on a column whose box is ticked", () => {
    const column = fetchedOccupancySheet().column("nextTermsEndDate");
    const cell = column.cell(BLANK_ROW_INDEX);
    const row = fetchedOccupancySheet().row(BLANK_ROW_INDEX);

    assertType<IsExactly<ReturnType<typeof cell.value>, DateSerial | "">>(true);
    assertType<IsExactly<ReturnType<typeof cell.valueNotEmpty>, DateSerial>>(
      true,
    );
    assertType<IsExactly<ReturnType<typeof column.value>, DateSerial | "">>(
      true,
    );
    assertType<IsExactly<typeof column.valueArr, (DateSerial | "")[]>>(true);
    assertType<IsExactly<ReturnType<typeof column.valueNotEmpty>, DateSerial>>(
      true,
    );
    assertType<
      IsExactly<
        ReturnType<typeof row.value<"nextTermsEndDate">>,
        DateSerial | ""
      >
    >(true);
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
          0: [
            ID_COLUMN_ID,
            SELECT_COLUMN_ID,
            NEXT_START_DATE_COLUMN_ID,
            NEXT_END_DATE_COLUMN_ID,
          ],
          3: [
            "ID",
            "Update terms, select",
            "Next terms start date",
            "Next terms end date",
          ],
          4: ["r:occ:dup", true, NEXT_START_DATE_SERIAL, NEXT_END_DATE_SERIAL],
          5: ["r:occ:dup", true, NEXT_START_DATE_SERIAL, NEXT_END_DATE_SERIAL],
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

const TEST_SHEET_GID = sheetConfigs.test.sheetGid;
const testColumnIdRow = Object.values(columnConfigs.test).map(
  (column) => column.columnId,
);

function stubTestSheetWithBlankRow() {
  return stubSheetsService({
    sheets: [
      {
        sheetId: TEST_SHEET_GID,
        title: "Test",
        rows: buildGridRows({
          0: testColumnIdRow,
          4: testColumnIdRow.map(() => null),
        }),
        table: { endRowIndex: 5 },
      },
    ],
  });
}

function fetchedTestSpreadsheet(): SpreadsheetNamed {
  const ss = SpreadsheetNamed.init();
  ss.sheet("test").prepFetchColumnsFull(
    "id",
    "number",
    "dropdown",
    "sampledBoolean",
  );
  ss.fetchAllPrepped();
  return ss;
}

type CompleteAppendBag<SN extends SheetName> = Parameters<
  SheetNamed<SN>["appendRowWithAllVals"]
>[0];

const completeTestRow: CompleteAppendBag<"test"> = {
  number: 7,
  dropdown: "Yes",
  sampledBoolean: true,
};

describe("SheetNamed.appendRowWithAllVals", () => {
  beforeEach(() => {
    stubPropertiesService({ realEstateSpreadsheetId: "test-spreadsheet-id" });
  });

  it("mints the row ID itself, from a bag that cannot name one", () => {
    stubTestSheetWithBlankRow();

    const row = fetchedTestSpreadsheet()
      .sheet("test")
      .appendRowWithAllVals(completeTestRow);

    expect(row.value("id")).toMatch(/^r:test:[0-9a-zA-Z_-]{7}$/);
  });

  it("writes every value the bag carries", () => {
    stubTestSheetWithBlankRow();

    const row = fetchedTestSpreadsheet()
      .sheet("test")
      .appendRowWithAllVals(completeTestRow);

    expect([
      row.value("number"),
      row.value("dropdown"),
      row.value("sampledBoolean"),
    ]).toEqual([7, "Yes", true]);
  });

  it("reuses the blank row the way the partial append does", () => {
    const { batchUpdateCalls } = stubTestSheetWithBlankRow();

    const ss = fetchedTestSpreadsheet();
    const row = ss.sheet("test").appendRowWithAllVals(completeTestRow);
    ss.batchUpdateGSheets();

    expect(row.rowIndex).toBe(TOP_DATA_ROW_INDEX);
    expect(appendRequestCount(batchUpdateCalls)).toBe(0);
  });

  it("asks a sheet with an ID column for every writable column but the ID", () => {
    assertType<
      IsExactly<
        keyof CompleteAppendBag<"occupancyTerms">,
        | "occupancyId"
        | "noticeDate"
        | "startDate"
        | "endDate"
        | "rentChargeMonthly"
        | "caretakerRentReductionMonthly"
        | "petFeeMonthly"
        | "gasHeating"
        | "electricHeating"
        | "gasCooking"
        | "electricCooking"
        | "otherElectric"
        | "gasWaterHeating"
        | "electricWaterHeating"
        | "waterSewer"
        | "trashCollection"
        | "districtEnergyHeating"
        | "districtEnergyWaterHeating"
        | "notes"
      >
    >(true);
    assertType<
      IsExactly<
        CompleteAppendBag<"occupancyTerms">["petFeeMonthly"],
        number | ""
      >
    >(true);
  });

  it("asks a sheet with no ID column for every writable column", () => {
    assertType<
      IsExactly<
        CompleteAppendBag<"sheetConfig">,
        {
          sheetGid: number | "";
          sheetTitle: string;
          hasIdColumn: boolean;
          letApiAccess: boolean;
          idPrefix: string;
        }
      >
    >(true);
  });

  // Declared rather than appended, since writing a formula cell throws before the bag matters.
  it("refuses a bag that names the ID or a formula column", () => {
    const withId: CompleteAppendBag<"test"> = {
      ...completeTestRow,
      // @ts-expect-error the append mints the ID, so a caller cannot supply one
      id: "r:test:abcdefg",
    };
    const withFormula: CompleteAppendBag<"sheetConfig"> = {
      sheetGid: 999001,
      sheetTitle: "Property",
      hasIdColumn: true,
      letApiAccess: true,
      idPrefix: "prp",
      // @ts-expect-error a formula column cannot be written to
      idPrefixIsUniqueOrEmpty: true,
    };

    expect([Object.keys(withId), Object.keys(withFormula)]).toEqual([
      ["number", "dropdown", "sampledBoolean", "id"],
      [
        "sheetGid",
        "sheetTitle",
        "hasIdColumn",
        "letApiAccess",
        "idPrefix",
        "idPrefixIsUniqueOrEmpty",
      ],
    ]);
  });
});

const ADD_EXPENSE_GID = sheetConfigs.addPropertyExpense.sheetGid;
const ape = columnConfigs.addPropertyExpense;

// Biller name alone is filled: amount is a required blank, notes an allowed one.
function stubAddPropertyExpenseSheet() {
  return stubSheetsService({
    sheets: [
      {
        sheetId: ADD_EXPENSE_GID,
        title: "Add Property Expense",
        rows: buildGridRows({
          0: [
            ape.billerName.columnId,
            ape.amount.columnId,
            ape.notes.columnId,
            ape.isUpfrontInvestment.columnId,
          ],
          3: ["Biller name", "Amount", "Notes", "Is upfront investment"],
          4: ["Acme Roofing", null, null, null],
        }),
        table: { endRowIndex: 5 },
      },
    ],
  });
}

function fetchedAddExpenseRow(): RowNamed<"addPropertyExpense"> {
  const ss = SpreadsheetNamed.init();
  ss.sheet("addPropertyExpense").prepFetchColumnsFull(
    "billerName",
    "amount",
    "notes",
    "isUpfrontInvestment",
  );
  ss.fetchAllPrepped();
  return ss.sheet("addPropertyExpense").row(TOP_DATA_ROW_INDEX);
}

describe("RowNamed.blankRequiredColumnNames", () => {
  beforeEach(() => {
    stubPropertiesService({ realEstateSpreadsheetId: "test-spreadsheet-id" });
    stubAddPropertyExpenseSheet();
  });

  it("names a blank column whose Empty value allowed box is unticked", () => {
    expect(fetchedAddExpenseRow().blankRequiredColumnNames).toContain("amount");
  });

  it("leaves out a blank column whose box is ticked", () => {
    expect(fetchedAddExpenseRow().blankRequiredColumnNames).not.toContain(
      "notes",
    );
  });

  it("leaves out an unticked checkbox, whose blank is an answer", () => {
    expect(fetchedAddExpenseRow().blankRequiredColumnNames).not.toContain(
      "isUpfrontInvestment",
    );
  });

  it("leaves out a required column that is filled", () => {
    expect(fetchedAddExpenseRow().blankRequiredColumnNames).toEqual(["amount"]);
  });
});
