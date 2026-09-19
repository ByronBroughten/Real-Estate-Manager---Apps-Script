import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ModelableEditProtection } from "../00_Source/RawSource/EditProtection";
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
const valueConfigGid = getSheetTraitByName("valueConfig", "sheetGid");
const actionRowIndex = ssConfigGet("actionRowIndexBase0");
const topDataRowIndex = ssConfigGet("tableHeaderRowIndexBase0") + 1;
const floorWarningPrefix = "Config-sheet floor";
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

function columnTypesByHeader(
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

function spreadsheetConfigFixtureColumnTypes(
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
  return columnTypesByHeader("spreadsheetConfig", sscHeaders, typeOverrides);
}

function matchingFloorColumnTypes(
  sheetName: "sheetConfig" | "columnConfig",
  headers: readonly string[],
  columnTypesAreUnset: boolean | undefined,
): Record<number, string> | undefined {
  if (columnTypesAreUnset) return undefined;
  return columnTypesByHeader(sheetName, headers);
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

function withExtraColumn<T>(row: T[], extra: T | undefined): T[] {
  if (extra === undefined) return row;
  return [...row, extra];
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
    columnConfigProtections?: GoogleAppsScript.Sheets.Schema.ProtectedRange[];
    extraSpreadsheetConfigColumn?: {
      columnId: string;
      header: string;
      groupHeading?: string;
    };
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
  const extraColumn = options.extraSpreadsheetConfigColumn;
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
          0: pad(
            withExtraColumn(
              sscOrder.map((columnName) => sscField(columnName).columnId),
              extraColumn?.columnId,
            ),
          ),
          1: pad(
            withExtraColumn(groupHeadings, extraColumn?.groupHeading ?? ""),
          ),
          3: pad(withExtraColumn(sscHeaders, extraColumn?.header)),
          4: pad(withExtraColumn(dataRow, "")),
        }),
        table: {
          startColumnIndex: startTableColIndex,
          endRowIndex: 5,
          endColumnIndex:
            startTableColIndex +
            sscOrder.length +
            (extraColumn === undefined ? 0 : 1),
          columnTypes: sheetAbsoluteTypes(
            spreadsheetConfigFixtureColumnTypes(sscOrder, sscHeaders, options),
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
          columnTypes: sheetAbsoluteTypes(
            matchingFloorColumnTypes(
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
          columnTypes: sheetAbsoluteTypes(
            matchingFloorColumnTypes(
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
        protectedRanges: options.columnConfigProtections,
      },
      {
        sheetId: valueConfigGid,
        title: "Value Config",
        table: { endRowIndex: 5 },
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
): ModelableEditProtection[] {
  const sheet = floor.ss.sheet(sheetName);
  sheet.prepFetchEditProtections();
  floor.ss.fetchAllPrepped({ skipFetchingProperties: true });
  return sheet
    .editProtections()
    .flatMap((protection) =>
      protection.kind === "unmodelable" ? [] : [protection],
    );
}

function floorWarningDescription(title: string): string {
  return `${floorWarningPrefix} · ${title} · warning`;
}

function addedProtectedRanges(
  batchUpdateCalls: { requests?: GoogleAppsScript.Sheets.Schema.Request[] }[],
) {
  return (batchUpdateCalls[0]?.requests ?? []).flatMap((request) => {
    const protection = request.addProtectedRange?.protectedRange;
    return protection === undefined ? [] : [protection];
  });
}

function deletedProtectionIds(
  batchUpdateCalls: { requests?: GoogleAppsScript.Sheets.Schema.Request[] }[],
) {
  return (batchUpdateCalls[0]?.requests ?? []).flatMap((request) => {
    const id = request.deleteProtectedRange?.protectedRangeId;
    return id === undefined ? [] : [id];
  });
}

const spreadsheetConfigLayoutRange = {
  sheetId: spreadsheetConfigGid,
  startRowIndex: topDataRowIndex,
  startColumnIndex: 5,
  endColumnIndex: 12,
};
const spreadsheetConfigSelectorRanges = [
  {
    sheetId: spreadsheetConfigGid,
    startRowIndex: actionRowIndex,
    endRowIndex: actionRowIndex + 1,
    startColumnIndex: 1,
    endColumnIndex: 2,
  },
  {
    sheetId: spreadsheetConfigGid,
    startRowIndex: actionRowIndex,
    endRowIndex: actionRowIndex + 1,
    startColumnIndex: 3,
    endColumnIndex: 4,
  },
];
const spreadsheetConfigEditableRanges = [
  ...spreadsheetConfigSelectorRanges,
  spreadsheetConfigLayoutRange,
];
const sheetConfigEditableRanges = [
  {
    sheetId: sheetConfigGid,
    startRowIndex: topDataRowIndex,
    startColumnIndex: 2,
    endColumnIndex: 3,
  },
];
const columnConfigEditableRanges = [
  {
    sheetId: columnConfigGid,
    startRowIndex: topDataRowIndex,
    startColumnIndex: 4,
    endColumnIndex: 6,
  },
];

describe("ConfigSheetFloor", () => {
  it("puts one whole-sheet warning on each of Spreadsheet Config, Sheet Config and Column Config, with editable ranges where an edit sticks, and locks none", () => {
    const { batchUpdateCalls } = floorFixture();
    const { floor } = applyFloor();

    const spreadsheet = protectionsOf(floor, "spreadsheetConfig");
    const sheetConfig = protectionsOf(floor, "sheetConfig");
    const columnConfig = protectionsOf(floor, "columnConfig");
    const all = [...spreadsheet, ...sheetConfig, ...columnConfig];

    expect(all).toHaveLength(3);
    expect(all.every((protection) => protection.kind === "warning")).toBe(true);
    expect(all.some((protection) => protection.kind === "lock")).toBe(false);

    expect(spreadsheet[0]).toMatchObject({
      description: floorWarningDescription("Spreadsheet Config"),
      range: { sheetId: spreadsheetConfigGid },
    });
    expect(spreadsheet[0]?.unprotectedRanges).toEqual(
      spreadsheetConfigEditableRanges,
    );
    expect(sheetConfig[0]).toMatchObject({
      description: floorWarningDescription("Sheet Config"),
      range: { sheetId: sheetConfigGid },
    });
    expect(sheetConfig[0]?.unprotectedRanges).toEqual(
      sheetConfigEditableRanges,
    );
    expect(columnConfig[0]).toMatchObject({
      description: floorWarningDescription("Column Config"),
      range: { sheetId: columnConfigGid },
    });
    expect(columnConfig[0]?.unprotectedRanges).toEqual(
      columnConfigEditableRanges,
    );
    expect(
      addedProtectedRanges(batchUpdateCalls).map(
        (protection) => protection.range?.sheetId,
      ),
    ).not.toContain(valueConfigGid);
  });

  it("queues nothing on a second run", () => {
    const { batchUpdateCalls } = floorFixture();
    const { floor } = applyFloor();
    floor.ensure();
    floor.ss.batchUpdateGSheets();
    expect(batchUpdateCalls).toHaveLength(1);
  });

  it("covers a column added beside the floor and reports it", () => {
    floorFixture({
      extraSpreadsheetConfigColumn: {
        columnId: "c:sscf:notes",
        header: "Notes",
        groupHeading: "Mine",
      },
    });
    const { floor, report } = applyFloor();

    expect(report).toContain("Covered added columns:");
    expect(report).toContain("Spreadsheet Config · Notes");
    expect(
      protectionsOf(floor, "spreadsheetConfig")[0]?.unprotectedRanges,
    ).toEqual([
      ...spreadsheetConfigSelectorRanges,
      { ...spreadsheetConfigLayoutRange, endColumnIndex: 13 },
    ]);
  });

  it("replaces a drifted whole-sheet warning and reports it", () => {
    const driftedDescription = floorWarningDescription("Spreadsheet Config");
    floorFixture({
      spreadsheetConfigProtections: [
        {
          protectedRangeId: 41,
          description: driftedDescription,
          warningOnly: true,
          range: { sheetId: spreadsheetConfigGid },
          unprotectedRanges: [
            {
              sheetId: spreadsheetConfigGid,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: 1,
            },
          ],
        },
      ],
    });
    const { floor, report } = applyFloor();

    expect(report).toContain("Replaced drifted:");
    expect(report).toContain(driftedDescription);
    expect(
      protectionsOf(floor, "spreadsheetConfig")[0]?.unprotectedRanges,
    ).toEqual(spreadsheetConfigEditableRanges);
  });

  it("leaves a hand-set protection untouched", () => {
    const { batchUpdateCalls } = floorFixture({
      sheetConfigProtections: [
        {
          protectedRangeId: 99,
          description: "Hand-set",
          warningOnly: true,
          range: {
            sheetId: sheetConfigGid,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 0,
            endColumnIndex: 1,
          },
        },
      ],
    });
    const { floor } = applyFloor();

    expect(deletedProtectionIds(batchUpdateCalls)).not.toContain(99);
    expect(protectionsOf(floor, "sheetConfig")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 99, description: "Hand-set" }),
        expect.objectContaining({
          description: floorWarningDescription("Sheet Config"),
        }),
      ]),
    );
  });

  it("removes leftover per-cell floor warnings", () => {
    const { batchUpdateCalls } = floorFixture({
      spreadsheetConfigProtections: [
        {
          protectedRangeId: 41,
          description: `${floorWarningPrefix} · Spreadsheet Config · Table menu space (${ssc.tableMenuSpace.columnId}) · data · warning`,
          warningOnly: true,
          range: {
            sheetId: spreadsheetConfigGid,
            startRowIndex: topDataRowIndex,
            endRowIndex: topDataRowIndex + 1,
            startColumnIndex: 0,
            endColumnIndex: 1,
          },
        },
      ],
    });
    const { floor } = applyFloor();

    expect(deletedProtectionIds(batchUpdateCalls)).toContain(41);
    expect(protectionsOf(floor, "spreadsheetConfig")).toHaveLength(1);
    expect(protectionsOf(floor, "spreadsheetConfig")[0]).toMatchObject({
      description: floorWarningDescription("Spreadsheet Config"),
      range: { sheetId: spreadsheetConfigGid },
    });
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
