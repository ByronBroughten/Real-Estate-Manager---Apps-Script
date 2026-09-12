import { describe, expect, it, vi } from "vitest";
import { ssConfigGet } from "../01_generatedConfigs/spreadsheetConfigTypes";
import { SpreadsheetRaw } from "../02_SpreadsheetRaw/SpreadsheetRaw";
import { NodeHost } from "./NodeHost";
import type { SheetsHttpRequest } from "./SheetsServiceNode";

const SPREADSHEET_ID = "spreadsheet-under-test";
const LEASES_GID = 111;

const leasesPayload = {
  sheets: [
    {
      properties: { sheetId: LEASES_GID, title: "Leases" },
      tables: [
        {
          tableId: "fake-table",
          range: {
            startRowIndex: ssConfigGet("headerRowIndexBase0"),
            endRowIndex: 11,
            startColumnIndex: ssConfigGet("startTableColIndexBase0"),
            endColumnIndex: 5,
          },
        },
      ],
    },
  ],
};

function seedHost(isDryRun: boolean) {
  const transport = vi.fn((_request: SheetsHttpRequest) => leasesPayload);
  const host = NodeHost.init({
    spreadsheetId: SPREADSHEET_ID,
    transport,
    isDryRun,
    log: vi.fn(),
  }).ensureGlobals();
  return { host, transport };
}

function writeOneCell(): SpreadsheetRaw {
  const raw = SpreadsheetRaw.init();
  raw.fetchAllSheetProperties();
  raw.sheet(LEASES_GID).row(5).cell(2).updateValue("Processing...");
  raw.batchUpdateGSheets();
  return raw;
}

describe("NodeHost.ensureGlobals", () => {
  it("runs the framework's read against the live spreadsheet while a dry run is armed", () => {
    const { transport } = seedHost(true);

    SpreadsheetRaw.init().fetchAllSheetProperties();

    expect(transport).toHaveBeenCalledTimes(1);
    expect(transport.mock.calls[0]?.[0].method).toBe("GET");
  });

  it("puts no write on the wire while a dry run is armed, whoever calls the flush", () => {
    const { host, transport } = seedHost(true);

    writeOneCell();

    expect(
      transport.mock.calls.filter(([request]) => request.method === "POST"),
    ).toEqual([]);
    expect(host.summary.count).toBe(1);
    expect(host.summary.lines[0]).toContain(`gid ${LEASES_GID}!C6:C6`);
  });

  it("sends the write once the dry run is not armed", () => {
    const { host, transport } = seedHost(false);

    writeOneCell();

    const posts = transport.mock.calls.filter(
      ([request]) => request.method === "POST",
    );
    expect(posts).toHaveLength(1);
    expect(posts[0]?.[0].url).toContain(":batchUpdate");
    expect(host.summary.count).toBe(1);
  });

  it("serves the spreadsheet id the framework reads from its script property", () => {
    seedHost(true);

    expect(SpreadsheetRaw.init().spreadsheetId).toBe(SPREADSHEET_ID);
  });
});
