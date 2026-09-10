import { beforeEach, describe, expect, it } from "vitest";
import { columnConfigs } from "../01_generatedConfigs/columnConfigs";
import { sheetConfigs } from "../01_generatedConfigs/sheetConfigs";
import type { ColumnNamedProps } from "../04_SpreadsheetNamed/ColumnNamedBase";
import { SpreadsheetNamed } from "../04_SpreadsheetNamed/SpreadsheetNamed";
import {
  stubLogger,
  stubPropertiesService,
} from "../testSupport/fakeAppsScriptGlobals";
import {
  buildGridRows,
  stubSheetsService,
  type FakeCell,
} from "../testSupport/fakeSheetsService";
import { assertType, type IsExactly } from "../testSupport/typeAssertions";
import {
  CheckboxColumnOperator,
  type CheckboxColumnName,
} from "./CheckboxColumnOperator";

const OCCUPANCY_GID = sheetConfigs.occupancy.sheetGid;
const c = columnConfigs.occupancy;
const columnIds = [c.id.columnId, c.updateTermsSelect.columnId];
const SELECT_COL_INDEX = 1;
const END_ROW_INDEX = 7;

function seedOccupancySelectColumn(selectCells: readonly FakeCell[]) {
  return stubSheetsService({
    sheets: [
      {
        sheetId: OCCUPANCY_GID,
        title: "Occupancy",
        rows: buildGridRows({
          0: columnIds,
          3: ["ID", "Update terms, select"],
          4: ["r:occ:row4", selectCells[0] ?? null],
          5: ["r:occ:row5", selectCells[1] ?? null],
          6: ["r:occ:row6", selectCells[2] ?? null],
        }),
        table: { endRowIndex: END_ROW_INDEX },
      },
    ],
  });
}

function occupancySelectProps(): ColumnNamedProps<
  "occupancy",
  "updateTermsSelect"
> {
  return {
    ...SpreadsheetNamed.initSpreadsheetNamedProps(),
    sheetName: "occupancy",
    columnName: "updateTermsSelect",
  };
}

function initOperatorWithFetchedColumn() {
  const props = occupancySelectProps();
  const operator = new CheckboxColumnOperator(props);
  operator.column.prepFetchFull();
  new SpreadsheetNamed(props).fetchAllPrepped();
  return operator;
}

function selectFills(
  batchUpdateCalls: GoogleAppsScript.Sheets.Schema.BatchUpdateSpreadsheetRequest[],
) {
  return batchUpdateCalls
    .flatMap((call) => call.requests ?? [])
    .filter(
      (request) =>
        request.repeatCell?.range?.startColumnIndex === SELECT_COL_INDEX,
    )
    .map((request) => ({
      startRowIndex: request.repeatCell?.range?.startRowIndex,
      endRowIndex: request.repeatCell?.range?.endRowIndex,
      value: request.repeatCell?.cell?.userEnteredValue?.boolValue,
    }));
}

beforeEach(() => {
  stubPropertiesService({ realEstateSpreadsheetId: "test-spreadsheet-id" });
  stubLogger();
});

describe("CheckboxColumnOperator.rowIndexesChecked", () => {
  it("returns only the row indexes whose checkbox is checked", () => {
    seedOccupancySelectColumn([true, false, true]);
    expect(initOperatorWithFetchedColumn().rowIndexesChecked).toEqual([4, 6]);
  });

  it("counts an empty cell as unchecked", () => {
    seedOccupancySelectColumn([null, null, true]);
    expect(initOperatorWithFetchedColumn().rowIndexesChecked).toEqual([6]);
  });
});

describe("CheckboxColumnOperator.uncheckActiveCells", () => {
  it("unticks a pruned sheet's remaining rows, one request per contiguous range", () => {
    const { batchUpdateCalls } = seedOccupancySelectColumn([true, false, true]);
    const operator = initOperatorWithFetchedColumn();

    operator.sheet.raw.removeRowsExcept(4, 6);
    operator.uncheckActiveCells();
    operator.ss.batchUpdateGSheets();

    expect(selectFills(batchUpdateCalls)).toEqual([
      { startRowIndex: 4, endRowIndex: 5, value: false },
      { startRowIndex: 6, endRowIndex: 7, value: false },
    ]);
  });

  it("normalizes an untouched empty cell to an explicit false", () => {
    const { batchUpdateCalls } = seedOccupancySelectColumn([true, null, null]);
    const operator = initOperatorWithFetchedColumn();

    operator.sheet.raw.removeRowsExcept(5, 6);
    operator.uncheckActiveCells();
    operator.ss.batchUpdateGSheets();

    expect(selectFills(batchUpdateCalls)).toEqual([
      { startRowIndex: 5, endRowIndex: 7, value: false },
    ]);
  });
});

describe("CheckboxColumnOperator, column constraint", () => {
  it("accepts a declared non-formula checkbox column and rejects anything else", () => {
    const checkbox = new CheckboxColumnOperator({
      ...SpreadsheetNamed.initSpreadsheetNamedProps(),
      sheetName: "occupancy",
      columnName: "updateTermsSelect",
    });
    const text = new CheckboxColumnOperator({
      ...SpreadsheetNamed.initSpreadsheetNamedProps(),
      sheetName: "occupancy",
      // @ts-expect-error a string column is not a checkbox column
      columnName: "updateTermsTimeLastRan",
    });
    const sampled = new CheckboxColumnOperator({
      ...SpreadsheetNamed.initSpreadsheetNamedProps(),
      sheetName: "occupancy",
      // @ts-expect-error an undeclared column that merely holds a boolean is not one either
      columnName: "nextGasHeating",
    });
    const formula = new CheckboxColumnOperator({
      ...SpreadsheetNamed.initSpreadsheetNamedProps(),
      sheetName: "sheetConfig",
      // @ts-expect-error a formula column can't be written to, and declares nothing anyway
      columnName: "idPrefixIsUniqueOrEmpty",
    });
    expect(checkbox.schema.valueName).toBe("checkbox");
    expect(checkbox.schema.isFormula).toBe(false);
    expect(text.schema.valueName).toBe("string");
    expect(sampled.schema.valueName).toBe("boolean");
    expect(sampled.schema.isFormula).toBe(false);
    expect(formula.schema.isFormula).toBe(true);
  });

  // A config-describing sheet, so regeneration can't churn the expected union.
  it("names exactly the declared non-formula checkbox columns of a sheet", () => {
    assertType<
      IsExactly<
        CheckboxColumnName<"sheetConfig">,
        "hasIdColumn" | "letApiAccess"
      >
    >(true);
  });
});
