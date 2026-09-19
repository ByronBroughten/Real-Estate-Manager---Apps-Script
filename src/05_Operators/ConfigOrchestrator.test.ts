import { beforeEach, describe, expect, it } from "vitest";
import { configSheetFloorSeed } from "../01_SpreadsheetSchema/configSheetFloorSeed";
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
const headerOnlyTableEndRowIndex = ssConfigGet("tableHeaderRowIndexBase0") + 1;
const spreadsheetConfigGid = getSheetTraitByName(
  "spreadsheetConfig",
  "sheetGid",
);

const sc = columnConfigs.sheetConfig;
const cc = columnConfigs.columnConfig;
const ssc = columnConfigs.spreadsheetConfig;

const sscColumns = [
  "tableMenuSpace",
  "fillRowIdsTimeLastRan",
  "fillRowIdsRunStatus",
  "syncConfigSheetRowsTimeLastRan",
  "syncConfigSheetRowsRunStatus",
  "idDelimiter",
  "idHeader",
  "startTableColumnIndexBase1",
  "columnIdRowIndexBase1",
  "columnGroupHeadingRowIndexBase1",
  "actionRowIndexBase1",
  "tableHeaderRowIndexBase1",
] as const;

const testSheetConfigRowWithApiAccess = [testSheetGid, "Test", true];

beforeEach(() => {
  stubPropertiesService({ realEstateSpreadsheetId: "test-spreadsheet-id" });
  stubLogger();
});

function spreadsheetConfigSheet(
  idDelimiter: string,
  options: {
    tableEndRowIndex?: number;
    startTableColumnIndexBase1?: number;
    extraRows?: Record<number, readonly (string | number | boolean | null)[]>;
    protectedRanges?: GoogleAppsScript.Sheets.Schema.ProtectedRange[];
  } = {},
) {
  const headers = sscColumns.map((columnName) => ssc[columnName].header);
  const groupHeadings = sscColumns.map((columnName) =>
    spreadsheetConfigGroupHeading(ssc[columnName].header),
  );
  const dataRow = sscColumns.map((columnName) => {
    if (columnName === "idDelimiter") return idDelimiter;
    if (columnName === "idHeader") return "ID";
    if (columnName === "startTableColumnIndexBase1") {
      return options.startTableColumnIndexBase1 ?? 1;
    }
    if (columnName === "columnIdRowIndexBase1") return 1;
    if (columnName === "columnGroupHeadingRowIndexBase1") return 2;
    if (columnName === "actionRowIndexBase1") return 3;
    if (columnName === "tableHeaderRowIndexBase1") return 4;
    return "";
  });
  return {
    sheetId: spreadsheetConfigGid,
    title: "Spreadsheet Config",
    rows: buildGridRows({
      0: sscColumns.map((columnName) => ssc[columnName].columnId),
      1: groupHeadings,
      3: headers,
      4: dataRow,
      ...options.extraRows,
    }),
    table: {
      endRowIndex: options.tableEndRowIndex ?? 5,
      endColumnIndex: sscColumns.length,
    },
    protectedRanges: options.protectedRanges,
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
      endRowIndex: table === "header-only" ? headerOnlyTableEndRowIndex : 5,
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
    startTableColumnIndexBase1?: number;
    spreadsheetConfigProtections?: GoogleAppsScript.Sheets.Schema.ProtectedRange[];
  } = {},
) {
  const idDelimiter = options.idDelimiter ?? ":";
  const testColumnId = options.testColumnId ?? "c:test:xyz123";
  return stubSheetsService({
    sheets: [
      spreadsheetConfigSheet(idDelimiter, {
        tableEndRowIndex: options.spreadsheetConfigTableEndRowIndex,
        extraRows: options.spreadsheetConfigExtraRows,
        startTableColumnIndexBase1: options.startTableColumnIndexBase1,
        protectedRanges: options.spreadsheetConfigProtections,
      }),
      {
        sheetId: sheetConfigGid,
        title: "Sheet Config",
        rows: buildGridRows({
          0: [
            sc.sheetGid.columnId,
            sc.sheetTitle.columnId,
            sc.letApiAccess.columnId,
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

function spreadsheetConfigGroupHeading(header: string): string {
  const spreadsheetConfigSeed = configSheetFloorSeed.spreadsheetConfig;
  const endpoint = Object.values(spreadsheetConfigSeed.endpoints).find(
    (seededEndpoint) =>
      seededEndpoint.timeLastRan.header === header ||
      seededEndpoint.runStatus.header === header,
  );
  if (endpoint !== undefined) return endpoint.heading;
  return (
    spreadsheetConfigSeed.columns.find((column) => column.header === header)
      ?.columnGroupHeading ?? ""
  );
}

function floorWarningDescriptions(
  requests: GoogleAppsScript.Sheets.Schema.Request[] | undefined,
): string[] {
  return (requests ?? []).flatMap((request) => {
    const description = request.addProtectedRange?.protectedRange?.description;
    return description === undefined ? [] : [description];
  });
}

function driftedTableMenuSpaceDescription(): string {
  return `Config-sheet floor · Spreadsheet Config · Table menu space (${ssc.tableMenuSpace.columnId}) · data · warning`;
}

function driftedTableMenuSpaceProtection(): GoogleAppsScript.Sheets.Schema.ProtectedRange {
  return {
    protectedRangeId: 41,
    description: driftedTableMenuSpaceDescription(),
    warningOnly: true,
    range: {
      sheetId: spreadsheetConfigGid,
      startRowIndex: 0,
      endRowIndex: 1,
      startColumnIndex: 0,
      endColumnIndex: 1,
    },
  };
}

describe("ConfigOrchestrator.syncAndFlushConfigSheets", () => {
  it("flushes the config-sheet floor, then Sheet Config and Column Config changes", () => {
    const { batchUpdateCalls } = seedFixture();

    const orchestrator = ConfigOrchestrator.init();
    orchestrator.syncAndFlushConfigSheets();

    expect(batchUpdateCalls.length).toBe(2);
    expect(floorWarningDescriptions(batchUpdateCalls[0]?.requests)).toContain(
      driftedTableMenuSpaceDescription(),
    );
    expect(batchUpdateCalls[1]?.requests?.length).toBeGreaterThan(0);
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

  it("flushes floor warnings before the live Spreadsheet Config overlay is read", () => {
    const { batchUpdateCalls } = seedFixture({
      startTableColumnIndexBase1: 2,
    });

    expect(() =>
      ConfigOrchestrator.init().syncAndFlushConfigSheets(),
    ).toThrow();

    expect(floorWarningDescriptions(batchUpdateCalls[0]?.requests)).toContain(
      driftedTableMenuSpaceDescription(),
    );
  });

  it("returns the floor report beside the untyped-column summary, as one line", () => {
    seedFixture({
      spreadsheetConfigProtections: [driftedTableMenuSpaceProtection()],
    });

    const summary = ConfigOrchestrator.init().syncConfigSheetRows();

    expect(summary).toContain("Replaced drifted:");
    expect(summary).toContain(driftedTableMenuSpaceDescription());
    expect(summary).toContain("1 column(s) across 1 sheet(s)");
    expect(summary).not.toContain("\n");
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
    expect(parsed.columnConfigs).toMatch(/c\|tst\|/);
    expect(ssConfigGet("idDelimiter")).toBe(spreadsheetConfig.idDelimiter);
  });

  it("clears the live layout after the call returns", () => {
    seedFixture({ idDelimiter: "|", testColumnId: "" });

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

  it("carries the floor report back beside the untyped-column summary", () => {
    seedFixture({
      spreadsheetConfigProtections: [driftedTableMenuSpaceProtection()],
    });

    const parsed = ConfigOrchestrator.init().generateConfigFiles();
    expect(parsed.floorReport).toBe(
      `Replaced drifted: ${driftedTableMenuSpaceDescription()}`,
    );
    expect(parsed.untypedColumnsSummary).toContain(
      "1 column(s) across 1 sheet(s)",
    );
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
            ],
            4: [columnConfigGid, "Column Config", true],
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
            5: [columnConfigGid, "c:ccf:stale-gone", "Column Config", "Gone"],
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
      orchestrator.sheetConfigOperator.sheet
        .column("sheetGid")
        .hasValue(draftGid),
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
      orchestrator.sheetConfigOperator.sheet
        .column("sheetGid")
        .hasValue(draftGid),
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

describe("ConfigOrchestrator.generateConfigFiles ID prefix", () => {
  const propertyGid = 888001;
  const propertiesGid = 888002;

  function letApiAccessSheet(options: {
    sheetId: number;
    title: string;
    columnIds?: readonly string[];
    headers?: readonly string[];
  }): FakeSheetProperties {
    const headers = options.headers ?? ["Name"];
    const columnIds = options.columnIds ?? headers.map(() => "");
    return {
      sheetId: options.sheetId,
      title: options.title,
      rows: buildGridRows({
        0: columnIds,
        3: headers,
        4: [],
      }),
      table: { endRowIndex: 5 },
    };
  }

  function sheetConfigRow(props: {
    sheetId: number;
    title: string;
    leftoverIdPrefix: string;
  }) {
    return [props.sheetId, props.title, true, props.leftoverIdPrefix];
  }

  it("assigns a generated prefix to a new Let api access sheet and mints column IDs with it", () => {
    seedFixture({
      extraSheets: [
        letApiAccessSheet({ sheetId: propertyGid, title: "Property" }),
      ],
      extraSheetConfigDataRows: {
        5: sheetConfigRow({
          sheetId: propertyGid,
          title: "Property",
          leftoverIdPrefix: "zzzz",
        }),
      },
      sheetConfigTableEndRowIndex: 6,
    });

    const parsed = ConfigOrchestrator.init().generateConfigFiles();
    expect(parsed.sheetConfigs).toContain(
      `"property": { "sheetGid": ${propertyGid}, "idPrefix": "prp", "hasIdColumn": false }`,
    );
    expect(parsed.columnConfigs).toMatch(/c:prp:/);
  });

  it("samples an existing sheet's prefix from its column IDs, whatever the tab title is now", () => {
    seedFixture({
      extraSheets: [
        letApiAccessSheet({
          sheetId: propertyGid,
          title: "Renamed Tab",
          columnIds: ["c:prp:abc1234"],
        }),
      ],
      extraSheetConfigDataRows: {
        5: sheetConfigRow({
          sheetId: propertyGid,
          title: "Renamed Tab",
          leftoverIdPrefix: "zzzz",
        }),
      },
      sheetConfigTableEndRowIndex: 6,
    });

    const parsed = ConfigOrchestrator.init().generateConfigFiles();
    expect(parsed.sheetConfigs).toContain(
      `"renamedTab": { "sheetGid": ${propertyGid}, "idPrefix": "prp", "hasIdColumn": false }`,
    );
  });

  it("mints blank column ID cells on an existing sheet with the sampled prefix", () => {
    seedFixture({
      extraSheets: [
        letApiAccessSheet({
          sheetId: propertyGid,
          title: "Property",
          columnIds: ["c:prp:abc1234", ""],
          headers: ["Name", "Notes"],
        }),
      ],
      extraSheetConfigDataRows: {
        5: sheetConfigRow({
          sheetId: propertyGid,
          title: "Property",
          leftoverIdPrefix: "zzzz",
        }),
      },
      sheetConfigTableEndRowIndex: 6,
    });

    const parsed = ConfigOrchestrator.init().generateConfigFiles();
    const minted = parsed.columnConfigs.match(/c:prp:[^"]+/g) ?? [];
    expect(minted).toHaveLength(2);
    expect(minted).toContain("c:prp:abc1234");
  });

  it("stops when one sheet's column IDs carry mixed prefixes, naming the sheet and stray IDs", () => {
    seedFixture({
      extraSheets: [
        letApiAccessSheet({
          sheetId: propertyGid,
          title: "Property",
          columnIds: ["c:prp:abc1234", "c:unt:xyz1234"],
          headers: ["Name", "Notes"],
        }),
      ],
      extraSheetConfigDataRows: {
        5: sheetConfigRow({
          sheetId: propertyGid,
          title: "Property",
          leftoverIdPrefix: "prp",
        }),
      },
      sheetConfigTableEndRowIndex: 6,
    });

    expect(() => ConfigOrchestrator.init().syncConfigSheetRows()).toThrow(
      /Property.*c:unt:xyz1234/,
    );
  });

  it("stops when two sheets share a sampled prefix, named by sheet title", () => {
    seedFixture({
      extraSheets: [
        letApiAccessSheet({
          sheetId: propertyGid,
          title: "Property",
          columnIds: ["c:prp:aaa1111"],
        }),
        letApiAccessSheet({
          sheetId: propertiesGid,
          title: "Unit",
          columnIds: ["c:prp:bbb2222"],
        }),
      ],
      extraSheetConfigDataRows: {
        5: sheetConfigRow({
          sheetId: propertyGid,
          title: "Property",
          leftoverIdPrefix: "prp",
        }),
        6: sheetConfigRow({
          sheetId: propertiesGid,
          title: "Unit",
          leftoverIdPrefix: "unt",
        }),
      },
      sheetConfigTableEndRowIndex: 7,
    });

    expect(() => ConfigOrchestrator.init().generateConfigFiles()).toThrow(
      /Property.*Unit.*"prp"/,
    );
  });

  it("reports a sampled prefix that differs from the last generated sheet configs without failing", () => {
    seedFixture({ testColumnId: "c:zzz:xyz123" });

    const parsed = ConfigOrchestrator.init().generateConfigFiles();
    expect(parsed.idPrefixReport).toBe(
      'Sheet "Test" sampled ID prefix "zzz" differs from last generated "test".',
    );
    expect(parsed.sheetConfigs).toContain('"idPrefix": "zzz"');
  });

  it("gives a tab without Let api access no prefix and no column IDs", () => {
    seedFixture({
      extraSheets: [
        letApiAccessSheet({
          sheetId: propertyGid,
          title: "Property",
          columnIds: [""],
        }),
      ],
      extraSheetConfigDataRows: {
        5: [propertyGid, "Property", false, "prp"],
      },
      sheetConfigTableEndRowIndex: 6,
    });

    const parsed = ConfigOrchestrator.init().generateConfigFiles();
    expect(parsed.sheetConfigs).not.toContain("property");
    expect(parsed.columnConfigs).not.toMatch(/c:prp:/);
  });

  it("avoids prefixes sampled from other Let api access sheets in the same run", () => {
    seedFixture({
      extraSheets: [
        letApiAccessSheet({
          sheetId: propertyGid,
          title: "Household",
          columnIds: ["c:prp:abc1234"],
        }),
        letApiAccessSheet({
          sheetId: propertiesGid,
          title: "Property",
        }),
      ],
      extraSheetConfigDataRows: {
        5: sheetConfigRow({
          sheetId: propertyGid,
          title: "Household",
          leftoverIdPrefix: "hsh",
        }),
        6: sheetConfigRow({
          sheetId: propertiesGid,
          title: "Property",
          leftoverIdPrefix: "zzzz",
        }),
      },
      sheetConfigTableEndRowIndex: 7,
    });

    const parsed = ConfigOrchestrator.init().generateConfigFiles();
    expect(parsed.sheetConfigs).toContain(
      `"household": { "sheetGid": ${propertyGid}, "idPrefix": "prp", "hasIdColumn": false }`,
    );
    expect(parsed.sheetConfigs).toContain(
      `"property": { "sheetGid": ${propertiesGid}, "idPrefix": "prpr", "hasIdColumn": false }`,
    );
  });
});
