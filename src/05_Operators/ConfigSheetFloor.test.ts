import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { EditProtection } from "../00_Source/RawSource/EditProtection";
import { configSheetFloorSeed } from "../01_SpreadsheetSchema/configSheetFloorSeed";
import { columnConfigs } from "../01_SpreadsheetSchema/generated/columnConfigs";
import { spreadsheetConfig } from "../01_SpreadsheetSchema/generated/spreadsheetConfig";
import { getSheetTraitByName } from "../01_SpreadsheetSchema/sheetConfigsTypes";
import {
  clearSpreadsheetConfigOverlay,
  overlaySpreadsheetConfig,
  ssConfigGet,
} from "../01_SpreadsheetSchema/spreadsheetConfigTypes";
import {
  stubLogger,
  stubPropertiesService,
} from "../testSupport/fakeAppsScriptGlobals";
import {
  buildGridRows,
  stubSheetsService,
  type FakeCell,
} from "../testSupport/fakeSheetsService";
import { ConfigSheetFloor } from "./ConfigSheetFloor";

const spreadsheetConfigGid = getSheetTraitByName(
  "spreadsheetConfig",
  "sheetGid",
);
const sheetConfigGid = getSheetTraitByName("sheetConfig", "sheetGid");
const columnConfigGid = getSheetTraitByName("columnConfig", "sheetGid");
const topDataRowIndex = ssConfigGet("tableHeaderRowIndexBase0") + 1;
const ssc = columnConfigs.spreadsheetConfig;
const sc = columnConfigs.sheetConfig;
const cc = columnConfigs.columnConfig;

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

beforeEach(() => {
  stubPropertiesService({ realEstateSpreadsheetId: "test-spreadsheet-id" });
  stubLogger();
});

afterEach(() => {
  clearSpreadsheetConfigOverlay();
});

function sscField<K extends (typeof sscColumns)[number]>(columnName: K) {
  return ssc[columnName];
}

function floorSeedType(
  sheetName: "spreadsheetConfig" | "sheetConfig" | "columnConfig",
  header: string,
): string | undefined {
  const column = configSheetFloorSeed[sheetName].columns.find(
    (entry) => entry.header === header,
  );
  if (column !== undefined) return column.columnType;
  if (sheetName !== "spreadsheetConfig") return undefined;
  return Object.values(configSheetFloorSeed.spreadsheetConfig.endpoints)
    .flatMap((endpoint) => [endpoint.timeLastRan, endpoint.runStatus])
    .find((entry) => entry.header === header)?.columnType;
}

function declaredTypesByHeader(
  sheetName: "spreadsheetConfig" | "sheetConfig" | "columnConfig",
  headers: readonly string[],
  overrides: Record<string, string> = {},
): Record<number, string> {
  const types: Record<number, string> = {};
  headers.forEach((header, colIndex) => {
    const columnType = overrides[header] ?? floorSeedType(sheetName, header);
    if (columnType !== undefined) types[colIndex] = columnType;
  });
  return types;
}

function spreadsheetConfigDeclaredTypes(
  sscOrder: readonly (typeof sscColumns)[number][],
  sscHeaders: readonly string[],
  options: {
    columnTypesAreUnset?: boolean;
    spreadsheetConfigColumnTypes?: Partial<
      Record<(typeof sscColumns)[number], string>
    >;
  },
): Record<number, string> {
  if (options.columnTypesAreUnset) {
    const types: Record<number, string> = {};
    sscOrder.forEach((columnName, colIndex) => {
      const columnType = options.spreadsheetConfigColumnTypes?.[columnName];
      if (columnType !== undefined) types[colIndex] = columnType;
    });
    return types;
  }
  const typeOverrides = Object.fromEntries(
    Object.entries(options.spreadsheetConfigColumnTypes ?? {}).map(
      ([columnName, columnType]) => [
        sscField(columnName as (typeof sscColumns)[number]).header,
        columnType,
      ],
    ),
  );
  return declaredTypesByHeader("spreadsheetConfig", sscHeaders, typeOverrides);
}

function matchingFloorDeclaredTypes(
  sheetName: "sheetConfig" | "columnConfig",
  headers: readonly string[],
  columnTypesAreUnset: boolean | undefined,
): Record<number, string> | undefined {
  if (columnTypesAreUnset) return undefined;
  return declaredTypesByHeader(sheetName, headers);
}

function sheetAbsoluteTypes(
  types: Record<number, string> | undefined,
  startTableColIndex: number,
): Record<number, string> | undefined {
  if (types === undefined || startTableColIndex === 0) return types;
  return Object.fromEntries(
    Object.entries(types).map(([colIndex, columnType]) => [
      Number(colIndex) + startTableColIndex,
      columnType,
    ]),
  );
}

function padLeadingColumns(
  row: readonly FakeCell[],
  startTableColIndex: number,
): FakeCell[] {
  return [...Array.from({ length: startTableColIndex }, () => null), ...row];
}

function columnTypeUpdates(
  batchUpdateCalls: { requests?: GoogleAppsScript.Sheets.Schema.Request[] }[],
) {
  return (batchUpdateCalls[0]?.requests ?? []).flatMap((request) => {
    const table = request.updateTable?.table;
    if (table?.tableId === undefined) return [];
    return (table.columnProperties ?? []).flatMap((column) => {
      if (column.columnIndex === undefined || column.columnType === undefined) {
        return [];
      }
      return [
        {
          tableId: table.tableId,
          columnIndex: column.columnIndex,
          columnType: column.columnType,
        },
      ];
    });
  });
}

function floorFixture(
  options: {
    spreadsheetConfigColumnOrder?: readonly (typeof sscColumns)[number][];
    spreadsheetConfigHeaders?: Partial<
      Record<(typeof sscColumns)[number], string>
    >;
    spreadsheetConfigColumnTypes?: Partial<
      Record<(typeof sscColumns)[number], string>
    >;
    columnTypesAreUnset?: boolean;
    startTableColIndex?: number;
    spreadsheetConfigProtections?: GoogleAppsScript.Sheets.Schema.ProtectedRange[];
    sheetConfigProtections?: GoogleAppsScript.Sheets.Schema.ProtectedRange[];
  } = {},
) {
  const startTableColIndex = options.startTableColIndex ?? 0;
  const pad = (row: readonly FakeCell[]) =>
    padLeadingColumns(row, startTableColIndex);
  const sscOrder = options.spreadsheetConfigColumnOrder ?? sscColumns;
  const sscHeaders = sscOrder.map(
    (columnName) =>
      options.spreadsheetConfigHeaders?.[columnName] ??
      sscField(columnName).header,
  );
  const groupHeadings = sscOrder.map((columnName) => {
    if (
      columnName === "fillRowIdsTimeLastRan" ||
      columnName === "fillRowIdsRunStatus"
    ) {
      return "Fill Row IDs";
    }
    if (
      columnName === "syncConfigSheetRowsTimeLastRan" ||
      columnName === "syncConfigSheetRowsRunStatus"
    ) {
      return "Sync Config Sheet Rows";
    }
    if (columnName === "tableMenuSpace") return "";
    return "Spreadsheet Rules";
  });
  const dataRow = sscOrder.map((columnName) => {
    if (columnName === "idDelimiter") return ":";
    if (columnName === "idHeader") return "ID";
    if (columnName === "startTableColumnIndexBase1") return 1;
    if (columnName === "columnIdRowIndexBase1") return 1;
    if (columnName === "columnGroupHeadingRowIndexBase1") return 2;
    if (columnName === "actionRowIndexBase1") return 3;
    if (columnName === "tableHeaderRowIndexBase1") return 4;
    return "";
  });

  return stubSheetsService({
    sheets: [
      {
        sheetId: spreadsheetConfigGid,
        title: "Spreadsheet Config",
        rows: buildGridRows({
          0: pad(sscOrder.map((columnName) => sscField(columnName).columnId)),
          1: pad(groupHeadings),
          3: pad(sscHeaders),
          4: pad(dataRow),
        }),
        table: {
          startColumnIndex: startTableColIndex,
          endRowIndex: 5,
          endColumnIndex: startTableColIndex + sscOrder.length,
          columnDeclaredTypes: sheetAbsoluteTypes(
            spreadsheetConfigDeclaredTypes(sscOrder, sscHeaders, options),
            startTableColIndex,
          ),
        },
        protectedRanges: options.spreadsheetConfigProtections,
      },
      {
        sheetId: sheetConfigGid,
        title: "Sheet Config",
        rows: buildGridRows({
          0: pad([
            sc.sheetGid.columnId,
            sc.sheetTitle.columnId,
            sc.letApiAccess.columnId,
          ]),
          3: pad([
            sc.sheetGid.header,
            sc.sheetTitle.header,
            sc.letApiAccess.header,
          ]),
          4: pad([sheetConfigGid, "Sheet Config", true]),
          5: pad([columnConfigGid, "Column Config", true]),
        }),
        table: {
          startColumnIndex: startTableColIndex,
          endRowIndex: 6,
          endColumnIndex: startTableColIndex + 3,
          columnDeclaredTypes: sheetAbsoluteTypes(
            matchingFloorDeclaredTypes(
              "sheetConfig",
              [
                sc.sheetGid.header,
                sc.sheetTitle.header,
                sc.letApiAccess.header,
              ],
              options.columnTypesAreUnset,
            ),
            startTableColIndex,
          ),
        },
        protectedRanges: options.sheetConfigProtections,
      },
      {
        sheetId: columnConfigGid,
        title: "Column Config",
        rows: buildGridRows({
          0: pad([
            cc.sheetGid.columnId,
            cc.columnId.columnId,
            cc.sheetTitle.columnId,
            cc.header.columnId,
            cc.emptyValueAllowed.columnId,
            cc.customDefaultValue.columnId,
          ]),
          3: pad([
            cc.sheetGid.header,
            cc.columnId.header,
            cc.sheetTitle.header,
            cc.header.header,
            cc.emptyValueAllowed.header,
            cc.customDefaultValue.header,
          ]),
          4: pad([]),
        }),
        table: {
          startColumnIndex: startTableColIndex,
          endRowIndex: 5,
          endColumnIndex: startTableColIndex + 6,
          columnDeclaredTypes: sheetAbsoluteTypes(
            matchingFloorDeclaredTypes(
              "columnConfig",
              [
                cc.sheetGid.header,
                cc.columnId.header,
                cc.sheetTitle.header,
                cc.header.header,
                cc.emptyValueAllowed.header,
                cc.customDefaultValue.header,
              ],
              options.columnTypesAreUnset,
            ),
            startTableColIndex,
          ),
        },
      },
    ],
  });
}

function applyFloor() {
  const floor = ConfigSheetFloor.init();
  const report = floor.ensure();
  floor.ss.batchUpdateGSheets();
  return { floor, report };
}

function protectionsOf(
  floor: ConfigSheetFloor,
  sheetName: "spreadsheetConfig" | "sheetConfig" | "columnConfig",
) {
  const sheet = floor.ss.sheet(sheetName);
  sheet.prepFetchEditProtections();
  floor.ss.fetchAllPrepped({ skipFetchingProperties: true });
  return sheet.editProtections();
}

function floorKey(description: string): string {
  const parts = description.split(" · ");
  const columnId = parts[2]?.match(/\(([^)]+)\)$/)?.[1] ?? "";
  return `${columnId} · ${parts[3]} · ${parts[4]}`;
}

function keysOf(protections: EditProtection[]): string[] {
  return protections.flatMap((protection) =>
    protection.kind === "unmodelable" ? [] : [floorKey(protection.description)],
  );
}

describe("ConfigSheetFloor", () => {
  it("warns on every floor cell and locks none", () => {
    floorFixture();
    const { floor } = applyFloor();

    const spreadsheet = protectionsOf(floor, "spreadsheetConfig");
    const sheetConfig = protectionsOf(floor, "sheetConfig");
    const columnConfig = protectionsOf(floor, "columnConfig");
    const all = [...spreadsheet, ...sheetConfig, ...columnConfig];

    expect(all).toHaveLength(48);
    expect(all.every((protection) => protection.kind === "warning")).toBe(true);
    expect(all.some((protection) => protection.kind === "lock")).toBe(false);

    const spreadsheetKeys = keysOf(spreadsheet);
    expect(spreadsheetKeys).toContain(
      `${ssc.tableMenuSpace.columnId} · data · warning`,
    );
    expect(spreadsheetKeys).toContain(
      `${ssc.fillRowIdsTimeLastRan.columnId} · group heading · warning`,
    );
    expect(spreadsheetKeys).toContain(
      `${ssc.idDelimiter.columnId} · group heading · warning`,
    );
    expect(spreadsheetKeys).not.toContain(
      `${ssc.idHeader.columnId} · data · warning`,
    );

    const columnKeys = keysOf(columnConfig);
    expect(columnKeys).toContain(`${cc.header.columnId} · header · warning`);
    expect(columnKeys).not.toContain(
      `${cc.customDefaultValue.columnId} · header · warning`,
    );
  });

  it("warns on the seeded endpoint feedback data cells", () => {
    floorFixture();
    const { floor } = applyFloor();
    const keys = keysOf(protectionsOf(floor, "spreadsheetConfig"));

    expect(keys).toContain(
      `${ssc.fillRowIdsTimeLastRan.columnId} · data · warning`,
    );
    expect(keys).toContain(
      `${ssc.fillRowIdsRunStatus.columnId} · data · warning`,
    );
    expect(keys).toContain(
      `${ssc.syncConfigSheetRowsTimeLastRan.columnId} · data · warning`,
    );
    expect(keys).toContain(
      `${ssc.syncConfigSheetRowsRunStatus.columnId} · data · warning`,
    );
  });

  it("queues nothing on a second run", () => {
    const { batchUpdateCalls } = floorFixture();
    const { floor } = applyFloor();
    floor.ensure();
    floor.ss.batchUpdateGSheets();
    expect(batchUpdateCalls).toHaveLength(1);
  });

  it("replaces a drifted floor protection and reports it", () => {
    const driftedDescription = `Config-sheet floor · Spreadsheet Config · Table menu space (${ssc.tableMenuSpace.columnId}) · data · warning`;
    floorFixture({
      spreadsheetConfigProtections: [
        {
          protectedRangeId: 41,
          description: driftedDescription,
          warningOnly: true,
          range: {
            sheetId: spreadsheetConfigGid,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 0,
            endColumnIndex: 1,
          },
        },
      ],
    });
    const { floor, report } = applyFloor();
    const data = protectionsOf(floor, "spreadsheetConfig").find(
      (protection) =>
        protection.kind !== "unmodelable" &&
        floorKey(protection.description) ===
          `${ssc.tableMenuSpace.columnId} · data · warning`,
    );

    expect(report).toContain("Replaced drifted:");
    expect(report).toContain(driftedDescription);
    expect(data).toMatchObject({
      range: {
        startRowIndex: topDataRowIndex,
        endRowIndex: topDataRowIndex + 1,
        startColumnIndex: 0,
        endColumnIndex: 1,
      },
    });
  });

  it("recognises a renamed header by column ID and does not add a duplicate", () => {
    const { batchUpdateCalls } = floorFixture({
      spreadsheetConfigHeaders: { tableMenuSpace: "Menu spacer" },
      spreadsheetConfigProtections: [
        {
          protectedRangeId: 42,
          description: `Config-sheet floor · Spreadsheet Config · Table menu space (${ssc.tableMenuSpace.columnId}) · header · warning`,
          warningOnly: true,
          range: {
            sheetId: spreadsheetConfigGid,
            startRowIndex: 3,
            endRowIndex: 4,
            startColumnIndex: 0,
            endColumnIndex: 1,
          },
        },
      ],
    });
    const { floor } = applyFloor();
    const headers = keysOf(protectionsOf(floor, "spreadsheetConfig")).filter(
      (key) => key === `${ssc.tableMenuSpace.columnId} · header · warning`,
    );

    expect(headers).toHaveLength(1);
    const addedHeaders = (batchUpdateCalls[0]?.requests ?? []).filter(
      (request) =>
        request.addProtectedRange?.protectedRange?.description?.includes(
          `${ssc.tableMenuSpace.columnId}) · header · warning`,
        ),
    );
    expect(addedHeaders).toHaveLength(0);
  });

  it("removes extra floor matches for the same key and reports them", () => {
    const description = `Config-sheet floor · Spreadsheet Config · Table menu space (${ssc.tableMenuSpace.columnId}) · data · warning`;
    const inPlace = {
      sheetId: spreadsheetConfigGid,
      startRowIndex: topDataRowIndex,
      endRowIndex: topDataRowIndex + 1,
      startColumnIndex: 0,
      endColumnIndex: 1,
    };
    floorFixture({
      spreadsheetConfigProtections: [
        {
          protectedRangeId: 51,
          description,
          warningOnly: true,
          range: inPlace,
        },
        {
          protectedRangeId: 52,
          description,
          warningOnly: true,
          range: {
            ...inPlace,
            startRowIndex: 0,
            endRowIndex: 1,
          },
        },
      ],
    });
    const { floor, report } = applyFloor();
    const data = protectionsOf(floor, "spreadsheetConfig").filter(
      (protection) =>
        protection.kind !== "unmodelable" &&
        floorKey(protection.description) ===
          `${ssc.tableMenuSpace.columnId} · data · warning`,
    );

    expect(report).toContain("Removed duplicates:");
    expect(report).toContain(description);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ range: inPlace });
  });

  it("reports a misplaced Table menu space and adds nothing for Spreadsheet Config", () => {
    floorFixture({
      spreadsheetConfigColumnOrder: [
        "idDelimiter",
        "tableMenuSpace",
        "fillRowIdsTimeLastRan",
        "fillRowIdsRunStatus",
        "syncConfigSheetRowsTimeLastRan",
        "syncConfigSheetRowsRunStatus",
        "idHeader",
        "startTableColumnIndexBase1",
        "columnIdRowIndexBase1",
        "columnGroupHeadingRowIndexBase1",
        "actionRowIndexBase1",
        "tableHeaderRowIndexBase1",
      ],
    });
    const { floor, report } = applyFloor();

    expect(report).toContain(
      "Table menu space is not the first Spreadsheet Config Table column; nothing was added for that sheet.",
    );
    expect(protectionsOf(floor, "spreadsheetConfig")).toHaveLength(0);
    expect(protectionsOf(floor, "sheetConfig").length).toBeGreaterThan(0);
  });

  it("sets a floor column whose type differs from the seed and reports it", () => {
    const { batchUpdateCalls } = floorFixture({
      spreadsheetConfigColumnTypes: { tableMenuSpace: "DOUBLE" },
    });
    const { report } = applyFloor();

    expect(report).toContain("Set column types:");
    expect(report).toContain(
      `Spreadsheet Config · Table menu space (${ssc.tableMenuSpace.columnId}) → TEXT`,
    );
    expect(columnTypeUpdates(batchUpdateCalls)).toContainEqual({
      tableId: `fake-table-${spreadsheetConfigGid}`,
      columnIndex: 0,
      columnType: "TEXT",
    });
    expect(
      (batchUpdateCalls[0]?.requests ?? []).filter(
        (request) => request.updateTable !== undefined,
      ),
    ).toHaveLength(1);
  });

  it("leaves matching floor column types unchanged", () => {
    const { batchUpdateCalls } = floorFixture();
    const { report } = applyFloor();

    expect(report).not.toContain("Set column types:");
    expect(columnTypeUpdates(batchUpdateCalls)).toEqual([]);
  });

  it("does not set a type on Custom default value", () => {
    const { batchUpdateCalls } = floorFixture({ columnTypesAreUnset: true });
    applyFloor();

    expect(columnTypeUpdates(batchUpdateCalls)).not.toContainEqual(
      expect.objectContaining({
        tableId: `fake-table-${columnConfigGid}`,
        columnIndex: 5,
      }),
    );
  });

  it("does not queue column-type updates on a second run after setting them", () => {
    const { batchUpdateCalls } = floorFixture({ columnTypesAreUnset: true });
    applyFloor();

    expect(columnTypeUpdates(batchUpdateCalls).length).toBeGreaterThan(0);
    applyFloor();
    expect(batchUpdateCalls).toHaveLength(1);
  });

  it("sets a drifted floor column type when the Table starts after column A", () => {
    overlaySpreadsheetConfig({
      ...spreadsheetConfig,
      startTableColIndexBase0: 1,
    });
    const { batchUpdateCalls } = floorFixture({
      startTableColIndex: 1,
      spreadsheetConfigColumnTypes: { tableMenuSpace: "DOUBLE" },
    });
    applyFloor();

    expect(columnTypeUpdates(batchUpdateCalls)).toContainEqual({
      tableId: `fake-table-${spreadsheetConfigGid}`,
      columnIndex: 0,
      columnType: "TEXT",
    });
    applyFloor();
    expect(batchUpdateCalls).toHaveLength(1);
  });
});
