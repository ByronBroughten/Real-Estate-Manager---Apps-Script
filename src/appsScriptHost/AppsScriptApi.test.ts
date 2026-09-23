import { beforeEach, describe, expect, it, vi } from "vitest";
import { installedConfigs } from "../01_SpreadsheetSchema/configRegister";
import { columnConfigs } from "../01_SpreadsheetSchema/generated/columnConfigs";
import { sheetConfigs } from "../01_SpreadsheetSchema/generated/sheetConfigs";
import { spreadsheetConfig } from "../01_SpreadsheetSchema/generated/spreadsheetConfig";
import {
  stubLogger,
  stubPropertiesService,
  stubScriptAndSpreadsheetApp,
} from "../testSupport/fakeAppsScriptGlobals";
import {
  buildGridRows,
  stubSheetsService,
} from "../testSupport/fakeSheetsService";
import { AppsScriptApi } from "./AppsScriptApi";

const occupancyGid = sheetConfigs.occupancy.sheetGid;
const buildLedgerColIndex = 1;
const configs = installedConfigs();

// Google's event rows and columns are 1-based.
function onEditEvent(
  sheetGid: number,
  rowIndexBase0: number,
  colIndexBase0: number,
  value: string,
): GoogleAppsScript.Events.SheetsOnEdit {
  return {
    range: {
      getSheet: () => ({ getSheetId: () => sheetGid }),
      getRow: () => rowIndexBase0 + 1,
      getColumn: () => colIndexBase0 + 1,
    },
    value,
  } as unknown as GoogleAppsScript.Events.SheetsOnEdit;
}

function onChangeEvent(
  changeType: GoogleAppsScript.Events.SheetsOnChange["changeType"],
): GoogleAppsScript.Events.SheetsOnChange {
  return { changeType } as GoogleAppsScript.Events.SheetsOnChange;
}

beforeEach(() => {
  stubLogger();
});

describe("AppsScriptApi.handleSheetEdit", () => {
  it("decodes the event and dispatches an action-row tick through the run", () => {
    const c = columnConfigs.occupancy;
    stubSheetsService({
      sheets: [
        {
          sheetId: occupancyGid,
          title: "Occupancy",
          rows: buildGridRows({
            0: [c.id.columnId, c.buildLedgerTimeLastRan.columnId],
            3: ["ID", "Build ledger, time last ran"],
            4: ["c:occ:row4", ""],
          }),
          table: { endRowIndex: 5 },
        },
      ],
    });
    const calls: string[] = [];
    AppsScriptApi.handleSheetEdit(
      {
        configs,
        endpoints: {
          occupancy_buildLedgerTimeLastRan: {
            action: () => {
              calls.push("buildLedger");
            },
          },
        },
      },
      onEditEvent(
        occupancyGid,
        spreadsheetConfig.actionRowIndexBase0,
        buildLedgerColIndex,
        "TRUE",
      ),
    );
    expect(calls).toEqual(["buildLedger"]);
  });
});

describe("AppsScriptApi.handleSheetChange", () => {
  it("toasts the floor's message for a renamed Value Config", () => {
    stubSheetsService({
      sheets: [{ sheetId: sheetConfigs.valueConfig.sheetGid, title: "Values" }],
    });
    const { toasts } = stubScriptAndSpreadsheetApp();
    AppsScriptApi.handleSheetChange(
      { configs, endpoints: {} },
      onChangeEvent("OTHER"),
    );
    expect(toasts).toEqual([
      "Value Config's tab title is managed and will revert to Value Config on the next config sync.",
    ]);
  });
  it("shows no toast for a change type the platform module doesn't name", () => {
    const { toasts } = stubScriptAndSpreadsheetApp();
    AppsScriptApi.handleSheetChange(
      { configs, endpoints: {} },
      onChangeEvent("EDIT"),
    );
    expect(toasts).toEqual([]);
  });
  it("installs Google Sheets as the source when none is installed", async () => {
    vi.resetModules();
    const fresh = await import("./AppsScriptApi");
    stubPropertiesService();
    expect(() =>
      fresh.AppsScriptApi.handleSheetChange(
        { configs, endpoints: {} },
        onChangeEvent("OTHER"),
      ),
    ).toThrow("realEstateSpreadsheetId");
  });
});
