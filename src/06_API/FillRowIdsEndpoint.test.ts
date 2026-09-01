import { beforeEach, describe, expect, it } from "vitest";
import { columnConfigs } from "../01_generatedConfigs/columnConfigs";
import {
  stubLogger,
  stubPropertiesService,
} from "../testSupport/fakeAppsScriptGlobals";
import {
  buildGridRows,
  stubSheetsService,
} from "../testSupport/fakeSheetsService";
import { FillRowIdsEndpoint } from "./FillRowIdsEndpoint";

const CONTROLS_GID = 1971630928;
const c = columnConfigs.spreadsheetControls;

const columnIds = [
  c.fillRowIdsErrorMessage.columnId,
  c.syncConfigSheetRowsTimeLastRan.columnId,
  c.syncConfigSheetRowsLastRanSucceeded.columnId,
  c.syncConfigSheetRowsErrorMessage.columnId,
  c.tableControlsSpace.columnId,
  c.fillRowIdsTimeLastRan.columnId,
  c.fillRowIdsLastRanSucceeded.columnId,
];

beforeEach(() => {
  stubPropertiesService({ realEstateSpreadsheetId: "test-spreadsheet-id" });
  stubLogger();
});

describe("FillRowIdsEndpoint.onRunSetup", () => {
  it("writes its status cells even when the controls data row comes back with no grid data", () => {
    const { batchUpdateCalls } = stubSheetsService({
      sheets: [
        {
          sheetId: CONTROLS_GID,
          title: "Spreadsheet Controls",
          rows: buildGridRows({
            0: columnIds,
            3: columnIds.map((_, colIndex) => `Header ${colIndex}`),
            4: [],
          }),
          // The status row is the sheet's only data row, and a never-written
          // one is omitted from the response entirely.
          rowsWithNoGridData: [4],
          table: { endRowIndex: 5 },
        },
      ],
    });

    FillRowIdsEndpoint.init(
      FillRowIdsEndpoint.initSpreadsheetNamedProps(),
    ).onRunSetup();

    const requests = batchUpdateCalls.flatMap((call) => call.requests ?? []);
    const updatedRowIndexes = new Set(
      requests.map((request) => request.updateCells?.range?.startRowIndex),
    );
    expect(updatedRowIndexes).toContain(4);
  });
});
