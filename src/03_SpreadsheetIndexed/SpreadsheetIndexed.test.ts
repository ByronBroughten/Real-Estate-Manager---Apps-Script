import { beforeEach, describe, expect, it } from "vitest";
import { columnConfigs } from "../01_generatedConfigs/columnConfigs";
import { sheetConfigs } from "../01_generatedConfigs/sheetConfigs";
import { stubPropertiesService } from "../testSupport/fakeAppsScriptGlobals";
import {
  buildGridRows,
  stubSheetsService,
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

  it("throws from CellIndexed.value on a blank cell, naming the column id and the row", () => {
    const cell = fetchedOccupancySheet()
      .column(ID_COLUMN_ID)
      .cell(BLANK_ROW_INDEX);

    expect(() => cell.value()).toThrowError(
      new RegExp(`${ID_COLUMN_ID}.*${BLANK_ROW_INDEX}`),
    );
  });

  it("returns the empty string from CellIndexed.valueOrEmpty on that same cell", () => {
    const cell = fetchedOccupancySheet()
      .column(ID_COLUMN_ID)
      .cell(BLANK_ROW_INDEX);

    expect(cell.valueOrEmpty()).toBe("");
  });

  it("reads a filled cell identically through both forms", () => {
    const cell = fetchedOccupancySheet()
      .column(ID_COLUMN_ID)
      .cell(FILLED_ROW_INDEX);

    expect(cell.value()).toBe("r:occ:row4");
    expect(cell.valueOrEmpty()).toBe("r:occ:row4");
  });

  it("reads an untouched checkbox as empty rather than false", () => {
    const column = fetchedOccupancySheet().column(SELECT_COLUMN_ID);

    expect(column.valueOrEmpty(BLANK_ROW_INDEX)).toBe("");
    expect(() => column.value(BLANK_ROW_INDEX)).toThrowError(/is empty/);
  });

  it("throws from ColumnIndexed.value and returns empty from valueOrEmpty", () => {
    const column = fetchedOccupancySheet().column(ID_COLUMN_ID);

    expect(() => column.value(BLANK_ROW_INDEX)).toThrowError(/is empty/);
    expect(column.valueOrEmpty(BLANK_ROW_INDEX)).toBe("");
  });

  it("throws from RowIndexed.value and returns empty from RowIndexed.valueOrEmpty", () => {
    const row = fetchedOccupancySheet().row(BLANK_ROW_INDEX);

    expect(() => row.value(ID_COLUMN_ID)).toThrowError(/is empty/);
    expect(row.valueOrEmpty(ID_COLUMN_ID)).toBe("");
  });

  it("throws from valueArr when a fetched cell is blank, but not from the marked forms", () => {
    const column = fetchedOccupancySheet().column(ID_COLUMN_ID);

    expect(() => column.valueArr).toThrowError(/is empty/);
    expect(column.valueArrOrEmpty).toEqual(["r:occ:row4", ""]);
    expect(column.valueArrFilterEmpty).toEqual(["r:occ:row4"]);
  });
});
