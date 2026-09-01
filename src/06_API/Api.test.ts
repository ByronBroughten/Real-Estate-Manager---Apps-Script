import { beforeEach, describe, expect, it } from "vitest";
import { columnConfigs } from "../01_generatedConfigs/columnConfigs";
import { sheetConfigs } from "../01_generatedConfigs/sheetConfigs";
import { spreadsheetConfig } from "../01_generatedConfigs/spreadsheetConfig";
import { businessEndpoints } from "../businessEndpoints";
import {
  stubLogger,
  stubPropertiesService,
} from "../testSupport/fakeAppsScriptGlobals";
import {
  buildGridRows,
  stubSheetsService,
} from "../testSupport/fakeSheetsService";
import { Api } from "./Api";
import type { Endpoints } from "./baseEndpoints";

const OCCUPANCY_GID = sheetConfigs.occupancy.sheetGid;
const c = columnConfigs.occupancy;
const columnIds = [
  c.id.columnId,
  c.updateTermsSelect.columnId,
  c.buildLedgerTimeLastRan.columnId,
];
const SELECTOR_COL_INDEX = 1;
const RUNNER_COL_INDEX = 2;
const END_ROW_INDEX = 7;

function stubOccupancySheet() {
  return stubSheetsService({
    sheets: [
      {
        sheetId: OCCUPANCY_GID,
        title: "Occupancy",
        rows: buildGridRows({
          0: columnIds,
          3: ["ID", "Update terms, select", "Build ledger, time last ran"],
          4: ["c:occ:row4", false, ""],
          5: ["c:occ:row5", false, ""],
          6: ["c:occ:row6", false, ""],
        }),
        table: { endRowIndex: END_ROW_INDEX },
      },
    ],
  });
}

function actionRowEdit(colIndex: number, value: string) {
  return {
    value,
    range: {
      getRow: () => spreadsheetConfig.actionRowIndexBase0 + 1,
      getColumn: () => colIndex + 1,
      getSheet: () => ({ getSheetId: () => OCCUPANCY_GID }),
    },
  } as unknown as GoogleAppsScript.Events.SheetsOnEdit;
}

function selectValuesWritten(
  batchUpdateCalls: GoogleAppsScript.Sheets.Schema.BatchUpdateSpreadsheetRequest[],
) {
  return batchUpdateCalls
    .flatMap((call) => call.requests ?? [])
    .filter(
      (request) =>
        request.updateCells?.range?.startColumnIndex === SELECTOR_COL_INDEX,
    )
    .map((request) => ({
      rowIndex: request.updateCells?.range?.startRowIndex,
      value: request.updateCells?.rows?.[0]?.values?.[0]?.userEnteredValue,
    }));
}

beforeEach(() => {
  stubPropertiesService({ realEstateSpreadsheetId: "test-spreadsheet-id" });
  stubLogger();
});

describe("Api.isSuspectedApiCall", () => {
  it("accepts an unchecked action-row checkbox, so selectors can deselect", () => {
    expect(
      Api.isSuspectedApiCall(actionRowEdit(SELECTOR_COL_INDEX, "FALSE")),
    ).toBe(true);
    expect(
      Api.isSuspectedApiCall(actionRowEdit(SELECTOR_COL_INDEX, "TRUE")),
    ).toBe(true);
  });
  it("ignores an action-row edit that isn't a checkbox", () => {
    expect(
      Api.isSuspectedApiCall(actionRowEdit(SELECTOR_COL_INDEX, "some text")),
    ).toBe(false);
  });
});

describe("Api.handleSheetOnEditEvent, endpoint dispatch by column-name suffix", () => {
  function trackingEndpoints(calls: string[]): Endpoints {
    return {
      occupancy_updateTermsSelect: ({ isSelected }) => {
        calls.push(`selector:${isSelected}`);
      },
      occupancy_buildLedgerTimeLastRan: () => {
        calls.push("runner");
      },
    };
  }

  it("runs a selector endpoint on both check and uncheck, passing the value", () => {
    const calls: string[] = [];
    stubOccupancySheet();
    const api = Api.init(trackingEndpoints(calls));

    api.handleSheetOnEditEvent(actionRowEdit(SELECTOR_COL_INDEX, "TRUE"));
    api.handleSheetOnEditEvent(actionRowEdit(SELECTOR_COL_INDEX, "FALSE"));

    expect(calls).toEqual(["selector:true", "selector:false"]);
  });

  it("runs a runner endpoint only on check", () => {
    const calls: string[] = [];
    stubOccupancySheet();
    const api = Api.init(trackingEndpoints(calls));

    api.handleSheetOnEditEvent(actionRowEdit(RUNNER_COL_INDEX, "FALSE"));
    expect(calls).toEqual([]);

    api.handleSheetOnEditEvent(actionRowEdit(RUNNER_COL_INDEX, "TRUE"));
    expect(calls).toEqual(["runner"]);
  });
});

describe("Api.handleSheetOnEditEvent, dispatching occupancy_updateTermsSelect", () => {
  it("selects every data row from one fetch and one batch update", () => {
    const { getByDataFilterCalls, batchUpdateCalls } = stubOccupancySheet();

    Api.init(businessEndpoints).handleSheetOnEditEvent(
      actionRowEdit(SELECTOR_COL_INDEX, "TRUE"),
    );

    expect(getByDataFilterCalls).toHaveLength(1);
    expect(batchUpdateCalls).toHaveLength(1);
    expect(selectValuesWritten(batchUpdateCalls)).toEqual([
      { rowIndex: 4, value: { boolValue: true } },
      { rowIndex: 5, value: { boolValue: true } },
      { rowIndex: 6, value: { boolValue: true } },
    ]);
  });

  it("deselects every data row when the checkbox is unchecked", () => {
    const { batchUpdateCalls } = stubOccupancySheet();

    Api.init(businessEndpoints).handleSheetOnEditEvent(
      actionRowEdit(SELECTOR_COL_INDEX, "FALSE"),
    );

    expect(selectValuesWritten(batchUpdateCalls)).toEqual([
      { rowIndex: 4, value: { boolValue: false } },
      { rowIndex: 5, value: { boolValue: false } },
      { rowIndex: 6, value: { boolValue: false } },
    ]);
  });
});
