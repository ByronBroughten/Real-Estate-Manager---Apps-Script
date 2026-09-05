import { beforeEach, describe, expect, it } from "vitest";
import { columnConfigs } from "../01_generatedConfigs/columnConfigs";
import { getColumnTraitByName } from "../01_generatedConfigs/columnConfigsTypes";
import { sheetConfigs } from "../01_generatedConfigs/sheetConfigs";
import {
  configSheetNames,
  getSheetTraitByName,
} from "../01_generatedConfigs/sheetConfigsTypes";
import {
  isInTnGroup,
  type SheetNameWithIdColumn,
} from "../04_SpreadsheetNamed/SheetNameGroups";
import {
  stubLogger,
  stubPropertiesService,
} from "../testSupport/fakeAppsScriptGlobals";
import {
  buildGridRows,
  stubSheetsService,
  type FakeSheetProperties,
} from "../testSupport/fakeSheetsService";
import { assertType, type IsExactly } from "../testSupport/typeAssertions";
import { FillRowIdsEndpoint } from "./FillRowIdsEndpoint";

type BatchUpdateCall =
  GoogleAppsScript.Sheets.Schema.BatchUpdateSpreadsheetRequest;

const CONTROLS_GID = sheetConfigs.spreadsheetControls.sheetGid;
const c = columnConfigs.spreadsheetControls;

const columnIds = [
  c.fillRowIdsRunStatus.columnId,
  c.syncConfigSheetRowsTimeLastRan.columnId,
  c.syncConfigSheetRowsRunStatus.columnId,
  c.tableControlsSpace.columnId,
  c.fillRowIdsTimeLastRan.columnId,
];
const RUN_STATUS_COL_INDEX = 0;
const TIME_LAST_RAN_COL_INDEX = 4;
const STATUS_ROW_INDEX = 4;

const LIGHT_YELLOW = { red: 1, green: 0.949, blue: 0.8 };
const LIGHT_GREEN = { red: 0.851, green: 0.918, blue: 0.827 };
const LIGHT_RED = { red: 0.957, green: 0.8, blue: 0.8 };

const TIMESTAMP = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

function controlsSheet(): FakeSheetProperties {
  return {
    sheetId: CONTROLS_GID,
    title: "Spreadsheet Controls",
    rows: buildGridRows({
      0: columnIds,
      3: columnIds.map((_, colIndex) => `Header ${colIndex}`),
      [STATUS_ROW_INDEX]: [],
    }),
    // A data row that was never written is omitted from the response entirely.
    rowsWithNoGridData: [STATUS_ROW_INDEX],
    table: { endRowIndex: STATUS_ROW_INDEX + 1 },
  };
}

// Omitting these is what makes the failure test's run throw on its own.
function sheetsWithIdColumns(): FakeSheetProperties[] {
  return configSheetNames
    .filter((sheetName): sheetName is SheetNameWithIdColumn =>
      isInTnGroup("hasIdColumn", sheetName),
    )
    .map((sheetName) => ({
      sheetId: getSheetTraitByName(sheetName, "sheetGid"),
      title: sheetName,
      rows: buildGridRows({
        0: [getColumnTraitByName(sheetName, "id", "columnId")],
        [STATUS_ROW_INDEX]: [
          `${getSheetTraitByName(sheetName, "idPrefix")}:seeded`,
        ],
      }),
      table: { endRowIndex: STATUS_ROW_INDEX + 1 },
    }));
}

function statusCellWrites(calls: BatchUpdateCall[], colIndex: number) {
  return calls
    .flatMap((call) => call.requests ?? [])
    .filter((request) => {
      const range = request.updateCells?.range;
      return (
        range?.sheetId === CONTROLS_GID &&
        range.startRowIndex === STATUS_ROW_INDEX &&
        range.startColumnIndex === colIndex
      );
    })
    .map((request) => {
      const cell = request.updateCells?.rows?.[0]?.values?.[0];
      return {
        value: cell?.userEnteredValue?.stringValue,
        backgroundColor: cell?.userEnteredFormat?.backgroundColor,
      };
    });
}

function runEndpoint(sheets: FakeSheetProperties[]) {
  const { batchUpdateCalls } = stubSheetsService({ sheets });
  FillRowIdsEndpoint.init(
    FillRowIdsEndpoint.initSpreadsheetNamedProps(),
  ).execute();
  return batchUpdateCalls;
}

beforeEach(() => {
  stubPropertiesService({ realEstateSpreadsheetId: "test-spreadsheet-id" });
  stubLogger();
});

describe("FillRowIdsEndpoint.onRunSetup", () => {
  it("writes its status cells even when the controls data row comes back with no grid data", () => {
    const { batchUpdateCalls } = stubSheetsService({
      sheets: [controlsSheet()],
    });

    FillRowIdsEndpoint.init(
      FillRowIdsEndpoint.initSpreadsheetNamedProps(),
    ).onRunSetup();

    const requests = batchUpdateCalls.flatMap((call) => call.requests ?? []);
    const updatedRowIndexes = new Set(
      requests.map((request) => request.updateCells?.range?.startRowIndex),
    );
    expect(updatedRowIndexes).toContain(STATUS_ROW_INDEX);
  });
});

describe("FillRowIdsEndpoint.execute, a run that succeeds", () => {
  it("says Running… then Succeeded in the run status cell", () => {
    const calls = runEndpoint([controlsSheet(), ...sheetsWithIdColumns()]);

    expect(statusCellWrites(calls, RUN_STATUS_COL_INDEX)).toEqual([
      { value: "Running…", backgroundColor: undefined },
      { value: "Succeeded", backgroundColor: undefined },
    ]);
  });

  it("stamps the start time yellow, then recolours it green without rewriting it", () => {
    const calls = runEndpoint([controlsSheet(), ...sheetsWithIdColumns()]);
    const writes = statusCellWrites(calls, TIME_LAST_RAN_COL_INDEX);

    expect(writes[0]?.value).toMatch(TIMESTAMP);
    expect(writes[0]?.backgroundColor).toEqual(LIGHT_YELLOW);
    expect(writes[1]).toEqual({
      value: undefined,
      backgroundColor: LIGHT_GREEN,
    });
    expect(writes).toHaveLength(2);
  });

  it("reaches the sheet with the running state before the work begins", () => {
    const calls = runEndpoint([controlsSheet(), ...sheetsWithIdColumns()]);

    expect(statusCellWrites(calls.slice(0, 1), RUN_STATUS_COL_INDEX)).toEqual([
      { value: "Running…", backgroundColor: undefined },
    ]);
  });

  it("costs two write round trips", () => {
    expect(
      runEndpoint([controlsSheet(), ...sheetsWithIdColumns()]),
    ).toHaveLength(2);
  });
});

describe("FillRowIdsEndpoint.execute, a run that fails", () => {
  it("says Running… then the error text in the run status cell", () => {
    const calls = runEndpoint([controlsSheet()]);
    const writes = statusCellWrites(calls, RUN_STATUS_COL_INDEX);

    expect(writes[0]).toEqual({
      value: "Running…",
      backgroundColor: undefined,
    });
    expect(writes[1]?.value).toMatch(/^Error: /);
    expect(writes).toHaveLength(2);
  });

  it("stamps the start time yellow, then recolours it red without rewriting it", () => {
    const calls = runEndpoint([controlsSheet()]);
    const writes = statusCellWrites(calls, TIME_LAST_RAN_COL_INDEX);

    expect(writes[0]?.value).toMatch(TIMESTAMP);
    expect(writes[0]?.backgroundColor).toEqual(LIGHT_YELLOW);
    expect(writes[1]).toEqual({ value: undefined, backgroundColor: LIGHT_RED });
    expect(writes).toHaveLength(2);
  });
});

describe("FillRowIdsEndpoint, status column names derived from its stem", () => {
  it("resolves both to their exact column names", () => {
    const endpoint = FillRowIdsEndpoint.init(
      FillRowIdsEndpoint.initSpreadsheetNamedProps(),
    );
    assertType<
      IsExactly<typeof endpoint.timeLastRanName, "fillRowIdsTimeLastRan">
    >(true);
    assertType<IsExactly<typeof endpoint.runStatusName, "fillRowIdsRunStatus">>(
      true,
    );
    expect([endpoint.timeLastRanName, endpoint.runStatusName]).toEqual([
      "fillRowIdsTimeLastRan",
      "fillRowIdsRunStatus",
    ]);
  });
});
