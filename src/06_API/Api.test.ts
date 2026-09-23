import { beforeEach, describe, expect, it, vi } from "vitest";
import { installedConfigs } from "../01_SpreadsheetSchema/configRegister";
import { columnConfigs } from "../01_SpreadsheetSchema/generated/columnConfigs";
import { sheetConfigs } from "../01_SpreadsheetSchema/generated/sheetConfigs";
import { spreadsheetConfig } from "../01_SpreadsheetSchema/generated/spreadsheetConfig";
import type { SheetEdit } from "../00_Source/PlatformEvents/sheetEdit";
import { stubLogger } from "../testSupport/fakeAppsScriptGlobals";
import {
  buildGridRows,
  stubSheetsService,
} from "../testSupport/fakeSheetsService";
import { Api } from "./Api";
import type { Endpoints } from "./Endpoints";

const occupancyGid = sheetConfigs.occupancy.sheetGid;
const c = columnConfigs.occupancy;
// The last column is deliberately left without a column id.
const columnIds = [
  c.id.columnId,
  c.updateTermsSelect.columnId,
  c.buildLedgerTimeLastRan.columnId,
  "",
];
const idColIndex = 0;
const twoWayColIndex = 1;
const buttonColIndex = 2;
const blankIdColIndex = 3;
const actionRowIndex = spreadsheetConfig.actionRowIndexBase0;
const endRowIndex = 7;

function stubOccupancySheet() {
  return stubSheetsService({
    sheets: [
      {
        sheetId: occupancyGid,
        title: "Occupancy",
        rows: buildGridRows({
          0: columnIds,
          3: ["ID", "Update terms, select", "Build ledger, time last ran", ""],
          4: ["c:occ:row4", false, "", ""],
          5: ["c:occ:row5", false, "", ""],
          6: ["c:occ:row6", false, "", ""],
        }),
        table: { endRowIndex },
      },
    ],
  });
}

function actionRowEdit(colIndex: number, value: string): SheetEdit {
  return {
    sheetGid: occupancyGid,
    rowIndexBase0: spreadsheetConfig.actionRowIndexBase0,
    colIndexBase0: colIndex,
    value,
  };
}

function trackingEndpoints(calls: string[]): Endpoints {
  return {
    occupancy_updateTermsSelect: {
      action: (_ss, { isChecked }) => {
        calls.push(`twoWay:${isChecked}`);
      },
      runOnUncheck: true,
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
      (request) => request.updateCells?.range?.startRowIndex === actionRowIndex,
    )
    .map((request) => ({
      colIndex: request.updateCells?.range?.startColumnIndex,
      value: request.updateCells?.rows?.[0]?.values?.[0]?.userEnteredValue,
    }));
}

beforeEach(() => {
  stubLogger();
});

const configs = installedConfigs();

describe("Api.handleSheetEdit, the entry call", () => {
  it("supplies the app's configs before anything reads them", async () => {
    vi.resetModules();
    const fresh = await import("./Api");
    const installSource = vi.fn();
    expect(() =>
      fresh.Api.handleSheetEdit(
        { configs, endpoints: {} },
        {
          ...actionRowEdit(twoWayColIndex, "TRUE"),
          rowIndexBase0: endRowIndex,
        },
        installSource,
      ),
    ).not.toThrow();
    expect(installSource).not.toHaveBeenCalled();
  });
  it("installs the source and dispatches a suspected API call", () => {
    stubOccupancySheet();
    const calls: string[] = [];
    const installSource = vi.fn();
    Api.handleSheetEdit(
      { configs, endpoints: trackingEndpoints(calls) },
      actionRowEdit(buttonColIndex, "TRUE"),
      installSource,
    );
    expect(installSource).toHaveBeenCalledOnce();
    expect(calls).toEqual(["button"]);
  });
});

describe("Api.handleSheetChange", () => {
  it("does nothing for a change the platform module doesn't name", () => {
    const installSource = vi.fn();
    expect(
      Api.handleSheetChange({ configs, endpoints: {} }, null, installSource),
    ).toBeNull();
    expect(installSource).not.toHaveBeenCalled();
  });
  it("installs the source and returns the floor's toast for a renamed Value Config", () => {
    stubSheetsService({
      sheets: [{ sheetId: sheetConfigs.valueConfig.sheetGid, title: "Values" }],
    });
    const installSource = vi.fn();
    expect(
      Api.handleSheetChange({ configs, endpoints: {} }, "other", installSource),
    ).toBe(
      "Value Config's tab title is managed and will revert to Value Config on the next config sync.",
    );
    expect(installSource).toHaveBeenCalledOnce();
  });
  it("returns no toast when the floor tabs are intact", () => {
    stubSheetsService({
      sheets: [
        { sheetId: sheetConfigs.valueConfig.sheetGid, title: "Value Config" },
      ],
    });
    expect(
      Api.handleSheetChange({ configs, endpoints: {} }, "other", vi.fn()),
    ).toBeNull();
  });
});

describe("Api.isSuspectedApiCall", () => {
  it("accepts an unchecked action-row checkbox, so a two-way entry can deselect", () => {
    expect(Api.isSuspectedApiCall(actionRowEdit(twoWayColIndex, "FALSE"))).toBe(
      true,
    );
    expect(Api.isSuspectedApiCall(actionRowEdit(twoWayColIndex, "TRUE"))).toBe(
      true,
    );
  });
  it("ignores an action-row edit that isn't a checkbox", () => {
    expect(
      Api.isSuspectedApiCall(actionRowEdit(twoWayColIndex, "some text")),
    ).toBe(false);
  });
});

describe("Api.handleSheetEdit, endpoint dispatch", () => {
  it("runs the entry registered under the edited column's full name", () => {
    const calls: string[] = [];
    stubOccupancySheet();

    Api.init(trackingEndpoints(calls)).handleSheetEdit(
      actionRowEdit(buttonColIndex, "TRUE"),
    );

    expect(calls).toEqual(["button"]);
  });

  it("does nothing for a column with no registered entry", () => {
    const calls: string[] = [];
    const { batchUpdateCalls } = stubOccupancySheet();

    Api.init(trackingEndpoints(calls)).handleSheetEdit(
      actionRowEdit(idColIndex, "TRUE"),
    );

    expect(calls).toEqual([]);
    expect(batchUpdateCalls).toEqual([]);
  });

  it("does nothing for a table column that has no column id yet", () => {
    const calls: string[] = [];
    const { batchUpdateCalls } = stubOccupancySheet();

    Api.init(trackingEndpoints(calls)).handleSheetEdit(
      actionRowEdit(blankIdColIndex, "TRUE"),
    );

    expect(calls).toEqual([]);
    expect(batchUpdateCalls).toEqual([]);
  });

  it("ignores an untick for an entry that does not run on uncheck", () => {
    const calls: string[] = [];
    stubOccupancySheet();

    Api.init(trackingEndpoints(calls)).handleSheetEdit(
      actionRowEdit(buttonColIndex, "FALSE"),
    );

    expect(calls).toEqual([]);
  });

  it("runs an entry that declares runOnUncheck on both tick and untick", () => {
    const calls: string[] = [];
    stubOccupancySheet();
    const api = Api.init(trackingEndpoints(calls));

    api.handleSheetEdit(actionRowEdit(twoWayColIndex, "TRUE"));
    api.handleSheetEdit(actionRowEdit(twoWayColIndex, "FALSE"));

    expect(calls).toEqual(["twoWay:true", "twoWay:false"]);
  });
});

describe("Api.handleSheetEdit, the entry checkbox", () => {
  it("clears a button's checkbox so it is ready for the next click", () => {
    const { batchUpdateCalls } = stubOccupancySheet();

    Api.init(trackingEndpoints([])).handleSheetEdit(
      actionRowEdit(buttonColIndex, "TRUE"),
    );

    expect(actionRowWrites(batchUpdateCalls)).toEqual([
      { colIndex: buttonColIndex, value: { boolValue: false } },
    ]);
  });

  it("leaves a two-way entry's checkbox where the operator put it", () => {
    const { batchUpdateCalls } = stubOccupancySheet();

    Api.init(trackingEndpoints([])).handleSheetEdit(
      actionRowEdit(twoWayColIndex, "TRUE"),
    );

    expect(actionRowWrites(batchUpdateCalls)).toEqual([]);
  });

  it("costs one read and one write for an entry that reports nothing", () => {
    const { batchUpdateCalls, getByDataFilterCalls } = stubOccupancySheet();

    Api.init(trackingEndpoints([])).handleSheetEdit(
      actionRowEdit(buttonColIndex, "TRUE"),
    );

    expect(getByDataFilterCalls).toHaveLength(1);
    expect(batchUpdateCalls).toHaveLength(1);
  });
});
