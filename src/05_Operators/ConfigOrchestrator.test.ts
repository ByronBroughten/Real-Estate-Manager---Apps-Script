import { beforeEach, describe, expect, it } from "vitest";
import { columnConfigs } from "../01_generatedConfigs/columnConfigs";
import { spreadsheetConfig } from "../01_generatedConfigs/spreadsheetConfig";
import { getSheetTraitByName } from "../01_generatedConfigs/sheetConfigsTypes";
import { ssConfigGet } from "../01_generatedConfigs/spreadsheetConfigTypes";
import {
  stubLogger,
  stubPropertiesService,
} from "../testSupport/fakeAppsScriptGlobals";
import {
  buildGridRows,
  stubSheetsService,
} from "../testSupport/fakeSheetsService";
import { ConfigOrchestrator } from "./ConfigOrchestrator";

const TEST_SHEET_GID = 2089200354;
const SHEET_CONFIG_GID = 210603630;
const COLUMN_CONFIG_GID = 2034522667;
const SPREADSHEET_CONFIG_GID = getSheetTraitByName(
  "spreadsheetConfig",
  "sheetGid",
);

const sc = columnConfigs.sheetConfig;
const cc = columnConfigs.columnConfig;
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

const testSheetConfigRowWithApiAccess = [
  TEST_SHEET_GID,
  "Test",
  true,
  "test",
];

beforeEach(() => {
  stubPropertiesService({ realEstateSpreadsheetId: "test-spreadsheet-id" });
  stubLogger();
});

function spreadsheetConfigSheet(
  idDelimiter: string,
  options: {
    tableEndRowIndex?: number;
    extraRows?: Record<number, readonly (string | number | boolean | null)[]>;
  } = {},
) {
  return {
    sheetId: SPREADSHEET_CONFIG_GID,
    title: "Spreadsheet Config",
    rows: buildGridRows({
      3: spreadsheetConfigHeaders,
      4: [idDelimiter, "ID", 1, 1, 2, 3, 4],
      ...options.extraRows,
    }),
    table: { endRowIndex: options.tableEndRowIndex ?? 5 },
  };
}

function seedFixture(
  options: {
    idDelimiter?: string;
    testColumnId?: string;
    spreadsheetConfigTableEndRowIndex?: number;
    spreadsheetConfigExtraRows?: Record<
      number,
      readonly (string | number | boolean | null)[]
    >;
  } = {},
) {
  const idDelimiter = options.idDelimiter ?? ":";
  const testColumnId = options.testColumnId ?? "c:test:xyz123";
  return stubSheetsService({
    sheets: [
      spreadsheetConfigSheet(idDelimiter, {
        tableEndRowIndex: options.spreadsheetConfigTableEndRowIndex,
        extraRows: options.spreadsheetConfigExtraRows,
      }),
      {
        sheetId: SHEET_CONFIG_GID,
        title: "Sheet Config",
        rows: buildGridRows({
          0: [
            sc.sheetGid.columnId,
            sc.sheetTitle.columnId,
            sc.letApiAccess.columnId,
            sc.idPrefix.columnId,
          ],
          4: testSheetConfigRowWithApiAccess,
        }),
        table: { endRowIndex: 5 },
      },
      {
        sheetId: COLUMN_CONFIG_GID,
        title: "Column Config",
        // appendRowWithVals (used by ColumnConfigOperator._appendColumnRows)
        // resolves every non-formula column of the sheet's schema against
        // this row, not just the ones toFileSource reads — so all of the
        // real committed Column Config columns need to be present here.
        rows: buildGridRows({
          0: [
            cc.sheetGid.columnId,
            cc.columnId.columnId,
            cc.sheetTitle.columnId,
            cc.header.columnId,
            cc.customDefaultValue.columnId,
            cc.emptyValueAllowed.columnId,
          ],
        }),
        table: { endRowIndex: 5 },
      },
      {
        sheetId: TEST_SHEET_GID,
        title: "Test",
        // Row 4 (the top data row) must be present, even blank, and a table
        // range declared, now that
        // ColumnConfigOperator emit samples both (for
        // the live isFormula/valueName facts, the latter via the table's
        // column data-validation rules) for every api-access sheet. The
        // header row (3) needs real text — newColumnConfigs() now throws
        // rather than skips a column still missing one after a sync.
        rows: buildGridRows({
          0: [testColumnId],
          3: ["Some Header"],
          4: [],
        }),
        table: { endRowIndex: 5 },
      },
    ],
  });
}

describe("ConfigOrchestrator.syncAndFlushConfigSheets", () => {
  it("flushes Sheet Config and Column Config changes in a single batchUpdate call", () => {
    const { batchUpdateCalls } = seedFixture();

    const orchestrator = ConfigOrchestrator.init();
    orchestrator.syncAndFlushConfigSheets();

    expect(batchUpdateCalls.length).toBe(1);
    expect(batchUpdateCalls[0]?.requests?.length).toBeGreaterThan(0);
    // The column ID gathered from the "test" sheet made it into a newly
    // appended Column Config row, which is part of what got flushed.
    expect(orchestrator.sheetConfigOperator.newSheetConfigs().test).toEqual({
      sheetGid: TEST_SHEET_GID,
      idPrefix: "test",
      hasIdColumn: false,
    });
  });

  it("returns the untyped-column summary for the endpoint to report, with no file sources", () => {
    seedFixture();

    const summary = ConfigOrchestrator.init().syncConfigSheetRows();

    expect(summary).toContain("1 column(s) across 1 sheet(s)");
    expect(typeof summary).toBe("string");
  });
});

describe("ConfigOrchestrator.generateConfigFiles", () => {
  it("returns every file's source together, reflecting the synced state", () => {
    seedFixture();

    const parsed = ConfigOrchestrator.init().generateConfigFiles();
    expect(typeof parsed.spreadsheetConfig).toBe("string");
    expect(typeof parsed.sheetConfigs).toBe("string");
    expect(typeof parsed.columnConfigs).toBe("string");
    expect(parsed.sheetConfigs).toContain('"test"');
    expect(typeof parsed.valueConfigs).toBe("string");
    // The "test" sheet's column ID was gathered and appended to Column
    // Config as part of the sync, then given its real header by
    // _updateProgrammaticValues; emit samples valueName from the live column.
    expect(parsed.columnConfigs).toContain("c:test:xyz123");
  });

  it("emits the live Spreadsheet Config values and uses them for new column IDs", () => {
    seedFixture({ idDelimiter: "|", testColumnId: "" });

    const parsed = ConfigOrchestrator.init().generateConfigFiles();
    expect(parsed.spreadsheetConfig).toContain('idDelimiter: "|"');
    expect(parsed.columnConfigs).toMatch(/c\|test\|/);
    expect(ssConfigGet("idDelimiter")).toBe(spreadsheetConfig.idDelimiter);
  });

  it("clears the live layout after the call returns", () => {
    seedFixture({ idDelimiter: "|" });

    ConfigOrchestrator.init().generateConfigFiles();
    expect(ssConfigGet("idDelimiter")).toBe(spreadsheetConfig.idDelimiter);
  });

  it("clears the live layout when later work throws", () => {
    stubSheetsService({
      sheets: [spreadsheetConfigSheet("|")],
    });

    expect(() => ConfigOrchestrator.init().generateConfigFiles()).toThrow();
    expect(ssConfigGet("idDelimiter")).toBe(spreadsheetConfig.idDelimiter);
  });

  it("carries the untyped-column summary back, since no run status cell will show it", () => {
    seedFixture();

    expect(
      ConfigOrchestrator.init().generateConfigFiles().untypedColumnsSummary,
    ).toContain("1 column(s) across 1 sheet(s)");
  });

  it("still catalogs value titles after Column Config pruned a stale row of its own", () => {
    const columnIdRow = [
      cc.sheetGid.columnId,
      cc.columnId.columnId,
      cc.sheetTitle.columnId,
      cc.header.columnId,
      cc.customDefaultValue.columnId,
      cc.emptyValueAllowed.columnId,
    ];
    stubSheetsService({
      sheets: [
        spreadsheetConfigSheet(":"),
        {
          sheetId: SHEET_CONFIG_GID,
          title: "Sheet Config",
          rows: buildGridRows({
            0: [
              sc.sheetGid.columnId,
              sc.sheetTitle.columnId,
              sc.letApiAccess.columnId,
              sc.idPrefix.columnId,
            ],
            4: [COLUMN_CONFIG_GID, "Column Config", true, "ccf"],
          }),
          table: { endRowIndex: 5 },
        },
        {
          sheetId: COLUMN_CONFIG_GID,
          title: "Column Config",
          rows: buildGridRows({
            0: columnIdRow,
            3: [
              cc.sheetGid.header,
              cc.columnId.header,
              cc.sheetTitle.header,
              cc.header.header,
              cc.customDefaultValue.header,
              cc.emptyValueAllowed.header,
            ],
            4: [
              COLUMN_CONFIG_GID,
              cc.sheetGid.columnId,
              "Column Config",
              cc.sheetGid.header,
            ],
            5: [
              COLUMN_CONFIG_GID,
              "c:ccf:stale-gone",
              "Column Config",
              "Gone",
            ],
          }),
          table: { endRowIndex: 6 },
        },
      ],
    });

    expect(() => ConfigOrchestrator.init().generateConfigFiles()).not.toThrow();
  });
});

describe("ConfigOrchestrator.syncConfigSheetRows Spreadsheet Config Table", () => {
  it("proceeds when Spreadsheet Config's Table has exactly one data row", () => {
    seedFixture();

    expect(() => ConfigOrchestrator.init().syncConfigSheetRows()).not.toThrow();
  });

  it("throws when Spreadsheet Config's Table has two data rows", () => {
    seedFixture({ spreadsheetConfigTableEndRowIndex: 6 });

    expect(() => ConfigOrchestrator.init().syncConfigSheetRows()).toThrow(
      /Spreadsheet Config/,
    );
  });

  it("throws when Spreadsheet Config's Table has no data row", () => {
    seedFixture({ spreadsheetConfigTableEndRowIndex: 4 });

    expect(() => ConfigOrchestrator.init().syncConfigSheetRows()).toThrow(
      /Spreadsheet Config/,
    );
  });

  it("ignores a filled row below Spreadsheet Config's Table", () => {
    seedFixture({
      spreadsheetConfigExtraRows: {
        5: ["junk", "", "", "", "", "", ""],
      },
    });

    expect(() => ConfigOrchestrator.init().syncConfigSheetRows()).not.toThrow();
  });
});

describe("ConfigOrchestrator.generateConfigFiles Spreadsheet Config Table", () => {
  it("throws when Spreadsheet Config's Table has two data rows", () => {
    seedFixture({ spreadsheetConfigTableEndRowIndex: 6 });

    expect(() => ConfigOrchestrator.init().generateConfigFiles()).toThrow(
      /Spreadsheet Config/,
    );
  });
});
