import { beforeEach, describe, expect, it } from "vitest";
import { columnConfigs } from "../01_SpreadsheetSchema/generated/columnConfigs";
import type { ColumnIsFormula } from "../01_SpreadsheetSchema/columnConfigsTypes";
import { sheetConfigs } from "../01_SpreadsheetSchema/generated/sheetConfigs";
import type { SheetName } from "../01_SpreadsheetSchema/sheetConfigsTypes";
import { ssConfigGet } from "../01_SpreadsheetSchema/spreadsheetConfigTypes";
import { stubPropertiesService } from "../testSupport/fakeAppsScriptGlobals";
import {
  blankSheetConfigRow,
  filledSheetConfigRow,
  stubSheetConfigSheet,
} from "../testSupport/fakeSheetConfigSheet";
import {
  buildGridRows,
  stubSheetsService,
} from "../testSupport/fakeSheetsService";
import {
  assertNotType,
  assertType,
  type IsExactly,
} from "../testSupport/typeAssertions";
import type { DateSerial } from "../utils/Dat";
import type { SpreadsheetNamedProps } from "./ClassBases/SpreadsheetBaseNamed";
import { ColumnMetaNamed } from "./ColumnMetaNamed";
import { ColumnNamed } from "./ColumnNamed";
import { RowNamed } from "./RowNamed";
import { SheetMetaNamed } from "./SheetMetaNamed";
import { SheetNamed } from "./SheetNamed";
import { SpreadsheetNamed } from "./SpreadsheetNamed";

describe("SpreadsheetNamed props", () => {
  it("have no Named-state member", () => {
    type HasNamedState = "namedState" extends keyof SpreadsheetNamedProps
      ? true
      : false;
    assertType<IsExactly<HasNamedState, false>>(true);
  });
});

// A mis-wired accessor still type-checks; the instance checks catch it.
describe("SpreadsheetNamed navigation", () => {
  it("gives each accessor the class its return type names", () => {
    stubSheetsService();
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

const topDataRowIndex = ssConfigGet("tableHeaderRowIndexBase0") + 1;
const occupancyGid = sheetConfigs.occupancy.sheetGid;
const idColumnId = columnConfigs.occupancy.id.columnId;
const selectColumnId = columnConfigs.occupancy.updateTermsSelect.columnId;
const nextStartDateColumnId =
  columnConfigs.occupancy.nextTermsStartDate.columnId;
const nextEndDateColumnId = columnConfigs.occupancy.nextTermsEndDate.columnId;
const nextStartDateSerial = 45000;
const nextEndDateSerial = 45365;
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
          0: [
            idColumnId,
            selectColumnId,
            nextStartDateColumnId,
            nextEndDateColumnId,
          ],
          3: [
            "ID",
            "Update terms, select",
            "Next terms start date",
            "Next terms end date",
          ],
          4: ["r:occ:row4", true, nextStartDateSerial, nextEndDateSerial],
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
    const cell = fetchedOccupancySheet().column("id").cell(blankRowIndex);

    expect(() => cell.value()).toThrowError(
      new RegExp(`"id".*"occupancy".*${blankRowIndex}`),
    );
  });

  it("keeps the generated column id out of the Named message", () => {
    const cell = fetchedOccupancySheet().column("id").cell(blankRowIndex);

    expect(() => cell.value()).not.toThrowError(new RegExp(idColumnId));
  });

  it("returns the empty string from CellNamed.valueOrEmpty on that same cell", () => {
    const cell = fetchedOccupancySheet().column("id").cell(blankRowIndex);

    expect(cell.valueOrEmpty()).toBe("");
  });

  it("reads a filled cell identically through both forms", () => {
    const cell = fetchedOccupancySheet().column("id").cell(filledRowIndex);

    expect(cell.value()).toBe("r:occ:row4");
    expect(cell.valueOrEmpty()).toBe("r:occ:row4");
  });

  // The same read one tier up, which is what proves Identified and Named agree.
  it("reads an untouched checkbox as unchecked, with no blank in the type", () => {
    const sheet = fetchedOccupancySheet();
    const column = sheet.column("updateTermsSelect");

    expect(column.valueOrEmpty(blankRowIndex)).toBe(false);
    expect(column.value(blankRowIndex)).toBe(false);
    expect(column.value(filledRowIndex)).toBe(true);
    expect(sheet.row(blankRowIndex).value("updateTermsSelect")).toBe(false);
    assertType<IsExactly<ReturnType<typeof column.value>, boolean>>(true);
    assertType<IsExactly<ReturnType<typeof column.valueOrEmpty>, boolean>>(
      true,
    );
  });

  it("throws from ColumnNamed.value and returns empty from valueOrEmpty", () => {
    const column = fetchedOccupancySheet().column("id");

    expect(() => column.value(blankRowIndex)).toThrowError(/is empty/);
    expect(column.valueOrEmpty(blankRowIndex)).toBe("");
  });

  it("throws from RowNamed.value and returns empty from RowNamed.valueOrEmpty", () => {
    const row = fetchedOccupancySheet().row(blankRowIndex);

    expect(() => row.value("id")).toThrowError(/is empty/);
    expect(row.valueOrEmpty("id")).toBe("");
  });

  it("keeps blanks in the bag returned by RowNamed.valuesOrEmpty", () => {
    const row = fetchedOccupancySheet().row(blankRowIndex);

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
    const cell = fetchedOccupancySheet().column("id").cell(blankRowIndex);

    expect(() => cell.valueNotEmpty()).toThrowError(
      new RegExp(`"id".*"occupancy".*${blankRowIndex}`),
    );
  });

  it("throws from both blank-excluding reads on a column whose box is unticked", () => {
    const sheet = fetchedOccupancySheet();
    const column = sheet.column("nextTermsStartDate");

    expect(() => column.value(blankRowIndex)).toThrowError(
      new RegExp(`"nextTermsStartDate".*"occupancy".*${blankRowIndex}`),
    );
    expect(() => column.valueNotEmpty(blankRowIndex)).toThrowError(/is empty/);
    expect(() => column.valueArr).toThrowError(/is empty/);
    expect(() => column.valueArrNotEmpty).toThrowError(/is empty/);
    expect(() =>
      sheet.row(blankRowIndex).valueNotEmpty("nextTermsStartDate"),
    ).toThrowError(/is empty/);
    expect(column.valueOrEmpty(blankRowIndex)).toBe("");
  });

  it("reads a filled cell identically through all three words", () => {
    const column = fetchedOccupancySheet().column("nextTermsStartDate");

    expect(column.value(filledRowIndex)).toBe(nextStartDateSerial);
    expect(column.valueNotEmpty(filledRowIndex)).toBe(nextStartDateSerial);
    expect(column.valueOrEmpty(filledRowIndex)).toBe(nextStartDateSerial);
  });

  it("keeps the blank out of the unmarked read's type on a column whose box is unticked", () => {
    const column = fetchedOccupancySheet().column("nextTermsStartDate");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- read for its type
    const cell = column.cell(filledRowIndex);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- read for its type
    const row = fetchedOccupancySheet().row(filledRowIndex);

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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- read for its type
    const column = fetchedOccupancySheet().column("nextTermsStartDate");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- read for its type
    const numberColumn = fetchedOccupancySheet().column("residentCount");

    assertNotType<IsExactly<ReturnType<typeof column.value>, number>>(false);
    assertNotType<IsExactly<DateSerial, number>>(false);
    assertType<IsExactly<ReturnType<typeof numberColumn.value>, number>>(true);
  });

  it("hands back the blank rather than throwing on a column whose box is ticked", () => {
    const sheet = fetchedOccupancySheet();
    const column = sheet.column("nextTermsEndDate");

    expect(column.value(blankRowIndex)).toBe("");
    expect(sheet.row(blankRowIndex).value("nextTermsEndDate")).toBe("");
    expect(column.valueArr).toEqual([nextEndDateSerial, ""]);
  });

  it("still throws from the blank-excluding reads on a column whose box is ticked", () => {
    const sheet = fetchedOccupancySheet();
    const column = sheet.column("nextTermsEndDate");

    expect(() => column.valueNotEmpty(blankRowIndex)).toThrowError(/is empty/);
    expect(() => column.valueArrNotEmpty).toThrowError(/is empty/);
    expect(() =>
      sheet.row(blankRowIndex).valueNotEmpty("nextTermsEndDate"),
    ).toThrowError(/is empty/);
  });

  it("keeps the blank in the unmarked read's type on a column whose box is ticked", () => {
    const column = fetchedOccupancySheet().column("nextTermsEndDate");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- read for its type
    const cell = column.cell(blankRowIndex);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- read for its type
    const row = fetchedOccupancySheet().row(blankRowIndex);

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
      blankRowIndex,
    ]);
  });

  it("sorts rows by a column that some of them leave blank", () => {
    const sheet = fetchedOccupancySheet();

    const sorted = sheet.sortRowsbyColumnName(sheet.rows, "id");

    expect(sorted.map((row) => row.rowIndex)).toEqual([
      blankRowIndex,
      filledRowIndex,
    ]);
  });
});

function fetchedSheetConfig(): SpreadsheetNamed {
  const ss = SpreadsheetNamed.init();
  ss.sheet("sheetConfig").prepFetchColumnsFull(
    "sheetGid",
    "sheetTitle",
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

    expect(row.rowIndex).toBe(filledRowIndex);
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

    expect(row.rowIndex).toBe(blankRowIndex);
  });
});

function stubOccupancyWithDuplicateIds() {
  return stubSheetsService({
    sheets: [
      {
        sheetId: occupancyGid,
        title: "Occupancy",
        rows: buildGridRows({
          0: [
            idColumnId,
            selectColumnId,
            nextStartDateColumnId,
            nextEndDateColumnId,
          ],
          3: [
            "ID",
            "Update terms, select",
            "Next terms start date",
            "Next terms end date",
          ],
          4: ["r:occ:dup", true, nextStartDateSerial, nextEndDateSerial],
          5: ["r:occ:dup", true, nextStartDateSerial, nextEndDateSerial],
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

    expect(row.rowIndex).toBe(topDataRowIndex);
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

    expect(row.rowIndex).toBe(topDataRowIndex + 1);
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
      topDataRowIndex,
      topDataRowIndex + 1,
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

    expect(rebuilt.rowIndex).toBe(topDataRowIndex);
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

    expect(row.rowIndex).toBe(topDataRowIndex);
    expect(appendRequestCount(batchUpdateCalls)).toBe(0);
    expect(deleteRequestIndexes(batchUpdateCalls)).toEqual([5]);
  });
});

const testSheetGid = sheetConfigs.test.sheetGid;
const testColumnIdRow = Object.values(columnConfigs.test).map(
  (column) => column.columnId,
);

function stubTestSheetWithBlankRow() {
  return stubSheetsService({
    sheets: [
      {
        sheetId: testSheetGid,
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
    "num",
    "dropdown",
    "conditionalFormatting",
    "columnCurrency",
    "active",
  );
  ss.fetchAllPrepped();
  return ss;
}

type CompleteAppendBag<SN extends SheetName> = Parameters<
  SheetNamed<SN>["appendRowWithAllVals"]
>[0];

const completeTestRow: CompleteAppendBag<"test"> = {
  num: 7,
  dropdown: "Yes",
  conditionalFormatting: true,
  columnCurrency: 8,
  active: true,
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
      row.value("num"),
      row.value("dropdown"),
      row.value("conditionalFormatting"),
      row.value("columnCurrency"),
      row.value("active"),
    ]).toEqual([7, "Yes", true, 8, true]);
  });

  it("reuses the blank row the way the partial append does", () => {
    const { batchUpdateCalls } = stubTestSheetWithBlankRow();

    const ss = fetchedTestSpreadsheet();
    const row = ss.sheet("test").appendRowWithAllVals(completeTestRow);
    ss.batchUpdateGSheets();

    expect(row.rowIndex).toBe(topDataRowIndex);
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
      letApiAccess: true,
      idPrefix: "prp",
      // @ts-expect-error a formula column cannot be written to
      idPrefixIsUniqueOrEmpty: true,
    };

    expect([Object.keys(withId), Object.keys(withFormula)]).toEqual([
      [
        "num",
        "dropdown",
        "conditionalFormatting",
        "columnCurrency",
        "active",
        "id",
      ],
      [
        "sheetGid",
        "sheetTitle",
        "letApiAccess",
        "idPrefix",
        "idPrefixIsUniqueOrEmpty",
      ],
    ]);
  });
});

const addExpenseGid = sheetConfigs.addPropertyExpense.sheetGid;
const expenseColumns = columnConfigs.addPropertyExpense;

// Biller name alone is filled: amount is a required blank, notes an allowed one.
function stubAddPropertyExpenseSheet() {
  return stubSheetsService({
    sheets: [
      {
        sheetId: addExpenseGid,
        title: "Add Property Expense",
        rows: buildGridRows({
          0: [
            expenseColumns.billerName.columnId,
            expenseColumns.amount.columnId,
            expenseColumns.notes.columnId,
            expenseColumns.isUpfrontInvestment.columnId,
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
  return ss.sheet("addPropertyExpense").row(topDataRowIndex);
}

describe("RowNamed.blankRequiredColumnNames", () => {
  beforeEach(() => {
    stubPropertiesService({ realEstateSpreadsheetId: "test-spreadsheet-id" });
    stubAddPropertyExpenseSheet();
  });

  it("names a blank column whose Empty value allowed box is unticked", () => {
    expect(fetchedAddExpenseRow().blankRequiredColumnNames()).toContain(
      "amount",
    );
  });

  it("leaves out a blank column whose box is ticked", () => {
    expect(fetchedAddExpenseRow().blankRequiredColumnNames()).not.toContain(
      "notes",
    );
  });

  it("leaves out an unticked checkbox, whose blank is an answer", () => {
    expect(fetchedAddExpenseRow().blankRequiredColumnNames()).not.toContain(
      "isUpfrontInvestment",
    );
  });

  it("names every blank required column and nothing else", () => {
    expect(fetchedAddExpenseRow().blankRequiredColumnNames()).toEqual([
      "amount",
    ]);
  });
});

const testFormula = "=2+SINGLE(test[Number])";
const formulaTestColIndex = Object.keys(columnConfigs.test).indexOf(
  "formulaTest",
);

function stubTestSheetForFormulaWrite() {
  return stubSheetsService({
    sheets: [
      {
        sheetId: testSheetGid,
        title: "Test",
        rows: buildGridRows({
          0: testColumnIdRow,
          4: [null, "r:test:1", 10, null, null, null, 11],
          5: [null, "r:test:2", 20, null, null, null, 21],
        }),
        table: { endRowIndex: 6 },
      },
    ],
  });
}

describe("Named formula writes", () => {
  beforeEach(() => {
    stubPropertiesService({ realEstateSpreadsheetId: "test-spreadsheet-id" });
  });

  it("sends one pasteData PASTE_FORMULA for every Test Formula test data row", () => {
    const { batchUpdateCalls } = stubTestSheetForFormulaWrite();

    const ss = SpreadsheetNamed.init();
    ss.fetchAllSheetProperties();
    ss.sheet("test").column("formulaTest").updateAllFormulas(testFormula);
    ss.batchUpdateGSheets();

    expect(batchUpdateCalls[0]?.requests).toEqual([
      {
        pasteData: {
          coordinate: {
            sheetId: testSheetGid,
            rowIndex: topDataRowIndex,
            columnIndex: formulaTestColIndex,
          },
          data: `"${testFormula}"\n"${testFormula}"`,
          delimiter: "\t",
          type: "PASTE_FORMULA",
        },
      },
    ]);
  });

  it("sends one pasteData PASTE_FORMULA for a single Formula test cell", () => {
    const { batchUpdateCalls } = stubTestSheetForFormulaWrite();

    const ss = SpreadsheetNamed.init();
    ss.fetchAllSheetProperties();
    ss.sheet("test")
      .column("formulaTest")
      .cell(topDataRowIndex)
      .updateFormula(testFormula);
    ss.batchUpdateGSheets();

    expect(batchUpdateCalls[0]?.requests).toEqual([
      {
        pasteData: {
          coordinate: {
            sheetId: testSheetGid,
            rowIndex: topDataRowIndex,
            columnIndex: formulaTestColIndex,
          },
          data: `"${testFormula}"`,
          delimiter: "\t",
          type: "PASTE_FORMULA",
        },
      },
    ]);
  });

  it("sends one pasteData per contiguous active run for updateActiveFormulas", () => {
    const { batchUpdateCalls } = stubTestSheetForFormulaWrite();

    const ss = SpreadsheetNamed.init();
    ss.sheet("test").prepFetchColumnsFull("formulaTest");
    ss.fetchAllPrepped();
    ss.sheet("test").raw.removeRowsExcept(topDataRowIndex);
    ss.sheet("test").column("formulaTest").updateActiveFormulas(testFormula);
    ss.batchUpdateGSheets();

    expect(batchUpdateCalls[0]?.requests).toEqual([
      {
        pasteData: {
          coordinate: {
            sheetId: testSheetGid,
            rowIndex: topDataRowIndex,
            columnIndex: formulaTestColIndex,
          },
          data: `"${testFormula}"`,
          delimiter: "\t",
          type: "PASTE_FORMULA",
        },
      },
    ]);
  });

  it("throws before queueing when the formula does not start with =", () => {
    stubTestSheetForFormulaWrite();

    const ss = SpreadsheetNamed.init();
    ss.fetchAllSheetProperties();

    expect(() =>
      ss.sheet("test").column("formulaTest").updateAllFormulas("2+1"),
    ).toThrowError('Formula must start with "=". Got "2+1".');
  });

  it("leaves local cell values unchanged after a formula write", () => {
    stubTestSheetForFormulaWrite();

    const ss = SpreadsheetNamed.init();
    ss.sheet("test").prepFetchColumnsFull("formulaTest", "num");
    ss.fetchAllPrepped();
    ss.sheet("test").column("formulaTest").updateAllFormulas(testFormula);

    expect(ss.sheet("test").column("formulaTest").valueArrOrEmpty).toEqual([
      11, 21,
    ]);
    expect(ss.sheet("test").column("num").valueArrOrEmpty).toEqual([10, 20]);
  });

  it("still refuses a value write on Formula test", () => {
    stubTestSheetForFormulaWrite();

    const ss = SpreadsheetNamed.init();
    ss.fetchAllSheetProperties();

    expect(() =>
      ss
        .sheet("test")
        .column("formulaTest")
        .cell(topDataRowIndex)
        .updateValue(99),
    ).toThrowError(/formula column/);
  });

  it("merges a colour onto the same cell as a formula write", () => {
    const { batchUpdateCalls } = stubTestSheetForFormulaWrite();
    const backgroundColor = { red: 0.851, green: 0.918, blue: 0.827 };

    const ss = SpreadsheetNamed.init();
    ss.fetchAllSheetProperties();
    const cell = ss.sheet("test").column("formulaTest").cell(topDataRowIndex);
    cell.updateFormula(testFormula);
    cell.updateBackgroundColor(backgroundColor);
    ss.batchUpdateGSheets();

    expect(batchUpdateCalls[0]?.requests).toEqual([
      {
        pasteData: {
          coordinate: {
            sheetId: testSheetGid,
            rowIndex: topDataRowIndex,
            columnIndex: formulaTestColIndex,
          },
          data: `"${testFormula}"`,
          delimiter: "\t",
          type: "PASTE_FORMULA",
        },
      },
      {
        updateCells: {
          range: {
            sheetId: testSheetGid,
            startRowIndex: topDataRowIndex,
            endRowIndex: topDataRowIndex + 1,
            startColumnIndex: formulaTestColIndex,
            endColumnIndex: formulaTestColIndex + 1,
          },
          rows: [
            {
              values: [{ userEnteredFormat: { backgroundColor } }],
            },
          ],
          fields: "userEnteredFormat.backgroundColor",
        },
      },
    ]);
  });

  it("refuses a whole-column formula fill on a sheet pruned to a selection", () => {
    stubTestSheetForFormulaWrite();

    const ss = SpreadsheetNamed.init();
    ss.sheet("test").prepFetchColumnsFull("formulaTest");
    ss.fetchAllPrepped();
    ss.sheet("test").raw.removeRowsExcept(topDataRowIndex);

    expect(() =>
      ss.sheet("test").column("formulaTest").updateAllFormulas(testFormula),
    ).toThrowError(/pruned to a selection/);
  });

  it("accepts Formula test and rejects Num at the type level", () => {
    assertType<IsExactly<ColumnIsFormula<"test", "formulaTest">, true>>(true);
    assertType<IsExactly<ColumnIsFormula<"test", "num">, false>>(true);

    function formulaWriteTypeGate(
      formulaColumn: ColumnNamed<"test", "formulaTest">,
      numColumn: ColumnNamed<"test", "num">,
    ) {
      formulaColumn.updateAllFormulas(testFormula);
      formulaColumn.updateActiveFormulas(testFormula);
      formulaColumn.cell(topDataRowIndex).updateFormula(testFormula);
      // @ts-expect-error Num is not a formula column
      numColumn.updateAllFormulas(testFormula);
      // @ts-expect-error Num is not a formula column
      numColumn.updateActiveFormulas(testFormula);
      // @ts-expect-error Num is not a formula column
      numColumn.cell(topDataRowIndex).updateFormula(testFormula);
    }

    expect(formulaWriteTypeGate).toEqual(expect.any(Function));
  });
});
