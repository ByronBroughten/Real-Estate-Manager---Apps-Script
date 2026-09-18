import { beforeEach, describe, expect, it } from "vitest";
import { columnConfigs } from "../01_generatedConfigs/columnConfigs";
import { getSheetTraitByName } from "../01_generatedConfigs/sheetConfigsTypes";
import {
  stubLogger,
  stubPropertiesService,
} from "../testSupport/fakeAppsScriptGlobals";
import {
  buildGridRows,
  stubSheetsService,
} from "../testSupport/fakeSheetsService";
import { SpreadsheetConfigOperator } from "./SpreadsheetConfigOperator";

const spreadsheetConfigGid = getSheetTraitByName(
  "spreadsheetConfig",
  "sheetGid",
);
const ssc = columnConfigs.spreadsheetConfig;

const spreadsheetConfigHeaders = [
  ssc.idDelimiter.header,
  ssc.idHeader.header,
  ssc.startTableColumnIndexBase1.header,
  ssc.columnIdRowIndexBase1.header,
  ssc.columnGroupHeadingRowIndexBase1.header,
  ssc.actionRowIndexBase1.header,
  ssc.tableHeaderRowIndexBase1.header,
];

const matchingCommittedFileValues = [
  ":",
  "ID",
  1,
  1,
  2,
  3,
  4,
] as const;

function stubSpreadsheetConfigSheet(
  rowsByIndex: Record<number, readonly (string | number | boolean | null)[]>,
) {
  return stubSheetsService({
    sheets: [
      {
        sheetId: spreadsheetConfigGid,
        title: "Spreadsheet Config",
        rows: buildGridRows(rowsByIndex),
      },
    ],
  });
}

function fetchedOperator() {
  const operator = SpreadsheetConfigOperator.init();
  operator.fetchLiveConfig();
  return operator;
}

beforeEach(() => {
  stubPropertiesService({ realEstateSpreadsheetId: "test-spreadsheet-id" });
  stubLogger();
});

describe("SpreadsheetConfigOperator.fetchLiveConfig / toFileSource", () => {
  it("emits makeSpreadsheetConfig of the live row with base-1 indexes minus one", () => {
    const { getByDataFilterCalls } = stubSpreadsheetConfigSheet({
      3: spreadsheetConfigHeaders,
      4: ["|", "ID", 1, 1, 2, 3, 4],
    });

    expect(fetchedOperator().toFileSource()).toBe(
      [
        `import { makeSpreadsheetConfig } from "./makeConfigs";`,
        ``,
        `export const spreadsheetConfig = makeSpreadsheetConfig({`,
        `  idDelimiter: "|",`,
        `  idHeader: "ID",`,
        `  startTableColIndexBase0: 0,`,
        `  columnIdRowIdxBase0: 0,`,
        `  columnGroupHeadingRowIndexBase0: 1,`,
        `  actionRowIndexBase0: 2,`,
        `  tableHeaderRowIndexBase0: 3,`,
        `} as const);`,
        ``,
      ].join("\n"),
    );
    expect(getByDataFilterCalls[0]).toMatchObject({
      dataFilters: [{ gridRange: { sheetId: spreadsheetConfigGid } }],
    });
  });

  it("ignores an extra column that is not in the closed map", () => {
    stubSpreadsheetConfigSheet({
      3: [...spreadsheetConfigHeaders, "Notes"],
      4: [...matchingCommittedFileValues, "ignore me"],
    });

    expect(fetchedOperator().toFileSource()).toContain('idDelimiter: ":"');
    expect(fetchedOperator().toFileSource()).not.toContain("Notes");
  });

  it("throws when the header row is not uniquely findable", () => {
    stubSpreadsheetConfigSheet({
      3: spreadsheetConfigHeaders,
      6: spreadsheetConfigHeaders,
      4: [...matchingCommittedFileValues],
      7: [...matchingCommittedFileValues],
    });

    expect(() => SpreadsheetConfigOperator.init().fetchLiveConfig()).toThrow(
      /Spreadsheet Config/,
    );
  });

  it("throws when there are no data rows", () => {
    stubSpreadsheetConfigSheet({
      3: spreadsheetConfigHeaders,
    });

    expect(() => SpreadsheetConfigOperator.init().fetchLiveConfig()).toThrow(
      /Spreadsheet Config/,
    );
  });

  it("reads the first data row as the Table header row plus one, not a later filled row", () => {
    stubSpreadsheetConfigSheet({
      3: spreadsheetConfigHeaders,
      5: [...matchingCommittedFileValues],
    });

    expect(() => SpreadsheetConfigOperator.init().fetchLiveConfig()).toThrow(
      /Spreadsheet Config/,
    );
  });

  it("does not treat a second filled row as a fetch-time error", () => {
    stubSpreadsheetConfigSheet({
      3: spreadsheetConfigHeaders,
      4: [...matchingCommittedFileValues],
      5: ["x", "", "", "", "", "", ""],
    });

    expect(fetchedOperator().toFileSource()).toContain('idDelimiter: ":"');
  });

  it("throws when a guaranteed header is missing", () => {
    stubSpreadsheetConfigSheet({
      3: spreadsheetConfigHeaders.slice(1),
      4: ["ID", 1, 1, 2, 3, 4],
    });

    expect(() => SpreadsheetConfigOperator.init().fetchLiveConfig()).toThrow(
      /Spreadsheet Config/,
    );
  });

  it("throws when a guaranteed cell is blank", () => {
    stubSpreadsheetConfigSheet({
      3: spreadsheetConfigHeaders,
      4: ["", "ID", 1, 1, 2, 3, 4],
    });

    expect(() => SpreadsheetConfigOperator.init().fetchLiveConfig()).toThrow(
      /Spreadsheet Config/,
    );
  });

  it("throws when an index is not an integer ≥ 1", () => {
    stubSpreadsheetConfigSheet({
      3: spreadsheetConfigHeaders,
      4: [":", "ID", 0, 1, 2, 3, 4],
    });

    expect(() => SpreadsheetConfigOperator.init().fetchLiveConfig()).toThrow(
      /Spreadsheet Config/,
    );
  });

  it("throws when an index is not an integer", () => {
    stubSpreadsheetConfigSheet({
      3: spreadsheetConfigHeaders,
      4: [":", "ID", 1.5, 1, 2, 3, 4],
    });

    expect(() => SpreadsheetConfigOperator.init().fetchLiveConfig()).toThrow(
      /Spreadsheet Config/,
    );
  });

  it("throws when two uniform-row indexes share a number", () => {
    stubSpreadsheetConfigSheet({
      3: spreadsheetConfigHeaders,
      4: [":", "ID", 1, 1, 2, 1, 4],
    });

    expect(() => SpreadsheetConfigOperator.init().fetchLiveConfig()).toThrow(
      /Column ID row index base 1.*Action row index base 1/,
    );
  });

  it("throws when a uniform-row index lands on the first data row", () => {
    stubSpreadsheetConfigSheet({
      3: spreadsheetConfigHeaders,
      4: [":", "ID", 1, 5, 2, 3, 4],
    });

    expect(() => SpreadsheetConfigOperator.init().fetchLiveConfig()).toThrow(
      /Column ID row index base 1.*first data row/,
    );
  });
});
