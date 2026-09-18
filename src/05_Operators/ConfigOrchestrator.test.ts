import { beforeEach, describe, expect, it } from "vitest";
import { columnConfigs } from "../01_SpreadsheetSchema/generated/columnConfigs";
import { spreadsheetConfig } from "../01_SpreadsheetSchema/generated/spreadsheetConfig";
import { getSheetTraitByName } from "../01_SpreadsheetSchema/sheetConfigsTypes";
import { ssConfigGet } from "../01_SpreadsheetSchema/spreadsheetConfigTypes";
import {
  stubLogger,
  stubPropertiesService,
} from "../testSupport/fakeAppsScriptGlobals";
import {
  buildGridRows,
  stubSheetsService,
  type FakeSheetProperties,
} from "../testSupport/fakeSheetsService";
import { ConfigOrchestrator } from "./ConfigOrchestrator";

const testSheetGid = 2089200354;
const sheetConfigGid = 210603630;
const columnConfigGid = 2034522667;
const draftGid = 777000111;
const draftTitle = "Add Occ Payment Intention";
const headerOnlyTableEndRowIndex =
  ssConfigGet("tableHeaderRowIndexBase0") + 1;
const spreadsheetConfigGid = getSheetTraitByName(
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
  testSheetGid,
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
    sheetId: spreadsheetConfigGid,
    title: "Spreadsheet Config",
    rows: buildGridRows({
      3: spreadsheetConfigHeaders,
      4: [idDelimiter, "ID", 1, 1, 2, 3, 4],
      ...options.extraRows,
    }),
    table: { endRowIndex: options.tableEndRowIndex ?? 5 },
  };
}

function headerOnlyDraftSheet(
  options: {
    sheetId?: number;
    title?: string;
    table?: "header-only" | "with-data-row" | "missing";
    hasIdHeader?: boolean;
  } = {},
): FakeSheetProperties {
  const table = options.table ?? "header-only";
  const headers = options.hasIdHeader ? ["ID", "Name"] : ["Name"];
  const rows: Record<number, readonly (string | number | boolean | null)[]> = {
    3: headers,
  };
  if (table === "with-data-row") {
    rows[4] = [];
  }
  const sheet: FakeSheetProperties = {
    sheetId: options.sheetId ?? draftGid,
    title: options.title ?? draftTitle,
    rows: buildGridRows(rows),
  };
  if (table === "missing") {
    return sheet;
  }
  return {
    ...sheet,
    table: {
      endRowIndex:
        table === "header-only" ? headerOnlyTableEndRowIndex : 5,
    },
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
    extraSheets?: FakeSheetProperties[];
    extraSheetConfigDataRows?: Record<
      number,
      readonly (string | number | boolean | null)[]
    >;
    sheetConfigTableEndRowIndex?: number;
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
        sheetId: sheetConfigGid,
        title: "Sheet Config",
        rows: buildGridRows({
          0: [
            sc.sheetGid.columnId,
            sc.sheetTitle.columnId,
            sc.letApiAccess.columnId,
            sc.idPrefix.columnId,
          ],
          4: testSheetConfigRowWithApiAccess,
          ...options.extraSheetConfigDataRows,
        }),
        table: { endRowIndex: options.sheetConfigTableEndRowIndex ?? 5 },
      },
      {
        sheetId: columnConfigGid,
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
        sheetId: testSheetGid,
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
      ...(options.extraSheets ?? []),
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
      sheetGid: testSheetGid,
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
          sheetId: sheetConfigGid,
          title: "Sheet Config",
          rows: buildGridRows({
            0: [
              sc.sheetGid.columnId,
              sc.sheetTitle.columnId,
              sc.letApiAccess.columnId,
              sc.idPrefix.columnId,
            ],
            4: [columnConfigGid, "Column Config", true, "ccf"],
          }),
          table: { endRowIndex: 5 },
        },
        {
          sheetId: columnConfigGid,
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
              columnConfigGid,
              cc.sheetGid.columnId,
              "Column Config",
              cc.sheetGid.header,
            ],
            5: [
              columnConfigGid,
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

describe("ConfigOrchestrator.syncConfigSheetRows Let api access", () => {
  it("syncs when Let api access is off and the Table has no data row, cataloguing the tab without emitting it", () => {
    seedFixture({
      extraSheets: [headerOnlyDraftSheet()],
      extraSheetConfigDataRows: {
        5: [draftGid, draftTitle, false, ""],
      },
      sheetConfigTableEndRowIndex: 6,
    });

    const orchestrator = ConfigOrchestrator.init();
    expect(() => orchestrator.syncConfigSheetRows()).not.toThrow();
    expect(
      orchestrator.sheetConfigOperator.newSheetConfigs().addOccPaymentIntention,
    ).toBeUndefined();
    expect(
      orchestrator.sheetConfigOperator.sheet.column("sheetGid").hasValue(draftGid),
    ).toBe(true);
  });

  it("aborts and names the tab when Let api access is on and the Table has no data row", () => {
    seedFixture({
      extraSheets: [headerOnlyDraftSheet()],
      extraSheetConfigDataRows: {
        5: [draftGid, draftTitle, true, ""],
      },
      sheetConfigTableEndRowIndex: 6,
    });

    expect(() => ConfigOrchestrator.init().syncConfigSheetRows()).toThrow(
      /Add Occ Payment Intention.*at least one data row/,
    );
  });

  it("samples hasIdColumn from the Table header row of a Let api access sheet", () => {
    seedFixture({
      extraSheets: [
        headerOnlyDraftSheet({
          table: "with-data-row",
          hasIdHeader: true,
        }),
      ],
      extraSheetConfigDataRows: {
        5: [draftGid, draftTitle, true, "aopi"],
      },
      sheetConfigTableEndRowIndex: 6,
    });

    const parsed = ConfigOrchestrator.init().generateConfigFiles();
    expect(parsed.sheetConfigs).toContain(
      `"addOccPaymentIntention": { "sheetGid": ${draftGid}, "idPrefix": "aopi", "hasIdColumn": true }`,
    );
  });

  it("treats a never-ticked Let api access box as off", () => {
    seedFixture({
      extraSheets: [headerOnlyDraftSheet()],
      extraSheetConfigDataRows: {
        5: [draftGid, draftTitle, null, ""],
      },
      sheetConfigTableEndRowIndex: 6,
    });

    const orchestrator = ConfigOrchestrator.init();
    expect(() => orchestrator.syncConfigSheetRows()).not.toThrow();
    expect(
      orchestrator.sheetConfigOperator.newSheetConfigs().addOccPaymentIntention,
    ).toBeUndefined();
  });

  it("catalogues a brand-new header-only tab with Let api access off", () => {
    seedFixture({ extraSheets: [headerOnlyDraftSheet()] });

    const orchestrator = ConfigOrchestrator.init();
    const parsed = orchestrator.generateConfigFiles();
    expect(
      orchestrator.sheetConfigOperator.sheet.column("sheetGid").hasValue(draftGid),
    ).toBe(true);
    expect(parsed.sheetConfigs).not.toContain("addOccPaymentIntention");
  });

  it("omits a draft that has data rows until Let api access is ticked", () => {
    seedFixture({
      extraSheets: [headerOnlyDraftSheet({ table: "with-data-row" })],
      extraSheetConfigDataRows: {
        5: [draftGid, draftTitle, false, "aopi"],
      },
      sheetConfigTableEndRowIndex: 6,
    });

    const parsed = ConfigOrchestrator.init().generateConfigFiles();
    expect(parsed.sheetConfigs).toContain('"test"');
    expect(parsed.sheetConfigs).not.toContain("addOccPaymentIntention");
    expect(parsed.columnConfigs).toContain("c:test:xyz123");
    expect(parsed.columnConfigs).not.toMatch(/c:aopi:/);
  });

  it("syncs several header-only drafts in one run", () => {
    const secondDraftGid = draftGid + 1;
    const secondTitle = "Add Occ Charge Intention";
    seedFixture({
      extraSheets: [
        headerOnlyDraftSheet(),
        headerOnlyDraftSheet({
          sheetId: secondDraftGid,
          title: secondTitle,
        }),
      ],
    });

    const orchestrator = ConfigOrchestrator.init();
    expect(() => orchestrator.syncConfigSheetRows()).not.toThrow();
    const gids = orchestrator.sheetConfigOperator.sheet.column("sheetGid");
    expect(gids.hasValue(draftGid)).toBe(true);
    expect(gids.hasValue(secondDraftGid)).toBe(true);
  });

  it("regens a healthy Let api access sheet while cataloguing an empty draft", () => {
    seedFixture({ extraSheets: [headerOnlyDraftSheet()] });

    const parsed = ConfigOrchestrator.init().generateConfigFiles();
    expect(parsed.sheetConfigs).toContain('"test"');
    expect(parsed.sheetConfigs).not.toContain("addOccPaymentIntention");
    expect(parsed.columnConfigs).toContain("c:test:xyz123");
  });

  it("still syncs the config-describing sheets when they have Let api access", () => {
    seedFixture({
      extraSheetConfigDataRows: {
        5: [sheetConfigGid, "Sheet Config", true, "scf"],
        6: [columnConfigGid, "Column Config", true, "ccf"],
      },
      sheetConfigTableEndRowIndex: 7,
    });

    expect(() => ConfigOrchestrator.init().syncConfigSheetRows()).not.toThrow();
  });

  it("fails when a Let api access sheet has no Table", () => {
    seedFixture({
      extraSheets: [headerOnlyDraftSheet({ table: "missing" })],
      extraSheetConfigDataRows: {
        5: [draftGid, draftTitle, true, "aopi"],
      },
      sheetConfigTableEndRowIndex: 6,
    });

    expect(() => ConfigOrchestrator.init().syncConfigSheetRows()).toThrow(
      /Active table is null/,
    );
  });

  it("syncs when a draft tab has no Table", () => {
    seedFixture({
      extraSheets: [headerOnlyDraftSheet({ table: "missing" })],
    });

    expect(() => ConfigOrchestrator.init().syncConfigSheetRows()).not.toThrow();
  });
});
