import { describe, expect, it, vi } from "vitest";
import type { GoogleUpdateRequest } from "../00_base/AppsScriptTypes";
import { SheetsServiceNode, type SheetsHttpRequest } from "./SheetsServiceNode";

const SPREADSHEET_ID = "spreadsheet-under-test";
const GRID_FIELDS = "sheets(properties(sheetId,title))";

function seedService(props: { isDryRun?: boolean } = {}) {
  const transport = vi.fn((_request: SheetsHttpRequest) => ({
    spreadsheetId: SPREADSHEET_ID,
  }));
  const reported: GoogleUpdateRequest[] = [];
  const service = SheetsServiceNode.init({
    spreadsheetId: SPREADSHEET_ID,
    transport,
    isDryRun: props.isDryRun ?? false,
    reportRequests: (requests) => reported.push(...requests),
  });
  return { service, transport, reported };
}

const updateCellRequest: GoogleUpdateRequest = {
  updateCells: {
    range: { sheetId: 111, startRowIndex: 5, endRowIndex: 6 },
    rows: [{ values: [{ userEnteredValue: { stringValue: "x" } }] }],
    fields: "userEnteredValue",
  },
};

describe("SheetsServiceNode.Spreadsheets.get", () => {
  it("sends one GET to the spreadsheet's REST URL, carrying the field mask", () => {
    const { service, transport } = seedService();

    service.Spreadsheets.get(SPREADSHEET_ID, { fields: GRID_FIELDS });

    expect(transport).toHaveBeenCalledTimes(1);
    expect(transport).toHaveBeenCalledWith({
      method: "GET",
      url:
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}` +
        `?fields=${encodeURIComponent(GRID_FIELDS)}`,
      body: null,
    });
  });

  it("hands the transport's parsed response straight back to the framework", () => {
    const { service } = seedService();

    expect(service.Spreadsheets.get(SPREADSHEET_ID)).toEqual({
      spreadsheetId: SPREADSHEET_ID,
    });
  });

  it("omits the query entirely when no field mask was asked for", () => {
    const { service, transport } = seedService();

    service.Spreadsheets.get(SPREADSHEET_ID);

    expect(transport.mock.calls[0]?.[0].url).toBe(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`,
    );
  });
});

describe("SheetsServiceNode.Spreadsheets.getByDataFilter", () => {
  it("posts the data-filter resource as the request body", () => {
    const { service, transport } = seedService();
    const resource = {
      dataFilters: [{ gridRange: { sheetId: 111 } }],
      includeGridData: true,
    };

    service.Spreadsheets.getByDataFilter(resource, SPREADSHEET_ID, {
      fields: GRID_FIELDS,
    });

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      url:
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}` +
        `:getByDataFilter?fields=${encodeURIComponent(GRID_FIELDS)}`,
      body: JSON.stringify(resource),
    });
  });
});

describe("SheetsServiceNode.Spreadsheets.batchUpdate", () => {
  it("posts the requests to the batchUpdate URL when the run is not a dry run", () => {
    const { service, transport } = seedService();

    service.Spreadsheets.batchUpdate(
      { requests: [updateCellRequest] },
      SPREADSHEET_ID,
    );

    expect(transport).toHaveBeenCalledWith({
      method: "POST",
      url: `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`,
      body: JSON.stringify({ requests: [updateCellRequest] }),
    });
  });

  it("sends nothing at all on a dry run, and reports what it withheld", () => {
    const { service, transport, reported } = seedService({ isDryRun: true });

    const response = service.Spreadsheets.batchUpdate(
      { requests: [updateCellRequest] },
      SPREADSHEET_ID,
    );

    expect(transport).not.toHaveBeenCalled();
    expect(reported).toEqual([updateCellRequest]);
    expect(response).toEqual({});
  });

  it("still reads from the live spreadsheet on a dry run", () => {
    const { service, transport } = seedService({ isDryRun: true });

    service.Spreadsheets.get(SPREADSHEET_ID);
    service.Spreadsheets.getByDataFilter({}, SPREADSHEET_ID);

    expect(transport).toHaveBeenCalledTimes(2);
  });

  it("refuses a spreadsheet id the host was not bound to", () => {
    const { service } = seedService();

    expect(() =>
      service.Spreadsheets.get("some-other-spreadsheet"),
    ).toThrowError(/bound to spreadsheet/);
  });
});
