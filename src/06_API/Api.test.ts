import { beforeEach, describe, expect, it } from "vitest";
import { columnConfigs } from "../01_generatedConfigs/columnConfigs";
import { sheetConfigs } from "../01_generatedConfigs/sheetConfigs";
import { spreadsheetConfig } from "../01_generatedConfigs/spreadsheetConfig";
import {
  stubLogger,
  stubPropertiesService,
} from "../testSupport/fakeAppsScriptGlobals";
import {
  buildGridRows,
  stubSheetsService,
} from "../testSupport/fakeSheetsService";
import { Api } from "./Api";
import type { Endpoints } from "./Endpoints";

const OCCUPANCY_GID = sheetConfigs.occupancy.sheetGid;
const c = columnConfigs.occupancy;
// The last column is deliberately left without a column id.
const columnIds = [
  c.id.columnId,
  c.updateTermsSelect.columnId,
  c.buildLedgerTimeLastRan.columnId,
  "",
];
const ID_COL_INDEX = 0;
const TWO_WAY_COL_INDEX = 1;
const BUTTON_COL_INDEX = 2;
const BLANK_ID_COL_INDEX = 3;
const ACTION_ROW_INDEX = spreadsheetConfig.actionRowIndexBase0;
const END_ROW_INDEX = 7;

function stubOccupancySheet() {
  return stubSheetsService({
    sheets: [
      {
        sheetId: OCCUPANCY_GID,
        title: "Occupancy",
        rows: buildGridRows({
          0: columnIds,
          3: ["ID", "Update terms, select", "Build ledger, time last ran", ""],
          4: ["c:occ:row4", false, "", ""],
          5: ["c:occ:row5", false, "", ""],
          6: ["c:occ:row6", false, "", ""],
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

function trackingEndpoints(calls: string[]): Endpoints {
  return {
    occupancy_updateTermsSelect: {
      action: (_ss, { isChecked }) => {
        calls.push(`twoWay:${isChecked}`);
      },
      runsOnUncheck: true,
    },
    occupancy_buildLedgerTimeLastRan: {
      action: () => {
        calls.push("button");
      },
    },
  };
}

function actionRowWrites(
  calls: GoogleAppsScript.Sheets.Schema.BatchUpdateSpreadsheetRequest[],
) {
  return calls
    .flatMap((call) => call.requests ?? [])
    .filter(
      (request) =>
        request.updateCells?.range?.startRowIndex === ACTION_ROW_INDEX,
    )
    .map((request) => ({
      colIndex: request.updateCells?.range?.startColumnIndex,
      value: request.updateCells?.rows?.[0]?.values?.[0]?.userEnteredValue,
    }));
}

beforeEach(() => {
  stubPropertiesService({ realEstateSpreadsheetId: "test-spreadsheet-id" });
  stubLogger();
});

describe("Api.isSuspectedApiCall", () => {
  it("accepts an unchecked action-row checkbox, so a two-way entry can deselect", () => {
    expect(
      Api.isSuspectedApiCall(actionRowEdit(TWO_WAY_COL_INDEX, "FALSE")),
    ).toBe(true);
    expect(
      Api.isSuspectedApiCall(actionRowEdit(TWO_WAY_COL_INDEX, "TRUE")),
    ).toBe(true);
  });
  it("ignores an action-row edit that isn't a checkbox", () => {
    expect(
      Api.isSuspectedApiCall(actionRowEdit(TWO_WAY_COL_INDEX, "some text")),
    ).toBe(false);
  });
});

describe("Api.handleSheetOnEditEvent, endpoint dispatch", () => {
  it("runs the entry registered under the edited column's full name", () => {
    const calls: string[] = [];
    stubOccupancySheet();

    Api.init(trackingEndpoints(calls)).handleSheetOnEditEvent(
      actionRowEdit(BUTTON_COL_INDEX, "TRUE"),
    );

    expect(calls).toEqual(["button"]);
  });

  it("does nothing for a column with no registered entry", () => {
    const calls: string[] = [];
    const { batchUpdateCalls } = stubOccupancySheet();

    Api.init(trackingEndpoints(calls)).handleSheetOnEditEvent(
      actionRowEdit(ID_COL_INDEX, "TRUE"),
    );

    expect(calls).toEqual([]);
    expect(batchUpdateCalls).toEqual([]);
  });

  it("does nothing for a table column that has no column id yet", () => {
    const calls: string[] = [];
    const { batchUpdateCalls } = stubOccupancySheet();

    Api.init(trackingEndpoints(calls)).handleSheetOnEditEvent(
      actionRowEdit(BLANK_ID_COL_INDEX, "TRUE"),
    );

    expect(calls).toEqual([]);
    expect(batchUpdateCalls).toEqual([]);
  });

  it("ignores an untick for an entry that does not run on uncheck", () => {
    const calls: string[] = [];
    stubOccupancySheet();

    Api.init(trackingEndpoints(calls)).handleSheetOnEditEvent(
      actionRowEdit(BUTTON_COL_INDEX, "FALSE"),
    );

    expect(calls).toEqual([]);
  });

  it("runs an entry that declares runsOnUncheck on both tick and untick", () => {
    const calls: string[] = [];
    stubOccupancySheet();
    const api = Api.init(trackingEndpoints(calls));

    api.handleSheetOnEditEvent(actionRowEdit(TWO_WAY_COL_INDEX, "TRUE"));
    api.handleSheetOnEditEvent(actionRowEdit(TWO_WAY_COL_INDEX, "FALSE"));

    expect(calls).toEqual(["twoWay:true", "twoWay:false"]);
  });
});

describe("Api.handleSheetOnEditEvent, the entry checkbox", () => {
  it("clears a button's checkbox so it is ready for the next click", () => {
    const { batchUpdateCalls } = stubOccupancySheet();

    Api.init(trackingEndpoints([])).handleSheetOnEditEvent(
      actionRowEdit(BUTTON_COL_INDEX, "TRUE"),
    );

    expect(actionRowWrites(batchUpdateCalls)).toEqual([
      { colIndex: BUTTON_COL_INDEX, value: { boolValue: false } },
    ]);
  });

  it("leaves a two-way entry's checkbox where the operator put it", () => {
    const { batchUpdateCalls } = stubOccupancySheet();

    Api.init(trackingEndpoints([])).handleSheetOnEditEvent(
      actionRowEdit(TWO_WAY_COL_INDEX, "TRUE"),
    );

    expect(actionRowWrites(batchUpdateCalls)).toEqual([]);
  });

  it("costs one read and one write for an entry that reports nothing", () => {
    const { batchUpdateCalls, getByDataFilterCalls } = stubOccupancySheet();

    Api.init(trackingEndpoints([])).handleSheetOnEditEvent(
      actionRowEdit(BUTTON_COL_INDEX, "TRUE"),
    );

    expect(getByDataFilterCalls).toHaveLength(1);
    expect(batchUpdateCalls).toHaveLength(1);
  });
});
