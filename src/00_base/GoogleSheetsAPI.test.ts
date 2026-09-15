import { describe, expect, it, vi } from "vitest";
import { assertType, type IsExactly } from "../testSupport/typeAssertions";
import { GoogleSheetsAPI, type OpaqueRawRequest, type SheetsHttpRequest } from "./GoogleSheetsAPI";
import type { LocalWriteOperation } from "./RawSource";
import type { RgbColor } from "./RgbColor";

const SPREADSHEET_ID = "spreadsheet-under-test";
const LIGHT_GREEN: RgbColor = { red: 0.851, green: 0.918, blue: 0.827 };

type BatchUpdateRequest =
  GoogleAppsScript.Sheets.Schema.BatchUpdateSpreadsheetRequest;

function recordingSheets(payload: GoogleAppsScript.Sheets.Schema.Spreadsheet = {
  sheets: [],
}) {
  const batchUpdateCalls: BatchUpdateRequest[] = [];
  const getByDataFilterCalls: object[] = [];
  const getCalls: { spreadsheetId: string; fields?: string }[] = [];
  const sheets = {
    Spreadsheets: {
      get: (spreadsheetId: string, optionalArgs?: { fields?: string }) => {
        getCalls.push({ spreadsheetId, fields: optionalArgs?.fields });
        return payload;
      },
      getByDataFilter: (
        resource: object,
        _spreadsheetId: string,
        _optionalArgs?: { fields?: string },
      ) => {
        getByDataFilterCalls.push(resource);
        return payload;
      },
      batchUpdate: (resource: BatchUpdateRequest) => {
        batchUpdateCalls.push(resource);
        return {};
      },
    },
  };
  return {
    api: GoogleSheetsAPI.init(sheets),
    batchUpdateCalls,
    getByDataFilterCalls,
    getCalls,
  };
}

describe("GoogleSheetsAPI write mapping", () => {
  it("maps each local operation kind onto the Google request used today", () => {
    const { api, batchUpdateCalls } = recordingSheets();

    const operations: LocalWriteOperation[] = [
      {
        kind: "appendRows",
        sheetId: 111,
        tableId: "tbl",
        emptyRowCount: 2,
      },
      { kind: "insertColumn", sheetId: 111, startColumnIndex: 3 },
      {
        kind: "fill",
        sheetId: 111,
        colIndex: 2,
        startRowIndex: 4,
        endRowIndex: 6,
        value: "x",
        backgroundColor: LIGHT_GREEN,
      },
      {
        kind: "fill",
        sheetId: 111,
        colIndex: 2,
        startRowIndex: 4,
        endRowIndex: 6,
        formula: "=A4",
      },
      {
        kind: "updateCell",
        sheetId: 111,
        rowIndex: 5,
        colIndex: 2,
        value: "y",
      },
      {
        kind: "updateCell",
        sheetId: 111,
        rowIndex: 5,
        colIndex: 2,
        formula: "=B5",
        backgroundColor: LIGHT_GREEN,
      },
      {
        kind: "findReplace",
        terms: { find: "a", replacement: "b" },
        scope: { sheetId: 111 },
      },
      { kind: "deleteRows", sheetId: 111, startIndex: 8, endIndex: 9 },
      {
        kind: "sort",
        sheetId: 111,
        startRowIndex: 4,
        startColumnIndex: 0,
        colIdxToSortBy: 1,
        sortOrder: "ASCENDING",
      },
      { kind: "raw", request: { updateTable: { table: { tableId: "t" } } } },
    ];

    api.flush(SPREADSHEET_ID, operations);

    expect(batchUpdateCalls[0]?.requests).toEqual([
      {
        appendCells: {
          sheetId: 111,
          tableId: "tbl",
          rows: [{}, {}],
          fields: "userEnteredValue",
        },
      },
      {
        insertDimension: {
          range: {
            sheetId: 111,
            dimension: "COLUMNS",
            startIndex: 3,
            endIndex: 4,
          },
          inheritFromBefore: false,
        },
      },
      {
        repeatCell: {
          range: {
            sheetId: 111,
            startRowIndex: 4,
            endRowIndex: 6,
            startColumnIndex: 2,
            endColumnIndex: 3,
          },
          cell: {
            userEnteredValue: { stringValue: "x" },
            userEnteredFormat: { backgroundColor: LIGHT_GREEN },
          },
          fields: "userEnteredValue,userEnteredFormat.backgroundColor",
        },
      },
      {
        pasteData: {
          coordinate: { sheetId: 111, rowIndex: 4, columnIndex: 2 },
          data: `"=A4"\n"=A4"`,
          delimiter: "\t",
          type: "PASTE_FORMULA",
        },
      },
      {
        updateCells: {
          range: {
            sheetId: 111,
            startRowIndex: 5,
            endRowIndex: 6,
            startColumnIndex: 2,
            endColumnIndex: 3,
          },
          rows: [{ values: [{ userEnteredValue: { stringValue: "y" } }] }],
          fields: "userEnteredValue",
        },
      },
      {
        pasteData: {
          coordinate: { sheetId: 111, rowIndex: 5, columnIndex: 2 },
          data: `"=B5"`,
          delimiter: "\t",
          type: "PASTE_FORMULA",
        },
      },
      {
        updateCells: {
          range: {
            sheetId: 111,
            startRowIndex: 5,
            endRowIndex: 6,
            startColumnIndex: 2,
            endColumnIndex: 3,
          },
          rows: [
            {
              values: [
                { userEnteredFormat: { backgroundColor: LIGHT_GREEN } },
              ],
            },
          ],
          fields: "userEnteredFormat.backgroundColor",
        },
      },
      { findReplace: { find: "a", replacement: "b", sheetId: 111 } },
      {
        deleteDimension: {
          range: {
            sheetId: 111,
            dimension: "ROWS",
            startIndex: 8,
            endIndex: 9,
          },
        },
      },
      {
        sortRange: {
          range: { sheetId: 111, startRowIndex: 4, startColumnIndex: 0 },
          sortSpecs: [{ dimensionIndex: 1, sortOrder: "ASCENDING" }],
        },
      },
      { updateTable: { table: { tableId: "t" } } },
    ]);
  });

  it("sends no batchUpdate when the write list is empty", () => {
    const { api, batchUpdateCalls } = recordingSheets();

    api.flush(SPREADSHEET_ID, []);

    expect(batchUpdateCalls).toEqual([]);
  });

  it("passes an ordered raw request through last", () => {
    const { api, batchUpdateCalls } = recordingSheets();

    api.flush(SPREADSHEET_ID, [
      {
        kind: "updateCell",
        sheetId: 111,
        rowIndex: 1,
        colIndex: 0,
        value: "a",
      },
      { kind: "raw", request: { updateTable: { table: { tableId: "t" } } } },
    ]);

    expect(
      (batchUpdateCalls[0]?.requests ?? []).map((request) => Object.keys(request)[0]),
    ).toEqual(["updateCells", "updateTable"]);
  });
});

describe("GoogleSheetsAPI payload mapping", () => {
  it("maps a Google spreadsheet payload onto the Raw-facing snapshot", () => {
    const { api } = recordingSheets({
      sheets: [
        {
          properties: { sheetId: 111, title: "Leases" },
          tables: [
            {
              tableId: "tbl",
              range: {
                startRowIndex: 3,
                endRowIndex: 11,
                startColumnIndex: 0,
                endColumnIndex: 5,
              },
              columnProperties: [
                {
                  columnIndex: 1,
                  columnType: "CURRENCY",
                  dataValidationRule: {
                    condition: {
                      type: "ONE_OF_LIST",
                      values: [{ userEnteredValue: "Rent" }],
                    },
                  },
                },
              ],
            },
          ],
          data: [
            {
              startColumn: 0,
              startRow: 4,
              columnMetadata: [{}, {}],
              rowData: [
                {
                  values: [
                    { effectiveValue: { stringValue: "id-1" } },
                    {
                      effectiveValue: { numberValue: 12 },
                      userEnteredValue: { formulaValue: "=A4" },
                      effectiveFormat: { numberFormat: { type: "CURRENCY" } },
                      dataValidation: { condition: { type: "NUMBER_GREATER" } },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(api.fetchSheetProperties(SPREADSHEET_ID)).toEqual({
      sheets: [
        {
          sheetGid: 111,
          title: "Leases",
          tables: [
            {
              tableId: "tbl",
              startRowIndex: 3,
              endRowIndex: 11,
              startColumnIndex: 0,
              endColumnIndex: 5,
              columnProperties: [
                {
                  columnIndex: 1,
                  columnType: "CURRENCY",
                  dataValidationValues: ["Rent"],
                  dataValidationConditionType: "ONE_OF_LIST",
                },
              ],
            },
          ],
          gridBlocks: [
            {
              startColumn: 0,
              startRow: 4,
              columnCount: 2,
              rows: [
                {
                  cells: [
                    {
                      value: "id-1",
                      isFormula: false,
                      numberFormatType: undefined,
                      dataValidationConditionType: undefined,
                    },
                    {
                      value: 12,
                      isFormula: true,
                      numberFormatType: "CURRENCY",
                      dataValidationConditionType: "NUMBER_GREATER",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
  });
});

describe("GoogleSheetsAPI colour mapping", () => {
  it("maps the RGB record onto Google Color on the way out", () => {
    const { api, batchUpdateCalls } = recordingSheets();

    api.flush(SPREADSHEET_ID, [
      {
        kind: "updateCell",
        sheetId: 1,
        rowIndex: 0,
        colIndex: 0,
        backgroundColor: LIGHT_GREEN,
      },
    ]);

    expect(
      batchUpdateCalls[0]?.requests?.[0]?.updateCells?.rows?.[0]?.values?.[0]
        ?.userEnteredFormat?.backgroundColor,
    ).toEqual(LIGHT_GREEN);
  });

  it("maps Google Color back to the RGB record", () => {
    const { api } = recordingSheets({
      sheets: [
        {
          properties: { sheetId: 1, title: "Leases" },
          data: [
            {
              startColumn: 0,
              startRow: 0,
              columnMetadata: [{}],
              rowData: [
                {
                  values: [
                    {
                      effectiveValue: { stringValue: "x" },
                      userEnteredFormat: { backgroundColor: LIGHT_GREEN },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(
      api.fetchSheetProperties(SPREADSHEET_ID).sheets[0]?.gridBlocks?.[0]
        ?.rows[0]?.cells[0]?.backgroundColor,
    ).toEqual(LIGHT_GREEN);
  });
});

describe("GoogleSheetsAPI HTTP transport", () => {
  function seedApi(props: { isDryRun?: boolean } = {}) {
    const transport = vi.fn((_request: SheetsHttpRequest) => ({
      spreadsheetId: SPREADSHEET_ID,
      sheets: [],
    }));
    const reported: OpaqueRawRequest[] = [];
    const api = GoogleSheetsAPI.initHttp({
      spreadsheetId: SPREADSHEET_ID,
      transport,
      isDryRun: props.isDryRun ?? false,
      reportRequests: (requests) => reported.push(...requests),
    });
    return { api, transport, reported };
  }

  it("sends one GET for sheet properties, carrying the field mask", () => {
    const { api, transport } = seedApi();
    const fields =
      "sheets(properties(sheetId,title),tables(tableId,range))";

    api.fetchSheetProperties(SPREADSHEET_ID);

    expect(transport).toHaveBeenCalledWith({
      method: "GET",
      url:
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}` +
        `?fields=${encodeURIComponent(fields)}`,
      body: null,
    });
  });

  it("posts grid ranges as a getByDataFilter body", () => {
    const { api, transport } = seedApi();
    const gridRanges = [{ sheetId: 111, startRowIndex: 0 }];

    api.fetchGrid(SPREADSHEET_ID, gridRanges, {
      includeProgrammaticFacts: false,
    });

    expect(transport.mock.calls[0]?.[0].method).toBe("POST");
    expect(transport.mock.calls[0]?.[0].url).toContain(":getByDataFilter");
    expect(JSON.parse(transport.mock.calls[0]?.[0].body ?? "")).toEqual({
      dataFilters: [{ gridRange: gridRanges[0] }],
      includeGridData: true,
    });
  });

  it("posts mapped writes to batchUpdate when the run is not a dry run", () => {
    const { api, transport } = seedApi();

    api.flush(SPREADSHEET_ID, [
      {
        kind: "updateCell",
        sheetId: 111,
        rowIndex: 5,
        colIndex: 2,
        value: "x",
      },
    ]);

    expect(transport.mock.calls[0]?.[0].url).toContain(":batchUpdate");
    expect(JSON.parse(transport.mock.calls[0]?.[0].body ?? "").requests).toHaveLength(
      1,
    );
  });

  it("sends nothing at all on a dry run, and reports what it withheld", () => {
    const { api, transport, reported } = seedApi({ isDryRun: true });

    api.flush(SPREADSHEET_ID, [
      {
        kind: "updateCell",
        sheetId: 111,
        rowIndex: 5,
        colIndex: 2,
        value: "x",
      },
    ]);

    expect(transport).not.toHaveBeenCalled();
    expect(reported).toHaveLength(1);
    expect(reported[0]?.updateCells).toBeDefined();
  });

  it("still reads from the live spreadsheet on a dry run", () => {
    const { api, transport } = seedApi({ isDryRun: true });

    api.fetchSheetProperties(SPREADSHEET_ID);
    api.fetchGrid(SPREADSHEET_ID, [{ sheetId: 111, startRowIndex: 0 }], {
      includeProgrammaticFacts: false,
    });

    expect(transport).toHaveBeenCalledTimes(2);
  });

  it("refuses a spreadsheet id the host was not bound to", () => {
    const { api } = seedApi();

    expect(() => api.fetchSheetProperties("some-other-spreadsheet")).toThrowError(
      /bound to spreadsheet/,
    );
  });
});

describe("GoogleSheetsAPI types", () => {
  it("keeps the opaque raw request as Google's Request alias", () => {
    assertType<
      IsExactly<OpaqueRawRequest, GoogleAppsScript.Sheets.Schema.Request>
    >(true);
  });
});
