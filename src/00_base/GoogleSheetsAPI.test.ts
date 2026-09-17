import { describe, expect, it, vi } from "vitest";
import { assertType, type IsExactly } from "../testSupport/typeAssertions";
import {
  GoogleSheetsAPI,
  type OpaqueRawRequest,
  type SheetsHttpRequest,
} from "./GoogleSheetsAPI";
import type { LocalWriteOperation } from "./RawSource";
import type { RgbColor } from "./RgbColor";

const SPREADSHEET_ID = "spreadsheet-under-test";
const LIGHT_GREEN: RgbColor = { red: 0.851, green: 0.918, blue: 0.827 };

type BatchUpdateRequest =
  GoogleAppsScript.Sheets.Schema.BatchUpdateSpreadsheetRequest;

function recordingSheets(
  payload: GoogleAppsScript.Sheets.Schema.Spreadsheet = {
    sheets: [],
  },
  batchUpdateResponse: (
    resource: BatchUpdateRequest,
  ) => GoogleAppsScript.Sheets.Schema.BatchUpdateSpreadsheetResponse = () => ({}),
) {
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
        return batchUpdateResponse(resource);
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
      {
        kind: "addProtectedRange",
        protection: {
          kind: "warning",
          range: {
            sheetId: 111,
            startRowIndex: 4,
            endRowIndex: 5,
            startColumnIndex: 0,
            endColumnIndex: 1,
          },
          description: "floor",
          users: [],
          groups: [],
          unprotectedRanges: [],
        },
      },
      { kind: "deleteProtectedRange", sheetId: 111, protectedRangeId: 7 },
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
              values: [{ userEnteredFormat: { backgroundColor: LIGHT_GREEN } }],
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
      {
        addProtectedRange: {
          protectedRange: {
            range: {
              sheetId: 111,
              startRowIndex: 4,
              endRowIndex: 5,
              startColumnIndex: 0,
              endColumnIndex: 1,
            },
            description: "floor",
            warningOnly: true,
          },
        },
      },
      { deleteProtectedRange: { protectedRangeId: 7 } },
      { updateTable: { table: { tableId: "t" } } },
    ]);
  });

  it("sends no batchUpdate when the write list is empty", () => {
    const { api, batchUpdateCalls } = recordingSheets();

    api.flush(SPREADSHEET_ID, []);

    expect(batchUpdateCalls).toEqual([]);
  });

  it("maps a boolean rule onto addConditionalFormatRule without alpha", () => {
    const { api, batchUpdateCalls } = recordingSheets();
    const pink = { red: 244 / 255, green: 204 / 255, blue: 204 / 255 };

    api.flush(SPREADSHEET_ID, [
      {
        kind: "addConditionalFormatRule",
        index: 0,
        rule: {
          kind: "boolean",
          ranges: [
            {
              sheetId: 111,
              startRowIndex: 4,
              endRowIndex: 11,
              startColumnIndex: 2,
              endColumnIndex: 3,
            },
          ],
          condition: { type: "NUMBER_EQ", value: true },
          format: {
            backgroundColor: pink,
            foregroundColor: { red: 0.4, green: 0.4, blue: 0.4 },
          },
        },
      },
    ]);

    expect(batchUpdateCalls[0]?.requests).toEqual([
      {
        addConditionalFormatRule: {
          index: 0,
          rule: {
            ranges: [
              {
                sheetId: 111,
                startRowIndex: 4,
                endRowIndex: 11,
                startColumnIndex: 2,
                endColumnIndex: 3,
              },
            ],
            booleanRule: {
              condition: {
                type: "NUMBER_EQ",
                values: [{ userEnteredValue: "TRUE" }],
              },
              format: {
                backgroundColor: pink,
                textFormat: {
                  foregroundColor: { red: 0.4, green: 0.4, blue: 0.4 },
                },
              },
            },
          },
        },
      },
    ]);
    expect(
      batchUpdateCalls[0]?.requests?.[0]?.addConditionalFormatRule?.rule
        ?.booleanRule?.format?.backgroundColor,
    ).not.toHaveProperty("alpha");
  });

  it("stringifies a false condition value as Sheets' FALSE literal", () => {
    const { api, batchUpdateCalls } = recordingSheets();

    api.flush(SPREADSHEET_ID, [
      {
        kind: "addConditionalFormatRule",
        index: 0,
        rule: {
          kind: "boolean",
          ranges: [
            {
              sheetId: 111,
              startRowIndex: 4,
              endRowIndex: 5,
              startColumnIndex: 0,
              endColumnIndex: 1,
            },
          ],
          condition: { type: "NUMBER_EQ", value: false },
          format: { backgroundColor: { red: 1 } },
        },
      },
    ]);

    expect(
      batchUpdateCalls[0]?.requests?.[0]?.addConditionalFormatRule?.rule
        ?.booleanRule?.condition?.values,
    ).toEqual([{ userEnteredValue: "FALSE" }]);
  });

  it("passes a custom formula through unchanged and maps a delete by sheet and index", () => {
    const { api, batchUpdateCalls } = recordingSheets();

    api.flush(SPREADSHEET_ID, [
      {
        kind: "deleteConditionalFormatRule",
        sheetId: 111,
        index: 3,
      },
      {
        kind: "addConditionalFormatRule",
        index: 0,
        rule: {
          kind: "boolean",
          ranges: [
            {
              sheetId: 111,
              startRowIndex: 4,
              endRowIndex: 5,
              startColumnIndex: 0,
              endColumnIndex: 1,
            },
          ],
          condition: { type: "CUSTOM_FORMULA", formula: "=$B5=FALSE" },
          format: { backgroundColor: { red: 1 } },
        },
      },
    ]);

    expect(batchUpdateCalls[0]?.requests).toEqual([
      {
        deleteConditionalFormatRule: { sheetId: 111, index: 3 },
      },
      {
        addConditionalFormatRule: {
          index: 0,
          rule: {
            ranges: [
              {
                sheetId: 111,
                startRowIndex: 4,
                endRowIndex: 5,
                startColumnIndex: 0,
                endColumnIndex: 1,
              },
            ],
            booleanRule: {
              condition: {
                type: "CUSTOM_FORMULA",
                values: [{ userEnteredValue: "=$B5=FALSE" }],
              },
              format: { backgroundColor: { red: 1 } },
            },
          },
        },
      },
    ]);
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
      (batchUpdateCalls[0]?.requests ?? []).map(
        (request) => Object.keys(request)[0],
      ),
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

  it("maps a boolean rule, a multi-range rule and an unmodelable rule in list order", () => {
    const pink = { red: 0.95686275, green: 0.8, blue: 0.8 };
    const { api } = recordingSheets({
      sheets: [
        {
          properties: { sheetId: 111, title: "Leases" },
          conditionalFormats: [
            {
              ranges: [
                {
                  sheetId: 111,
                  startRowIndex: 4,
                  endRowIndex: 11,
                  startColumnIndex: 0,
                  endColumnIndex: 5,
                },
              ],
              booleanRule: {
                condition: {
                  type: "CUSTOM_FORMULA",
                  values: [{ userEnteredValue: "=$A5" }],
                },
                format: {
                  backgroundColor: pink,
                  backgroundColorStyle: { rgbColor: pink },
                  textFormat: {
                    foregroundColor: { red: 0.4 },
                    foregroundColorStyle: { rgbColor: { red: 0.4 } },
                  },
                },
              },
            },
            {
              ranges: [
                {
                  sheetId: 111,
                  startRowIndex: 4,
                  endRowIndex: 6,
                  startColumnIndex: 0,
                  endColumnIndex: 1,
                },
                {
                  sheetId: 111,
                  startRowIndex: 4,
                  endRowIndex: 6,
                  startColumnIndex: 3,
                  endColumnIndex: 4,
                },
              ],
              booleanRule: {
                condition: {
                  type: "NUMBER_EQ",
                  values: [{ userEnteredValue: "TRUE" }],
                },
                format: { backgroundColor: { red: 0, green: 1, blue: 0 } },
              },
            },
            {
              ranges: [
                {
                  sheetId: 111,
                  startRowIndex: 4,
                  endRowIndex: 11,
                  startColumnIndex: 2,
                  endColumnIndex: 3,
                },
              ],
              gradientRule: {
                minpoint: { color: { red: 1 }, type: "MIN" },
                maxpoint: { color: { red: 0 }, type: "MAX" },
              },
            },
          ],
        },
      ],
    });

    const rules = api.fetchConditionalFormatRules(SPREADSHEET_ID)[0]?.rules;

    expect(rules).toHaveLength(3);
    expect(rules?.[0]).toEqual({
      kind: "boolean",
      ranges: [
        {
          sheetId: 111,
          startRowIndex: 4,
          endRowIndex: 11,
          startColumnIndex: 0,
          endColumnIndex: 5,
        },
      ],
      condition: { type: "CUSTOM_FORMULA", formula: "=$A5" },
      format: {
        backgroundColor: {
          red: 244 / 255,
          green: 204 / 255,
          blue: 204 / 255,
        },
        foregroundColor: { red: 102 / 255 },
      },
    });
    expect(rules?.[1]).toEqual({
      kind: "boolean",
      ranges: [
        {
          sheetId: 111,
          startRowIndex: 4,
          endRowIndex: 6,
          startColumnIndex: 0,
          endColumnIndex: 1,
        },
        {
          sheetId: 111,
          startRowIndex: 4,
          endRowIndex: 6,
          startColumnIndex: 3,
          endColumnIndex: 4,
        },
      ],
      condition: { type: "NUMBER_EQ", value: true },
      format: { backgroundColor: { red: 0, green: 1, blue: 0 } },
    });
    expect(rules?.[2]).toEqual({
      kind: "unmodelable",
      index: 2,
      ranges: [
        {
          sheetId: 111,
          startRowIndex: 4,
          endRowIndex: 11,
          startColumnIndex: 2,
          endColumnIndex: 3,
        },
      ],
    });
  });
});

describe("GoogleSheetsAPI conditional format read", () => {
  it("reads rules with a plain get, never getByDataFilter", () => {
    const { api, getCalls, getByDataFilterCalls } = recordingSheets({
      sheets: [{ properties: { sheetId: 111 } }],
    });

    api.fetchConditionalFormatRules(SPREADSHEET_ID);

    expect(getCalls).toEqual([
      {
        spreadsheetId: SPREADSHEET_ID,
        fields: "sheets(properties(sheetId),conditionalFormats)",
      },
    ]);
    expect(getByDataFilterCalls).toHaveLength(0);
  });

  it("reads omitted zero fields in a rule range as zero", () => {
    const { api } = recordingSheets({
      sheets: [
        {
          properties: { sheetId: 0 },
          conditionalFormats: [
            {
              ranges: [{ endRowIndex: 11, endColumnIndex: 1 }],
              gradientRule: {},
            },
          ],
        },
      ],
    });

    expect(
      api.fetchConditionalFormatRules(SPREADSHEET_ID)[0]?.rules[0]?.ranges,
    ).toEqual([
      {
        sheetId: 0,
        startRowIndex: 0,
        endRowIndex: 11,
        startColumnIndex: 0,
        endColumnIndex: 1,
      },
    ]);
  });

  it("reads a theme colour style, or one that disagrees with its colour, as unmodelable", () => {
    const green = { red: 0, green: 1, blue: 0 };
    const rule = (format: GoogleAppsScript.Sheets.Schema.CellFormat) => ({
      ranges: [{ sheetId: 111, startRowIndex: 4 }],
      booleanRule: {
        condition: {
          type: "NUMBER_EQ",
          values: [{ userEnteredValue: "TRUE" }],
        },
        format,
      },
    });
    const { api } = recordingSheets({
      sheets: [
        {
          properties: { sheetId: 111 },
          conditionalFormats: [
            rule({
              backgroundColor: green,
              backgroundColorStyle: { themeColor: "ACCENT1" },
            }),
            rule({
              backgroundColor: green,
              backgroundColorStyle: { rgbColor: { red: 1 } },
            }),
          ],
        },
      ],
    });

    expect(
      api
        .fetchConditionalFormatRules(SPREADSHEET_ID)[0]
        ?.rules.map((read) => read.kind),
    ).toEqual(["unmodelable", "unmodelable"]);
  });

  it("reads a sheet whose rule list Google omitted as having no rules", () => {
    const { api } = recordingSheets({
      sheets: [{ properties: { sheetId: 111 } }],
    });

    expect(api.fetchConditionalFormatRules(SPREADSHEET_ID)).toEqual([
      { sheetGid: 111, rules: [] },
    ]);
  });
});

describe("GoogleSheetsAPI protected range read", () => {
  it("reads protections with a plain get, never getByDataFilter", () => {
    const { api, getCalls, getByDataFilterCalls } = recordingSheets({
      sheets: [{ properties: { sheetId: 111 } }],
    });

    api.fetchProtectedRanges(SPREADSHEET_ID);

    expect(getCalls).toEqual([
      {
        spreadsheetId: SPREADSHEET_ID,
        fields: "sheets(properties(sheetId),protectedRanges)",
      },
    ]);
    expect(getByDataFilterCalls).toHaveLength(0);
  });

  it("reads a sheet whose protection list Google omitted as having none", () => {
    const { api } = recordingSheets({
      sheets: [{ properties: { sheetId: 111 } }],
    });

    expect(api.fetchProtectedRanges(SPREADSHEET_ID)).toEqual([
      { sheetGid: 111, protections: [] },
    ]);
  });

  it("reads omitted zero fields in a protection range as zero", () => {
    const { api } = recordingSheets({
      sheets: [
        {
          properties: { sheetId: 0 },
          protectedRanges: [
            {
              protectedRangeId: 3,
              range: { endRowIndex: 11, endColumnIndex: 1 },
              warningOnly: true,
            },
          ],
        },
      ],
    });

    expect(api.fetchProtectedRanges(SPREADSHEET_ID)[0]?.protections[0]).toEqual(
      {
        kind: "warning",
        id: 3,
        range: {
          sheetId: 0,
          startRowIndex: 0,
          endRowIndex: 11,
          startColumnIndex: 0,
          endColumnIndex: 1,
        },
        description: "",
        users: [],
        groups: [],
        unprotectedRanges: [],
        requestingUserCanEdit: false,
      },
    );
  });

  it("reads a warning's editors as none, since Google lists them but a warning ignores them", () => {
    const { api } = recordingSheets({
      sheets: [
        {
          properties: { sheetId: 111 },
          protectedRanges: [
            {
              protectedRangeId: 5,
              range: {
                sheetId: 111,
                startRowIndex: 4,
                endRowIndex: 16,
                startColumnIndex: 1,
                endColumnIndex: 2,
              },
              warningOnly: true,
              editors: {
                users: [
                  "service@example.iam.gserviceaccount.com",
                  "owner@example.com",
                ],
                groups: ["team@example.com"],
              },
            },
          ],
        },
      ],
    });

    const protection =
      api.fetchProtectedRanges(SPREADSHEET_ID)[0]?.protections[0];
    expect(protection).toMatchObject({
      kind: "warning",
      users: [],
      groups: [],
    });
  });

  it("reads a named-range-backed protection as unmodelable and still carries its id", () => {
    const { api } = recordingSheets({
      sheets: [
        {
          properties: { sheetId: 111 },
          protectedRanges: [
            {
              protectedRangeId: 9,
              namedRangeId: "named-1",
              range: { sheetId: 111, startRowIndex: 4, endRowIndex: 11 },
              warningOnly: true,
            },
          ],
        },
      ],
    });

    expect(api.fetchProtectedRanges(SPREADSHEET_ID)[0]?.protections[0]).toEqual(
      {
        kind: "unmodelable",
        id: 9,
      },
    );
  });
});

describe("GoogleSheetsAPI protected range write", () => {
  it("maps a lock with named editors and a whole-sheet warning with unprotected ranges", () => {
    const { api, batchUpdateCalls } = recordingSheets();

    api.flush(SPREADSHEET_ID, [
      {
        kind: "addProtectedRange",
        protection: {
          kind: "lock",
          range: {
            sheetId: 111,
            startRowIndex: 4,
            endRowIndex: 5,
            startColumnIndex: 0,
            endColumnIndex: 1,
          },
          description: "cell lock",
          users: ["editor@example.com"],
          groups: ["group@example.com"],
          unprotectedRanges: [],
        },
      },
      {
        kind: "addProtectedRange",
        protection: {
          kind: "warning",
          range: { sheetId: 111 },
          description: "sheet warning",
          users: [],
          groups: [],
          unprotectedRanges: [
            {
              sheetId: 111,
              startRowIndex: 4,
              endRowIndex: 5,
              startColumnIndex: 1,
              endColumnIndex: 2,
            },
          ],
        },
      },
    ]);

    expect(batchUpdateCalls[0]?.requests).toEqual([
      {
        addProtectedRange: {
          protectedRange: {
            range: {
              sheetId: 111,
              startRowIndex: 4,
              endRowIndex: 5,
              startColumnIndex: 0,
              endColumnIndex: 1,
            },
            description: "cell lock",
            editors: {
              users: ["editor@example.com"],
              groups: ["group@example.com"],
            },
          },
        },
      },
      {
        addProtectedRange: {
          protectedRange: {
            range: { sheetId: 111 },
            description: "sheet warning",
            warningOnly: true,
            unprotectedRanges: [
              {
                sheetId: 111,
                startRowIndex: 4,
                endRowIndex: 5,
                startColumnIndex: 1,
                endColumnIndex: 2,
              },
            ],
          },
        },
      },
    ]);
  });

  it("reads the new protected range id from the add reply", () => {
    const { api } = recordingSheets({ sheets: [] }, () => ({
      replies: [
        {
          addProtectedRange: {
            protectedRange: { protectedRangeId: 42 },
          },
        },
      ],
    }));

    expect(() =>
      api.flush(SPREADSHEET_ID, [
        {
          kind: "addProtectedRange",
          protection: {
            kind: "warning",
            range: { sheetId: 111 },
            description: "",
            users: [],
            groups: [],
            unprotectedRanges: [],
          },
        },
      ]),
    ).not.toThrow();
  });

  it("throws when an add reply omits the id", () => {
    const { api } = recordingSheets({ sheets: [] }, () => ({
      replies: [{ addProtectedRange: { protectedRange: {} } }],
    }));

    expect(() =>
      api.flush(SPREADSHEET_ID, [
        {
          kind: "addProtectedRange",
          protection: {
            kind: "warning",
            range: { sheetId: 111 },
            description: "",
            users: [],
            groups: [],
            unprotectedRanges: [],
          },
        },
      ]),
    ).toThrowError(/protectedRangeId/);
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
    const fields = "sheets(properties(sheetId,title),tables(tableId,range))";

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
    expect(
      JSON.parse(transport.mock.calls[0]?.[0].body ?? "").requests,
    ).toHaveLength(1);
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

    expect(() =>
      api.fetchSheetProperties("some-other-spreadsheet"),
    ).toThrowError(/bound to spreadsheet/);
  });
});

describe("GoogleSheetsAPI types", () => {
  it("keeps the opaque raw request as Google's Request alias", () => {
    assertType<
      IsExactly<OpaqueRawRequest, GoogleAppsScript.Sheets.Schema.Request>
    >(true);
  });
});
