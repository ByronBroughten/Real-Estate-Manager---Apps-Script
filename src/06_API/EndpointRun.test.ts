import { beforeEach, describe, expect, it } from "vitest";
import { columnConfigs } from "../01_generatedConfigs/columnConfigs";
import { sheetConfigs } from "../01_generatedConfigs/sheetConfigs";
import { SpreadsheetNamedBase } from "../04_SpreadsheetNamed/ClassBases/SpreadsheetNamedBase";
import {
  stubLogger,
  stubPropertiesService,
} from "../testSupport/fakeAppsScriptGlobals";
import {
  buildGridRows,
  stubSheetsService,
} from "../testSupport/fakeSheetsService";
import { EndpointRun } from "./EndpointRun";
import type { Endpoint } from "./Endpoints";

type BatchUpdateCall =
  GoogleAppsScript.Sheets.Schema.BatchUpdateSpreadsheetRequest;

const OCCUPANCY_GID = sheetConfigs.occupancy.sheetGid;
const c = columnConfigs.occupancy;
const columnIds = [
  c.id.columnId,
  c.buildLedgerSelect.columnId,
  c.buildLedgerTimeLastRan.columnId,
  c.buildLedgerRunStatus.columnId,
];
const headers = [
  "ID",
  "Build ledger, select",
  "Build ledger, time last ran",
  "Build ledger, run status",
];
const SELECTOR_COL_INDEX = 1;
const TIME_LAST_RAN_COL_INDEX = 2;
const RUN_STATUS_COL_INDEX = 3;
const TOP_DATA_ROW_INDEX = 4;
const END_ROW_INDEX = 9;

const LIGHT_YELLOW = { red: 1, green: 0.949, blue: 0.8 };
const LIGHT_GREEN = { red: 0.851, green: 0.918, blue: 0.827 };
const LIGHT_RED = { red: 0.957, green: 0.8, blue: 0.8 };

const TIMESTAMP = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

// Rows 4 and 6 are ticked; 5, 7 and 8 are the rows a selective run must not touch.
function stubOccupancySheet(checkedRowIndexes: number[] = [4, 6]) {
  const dataRow = (rowIndex: number) => [
    `r:occ:row${rowIndex}`,
    checkedRowIndexes.includes(rowIndex),
    "",
    "",
  ];
  return stubSheetsService({
    sheets: [
      {
        sheetId: OCCUPANCY_GID,
        title: "Occupancy",
        rows: buildGridRows({
          0: columnIds,
          3: headers,
          4: dataRow(4),
          5: dataRow(5),
          6: dataRow(6),
          7: dataRow(7),
          8: dataRow(8),
        }),
        table: { endRowIndex: END_ROW_INDEX },
      },
    ],
  });
}

// Row 6 is the blank row an emptied-then-refilled sheet would be left with.
function stubOccupancySheetWithBlankRow() {
  const dataRow = (rowIndex: number) => [`r:occ:row${rowIndex}`, false, "", ""];
  return stubSheetsService({
    sheets: [
      {
        sheetId: OCCUPANCY_GID,
        title: "Occupancy",
        rows: buildGridRows({
          0: columnIds,
          3: headers,
          4: dataRow(4),
          5: dataRow(5),
          6: [null, null, null, null],
          7: dataRow(7),
          8: dataRow(8),
        }),
        table: { endRowIndex: END_ROW_INDEX },
      },
    ],
  });
}

function runEndpoint(endpoint: Endpoint<"occupancy">, isChecked = true) {
  const run = new EndpointRun({
    ...SpreadsheetNamedBase.initSpreadsheetNamedProps(),
    sheetName: "occupancy",
    entryColumnName: "buildLedgerTimeLastRan",
    endpoint,
  });
  run.sheet.indexed.meta.ensureColumnIdsAreFetched();
  run.run(isChecked);
}

function reportingEndpoint(
  action: Endpoint<"occupancy">["action"],
): Endpoint<"occupancy"> {
  return {
    action,
    timeLastRan: "buildLedgerTimeLastRan",
    runStatus: "buildLedgerRunStatus",
  };
}

function selectiveEndpoint(
  action: Endpoint<"occupancy">["action"],
): Endpoint<"occupancy"> {
  return { ...reportingEndpoint(action), selector: "buildLedgerSelect" };
}

function noOp() {}

function fillsFor(calls: BatchUpdateCall[], colIndex: number) {
  return calls
    .flatMap((call) => call.requests ?? [])
    .filter(
      (request) => request.repeatCell?.range?.startColumnIndex === colIndex,
    )
    .map((request) => ({
      startRowIndex: request.repeatCell?.range?.startRowIndex,
      endRowIndex: request.repeatCell?.range?.endRowIndex,
      value: request.repeatCell?.cell?.userEnteredValue?.stringValue,
      backgroundColor:
        request.repeatCell?.cell?.userEnteredFormat?.backgroundColor,
    }));
}

function touchedRowIndexes(calls: BatchUpdateCall[]): number[] {
  const rowIndexes = calls
    .flatMap((call) => call.requests ?? [])
    .flatMap((request) => {
      const range = request.repeatCell?.range ?? request.updateCells?.range;
      const start = range?.startRowIndex ?? 0;
      const end = range?.endRowIndex ?? start + 1;
      return Array.from({ length: end - start }, (_, i) => start + i);
    })
    .filter((rowIndex) => rowIndex >= TOP_DATA_ROW_INDEX);
  return [...new Set(rowIndexes)].sort((a, b) => a - b);
}

beforeEach(() => {
  stubPropertiesService({ realEstateSpreadsheetId: "test-spreadsheet-id" });
  stubLogger();
});

describe("EndpointRun.run, an endpoint with a selector", () => {
  it("stamps the run status into the selected rows only", () => {
    const { batchUpdateCalls } = stubOccupancySheet();

    runEndpoint(selectiveEndpoint(noOp));

    expect(fillsFor(batchUpdateCalls, RUN_STATUS_COL_INDEX)).toEqual([
      {
        startRowIndex: 4,
        endRowIndex: 5,
        value: "Running…",
        backgroundColor: undefined,
      },
      {
        startRowIndex: 6,
        endRowIndex: 7,
        value: "Running…",
        backgroundColor: undefined,
      },
      {
        startRowIndex: 4,
        endRowIndex: 5,
        value: "Succeeded",
        backgroundColor: undefined,
      },
      {
        startRowIndex: 6,
        endRowIndex: 7,
        value: "Succeeded",
        backgroundColor: undefined,
      },
    ]);
  });

  it("leaves every unselected row completely untouched", () => {
    const { batchUpdateCalls } = stubOccupancySheet();

    runEndpoint(selectiveEndpoint(noOp));

    expect(touchedRowIndexes(batchUpdateCalls)).toEqual([4, 6]);
  });

  it("hands the action exactly the rows it stamps", () => {
    stubOccupancySheet();
    let received: number[] = [];

    runEndpoint(
      selectiveEndpoint((_ss, { selectedRowIndexes }) => {
        received = selectedRowIndexes;
      }),
    );

    expect(received).toEqual([4, 6]);
  });

  it("shows the run state on every selected row's start-time cell", () => {
    const { batchUpdateCalls } = stubOccupancySheet();

    runEndpoint(selectiveEndpoint(noOp));
    const writes = fillsFor(batchUpdateCalls, TIME_LAST_RAN_COL_INDEX);

    expect(writes[0]?.value).toMatch(TIMESTAMP);
    expect(writes[0]?.backgroundColor).toEqual(LIGHT_YELLOW);
    expect(writes[1]?.value).toMatch(TIMESTAMP);
    expect(writes[1]?.backgroundColor).toEqual(LIGHT_YELLOW);
    expect(writes.slice(2)).toEqual([
      {
        startRowIndex: 4,
        endRowIndex: 5,
        value: undefined,
        backgroundColor: LIGHT_GREEN,
      },
      {
        startRowIndex: 6,
        endRowIndex: 7,
        value: undefined,
        backgroundColor: LIGHT_GREEN,
      },
    ]);
  });

  it("reads the selection without a round trip of its own", () => {
    const { getByDataFilterCalls } = stubOccupancySheet();

    runEndpoint(selectiveEndpoint(noOp));

    expect(getByDataFilterCalls).toHaveLength(2);
  });
});

describe("EndpointRun.run, an endpoint with no selector", () => {
  it("stamps every table data row through a single fill per state", () => {
    const { batchUpdateCalls } = stubOccupancySheet();

    runEndpoint(reportingEndpoint(noOp));
    const writes = fillsFor(batchUpdateCalls, TIME_LAST_RAN_COL_INDEX);

    expect(writes[0]?.startRowIndex).toBe(TOP_DATA_ROW_INDEX);
    expect(writes[0]?.endRowIndex).toBe(END_ROW_INDEX);
    expect(writes[0]?.value).toMatch(TIMESTAMP);
    expect(writes[0]?.backgroundColor).toEqual(LIGHT_YELLOW);
  });

  it("writes the start time once and only recolours it afterwards", () => {
    const { batchUpdateCalls } = stubOccupancySheet();

    runEndpoint(reportingEndpoint(noOp));
    const writes = fillsFor(batchUpdateCalls, TIME_LAST_RAN_COL_INDEX);

    expect(writes[1]).toEqual({
      startRowIndex: TOP_DATA_ROW_INDEX,
      endRowIndex: END_ROW_INDEX,
      value: undefined,
      backgroundColor: LIGHT_GREEN,
    });
    expect(writes).toHaveLength(2);
  });

  it("tells the action about every data row", () => {
    stubOccupancySheet();
    let received: number[] = [];

    runEndpoint(
      reportingEndpoint((_ss, { selectedRowIndexes }) => {
        received = selectedRowIndexes;
      }),
    );

    expect(received).toEqual([4, 5, 6, 7, 8]);
  });

  it("costs no read of its own, since nothing is prepped", () => {
    const { getByDataFilterCalls } = stubOccupancySheet();

    runEndpoint(reportingEndpoint(noOp));

    expect(getByDataFilterCalls).toHaveLength(1);
  });

  it("keeps a blank row out of the rows it hands the action", () => {
    stubOccupancySheetWithBlankRow();
    let received: number[] = [];

    runEndpoint(
      reportingEndpoint((_ss, { selectedRowIndexes }) => {
        received = selectedRowIndexes;
      }),
    );

    expect(received).toEqual([4, 5, 7, 8]);
  });

  it("still stamps its status across the blank row, so an emptied sheet reports somewhere", () => {
    const { batchUpdateCalls } = stubOccupancySheetWithBlankRow();

    runEndpoint(reportingEndpoint(noOp));

    expect(fillsFor(batchUpdateCalls, RUN_STATUS_COL_INDEX)[0]).toEqual({
      startRowIndex: TOP_DATA_ROW_INDEX,
      endRowIndex: END_ROW_INDEX,
      value: "Running…",
      backgroundColor: undefined,
    });
  });
});

describe("EndpointRun.run, the run status message", () => {
  it("writes the action's returned string", () => {
    const { batchUpdateCalls } = stubOccupancySheet();

    runEndpoint(reportingEndpoint(() => "Built 5 ledgers"));

    expect(fillsFor(batchUpdateCalls, RUN_STATUS_COL_INDEX).at(-1)?.value).toBe(
      "Built 5 ledgers",
    );
  });

  it("writes Succeeded when the action returns nothing", () => {
    const { batchUpdateCalls } = stubOccupancySheet();

    runEndpoint(reportingEndpoint(noOp));

    expect(fillsFor(batchUpdateCalls, RUN_STATUS_COL_INDEX).at(-1)?.value).toBe(
      "Succeeded",
    );
  });
});

describe("EndpointRun.run, the two flushes", () => {
  it("puts the running state on the sheet before the work begins", () => {
    const { batchUpdateCalls } = stubOccupancySheet();

    runEndpoint(reportingEndpoint(noOp));

    expect(
      fillsFor(batchUpdateCalls.slice(0, 1), RUN_STATUS_COL_INDEX).map(
        (write) => write.value,
      ),
    ).toEqual(["Running…"]);
    expect(batchUpdateCalls).toHaveLength(2);
  });
});

describe("EndpointRun.run, an endpoint declaring no feedback columns", () => {
  it("emits no stamp at all", () => {
    const { batchUpdateCalls } = stubOccupancySheet();

    runEndpoint({ action: noOp, selector: "buildLedgerSelect" });

    expect(fillsFor(batchUpdateCalls, TIME_LAST_RAN_COL_INDEX)).toEqual([]);
    expect(fillsFor(batchUpdateCalls, RUN_STATUS_COL_INDEX)).toEqual([]);
  });
});

describe("EndpointRun.run, a run that fails", () => {
  // Reading a row past the table's last one is a real read on real state.
  function failingAction(ss: Parameters<Endpoint<"occupancy">["action"]>[0]) {
    ss.sheet("occupancy").row(4).cell("id").updateValue("r:occ:written");
    ss.sheet("occupancy").row(END_ROW_INDEX).value("id");
  }

  it("writes the error text and red to the selected rows only", () => {
    const { batchUpdateCalls } = stubOccupancySheet();

    runEndpoint(selectiveEndpoint(failingAction));

    expect(fillsFor(batchUpdateCalls, RUN_STATUS_COL_INDEX).slice(2)).toEqual([
      {
        startRowIndex: 4,
        endRowIndex: 5,
        value: expect.stringMatching(/^Error: /) as string,
        backgroundColor: undefined,
      },
      {
        startRowIndex: 6,
        endRowIndex: 7,
        value: expect.stringMatching(/^Error: /) as string,
        backgroundColor: undefined,
      },
    ]);
    expect(
      fillsFor(batchUpdateCalls, TIME_LAST_RAN_COL_INDEX).slice(2),
    ).toEqual([
      {
        startRowIndex: 4,
        endRowIndex: 5,
        value: undefined,
        backgroundColor: LIGHT_RED,
      },
      {
        startRowIndex: 6,
        endRowIndex: 7,
        value: undefined,
        backgroundColor: LIGHT_RED,
      },
    ]);
  });

  it("discards what the action queued before it threw", () => {
    const { batchUpdateCalls } = stubOccupancySheet();

    runEndpoint(selectiveEndpoint(failingAction));

    const idWrites = batchUpdateCalls
      .flatMap((call) => call.requests ?? [])
      .filter((request) => request.updateCells?.range?.startColumnIndex === 0);
    expect(idWrites).toEqual([]);
  });
});

describe("EndpointRun.run, an empty selection", () => {
  it("runs no action and stamps nothing", () => {
    const { batchUpdateCalls } = stubOccupancySheet([]);
    const calls: string[] = [];

    runEndpoint(
      selectiveEndpoint(() => {
        calls.push("ran");
      }),
    );

    expect(calls).toEqual([]);
    expect(fillsFor(batchUpdateCalls, RUN_STATUS_COL_INDEX)).toEqual([]);
    expect(batchUpdateCalls).toHaveLength(1);
  });
});
