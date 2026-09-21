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
  type FakeSheetProperties,
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

function firstFlushRequests(
  batchUpdateCalls: { requests?: GoogleAppsScript.Sheets.Schema.Request[] }[],
): GoogleAppsScript.Sheets.Schema.Request[] {
  return batchUpdateCalls[0]?.requests ?? [];
}

function sheetTitleUpdates(
  batchUpdateCalls: { requests?: GoogleAppsScript.Sheets.Schema.Request[] }[],
) {
  return firstFlushRequests(batchUpdateCalls).flatMap((request) => {
    const properties = request.updateSheetProperties?.properties;
    if (properties?.sheetId === undefined || properties.title === undefined) {
      return [];
    }
    return [{ sheetId: properties.sheetId, title: properties.title }];
  });
}

function tableNameUpdates(
  batchUpdateCalls: { requests?: GoogleAppsScript.Sheets.Schema.Request[] }[],
) {
  return firstFlushRequests(batchUpdateCalls).flatMap((request) => {
    const table = request.updateTable?.table;
    if (
      request.updateTable?.fields !== "name" ||
      table?.tableId === undefined ||
      table.name === undefined
    ) {
      return [];
    }
    return [{ tableId: table.tableId, name: table.name }];
  });
}

function cellUpdates(
  batchUpdateCalls: { requests?: GoogleAppsScript.Sheets.Schema.Request[] }[],
) {
  return firstFlushRequests(batchUpdateCalls).flatMap((request) => {
    const update = request.updateCells;
    const range = update?.range;
    if (
      range?.sheetId === undefined ||
      range.startRowIndex === undefined ||
      range.startColumnIndex === undefined
    ) {
      return [];
    }
    return [
      {
        sheetId: range.sheetId,
        rowIndex: range.startRowIndex,
        colIndex: range.startColumnIndex,
        value: update?.rows?.[0]?.values?.[0]?.userEnteredValue?.stringValue,
      },
    ];
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

const businessSheetGid = 9001;
const defaultSheetConfigGids = [
  businessSheetGid,
  spreadsheetConfigGid,
  sheetConfigGid,
  columnConfigGid,
  valueConfigGid,
];
const defaultColumnConfigColumnIds = [
  "c:biz:one",
  sc.letApiAccess.columnId,
  "c:biz:two",
  cc.emptyValueAllowed.columnId,
  cc.header.columnId,
];

function dataRowsFrom(
  topRowIndex: number,
  rows: readonly FakeCell[][],
): Record<number, FakeCell[]> {
  return Object.fromEntries(rows.map((row, i) => [topRowIndex + i, row]));
}

function floorFixture(
  options: {
    spreadsheetConfigColumnOrder?: readonly (typeof sscColumns)[number][];
    spreadsheetConfigHeaders?: Partial<
      Record<(typeof sscColumns)[number], string>
    >;
    spreadsheetConfigColumnIds?: Partial<
      Record<(typeof sscColumns)[number], string>
    >;
    spreadsheetConfigGroupHeadings?: Partial<
      Record<(typeof sscColumns)[number], string>
    >;
    spreadsheetConfigColumnTypes?: Partial<
      Record<(typeof sscColumns)[number], string>
    >;
    columnTypesAreUnset?: boolean;
    tableMenuSpaceValue?: string;
    startTableColIndex?: number;
    spreadsheetConfigProtections?: GoogleAppsScript.Sheets.Schema.ProtectedRange[];
    sheetConfigProtections?: GoogleAppsScript.Sheets.Schema.ProtectedRange[];
    columnConfigProtections?: GoogleAppsScript.Sheets.Schema.ProtectedRange[];
    sheetConfigGids?: readonly number[];
    columnConfigColumnIds?: readonly string[];
    spreadsheetConfigTitle?: string;
    spreadsheetConfigTableName?: string;
    valueConfig?: {
      title?: string;
      tableName?: string;
    };
    extraSheets?: FakeSheetProperties[];
    omitSpreadsheetConfigTable?: boolean;
    spreadsheetConfigExtraTables?: NonNullable<
      FakeSheetProperties["extraTables"]
    >;
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
  const sscColumnIds = sscOrder.map(
    (columnName) =>
      options.spreadsheetConfigColumnIds?.[columnName] ??
      sscField(columnName).columnId,
  );
  const groupHeadings = sscOrder.map(
    (columnName) =>
      options.spreadsheetConfigGroupHeadings?.[columnName] ??
      spreadsheetConfigGroupHeading(sscField(columnName).header),
  );
  const extraColumn = options.extraSpreadsheetConfigColumn;
  const sheetConfigGids = options.sheetConfigGids ?? defaultSheetConfigGids;
  const columnConfigColumnIds =
    options.columnConfigColumnIds ?? defaultColumnConfigColumnIds;
  const dataRow = sscOrder.map((columnName) => {
    if (columnName === "tableMenuSpace") {
      return options.tableMenuSpaceValue ?? "Not used";
    }
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
        title: options.spreadsheetConfigTitle ?? "Spreadsheet Config",
        rows: buildGridRows({
          0: pad(withExtraColumn(sscColumnIds, extraColumn?.columnId)),
          1: pad(
            withExtraColumn(groupHeadings, extraColumn?.groupHeading ?? ""),
          ),
          3: pad(withExtraColumn(sscHeaders, extraColumn?.header)),
          4: pad(withExtraColumn(dataRow, "")),
        }),
        table: options.omitSpreadsheetConfigTable
          ? undefined
          : {
              name:
                options.spreadsheetConfigTableName ??
                configSheetFloorSeed.spreadsheetConfig.tableName,
              startColumnIndex: startTableColIndex,
              endRowIndex: 5,
              endColumnIndex:
                startTableColIndex +
                sscOrder.length +
                (extraColumn === undefined ? 0 : 1),
              columnTypes: sheetAbsoluteTypes(
                spreadsheetConfigFixtureColumnTypes(
                  sscOrder,
                  sscHeaders,
                  options,
                ),
                startTableColIndex,
              ),
            },
        extraTables: options.spreadsheetConfigExtraTables,
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
          ...dataRowsFrom(
            topDataRowIndex,
            sheetConfigGids.map((gid) => pad([gid, `Tab ${gid}`, true])),
          ),
        }),
        table: {
          name: configSheetFloorSeed.sheetConfig.tableName,
          startColumnIndex: startTableColIndex,
          endRowIndex: topDataRowIndex + sheetConfigGids.length,
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
          ...dataRowsFrom(
            topDataRowIndex,
            columnConfigColumnIds.map((columnId) =>
              pad(["", columnId, "", "", false, ""]),
            ),
          ),
        }),
        table: {
          name: configSheetFloorSeed.columnConfig.tableName,
          startColumnIndex: startTableColIndex,
          endRowIndex: topDataRowIndex + columnConfigColumnIds.length,
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
        title:
          options.valueConfig?.title ?? configSheetFloorSeed.valueConfig.title,
        table: {
          name:
            options.valueConfig?.tableName ??
            configSheetFloorSeed.valueConfig.tableName,
          endRowIndex: 5,
        },
      },
      ...(options.extraSheets ?? []),
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
    endRowIndex: topDataRowIndex + 1,
    startColumnIndex: 2,
    endColumnIndex: 3,
  },
  {
    sheetId: sheetConfigGid,
    startRowIndex: topDataRowIndex + defaultSheetConfigGids.length,
    startColumnIndex: 2,
    endColumnIndex: 3,
  },
];
const columnConfigEditableRanges = [
  {
    sheetId: columnConfigGid,
    startRowIndex: topDataRowIndex,
    endRowIndex: topDataRowIndex + 1,
    startColumnIndex: 4,
    endColumnIndex: 5,
  },
  {
    sheetId: columnConfigGid,
    startRowIndex: topDataRowIndex,
    startColumnIndex: 5,
    endColumnIndex: 6,
  },
  {
    sheetId: columnConfigGid,
    startRowIndex: topDataRowIndex + 2,
    endRowIndex: topDataRowIndex + 3,
    startColumnIndex: 4,
    endColumnIndex: 5,
  },
  {
    sheetId: columnConfigGid,
    startRowIndex: topDataRowIndex + 5,
    startColumnIndex: 4,
    endColumnIndex: 5,
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

  it("carves the four floor rows out of Sheet Config's Let api access column, leaving a bounded range above and an open-ended one below", () => {
    floorFixture();
    const { floor } = applyFloor();

    expect(protectionsOf(floor, "sheetConfig")[0]?.unprotectedRanges).toEqual(
      sheetConfigEditableRanges,
    );
  });

  it("carves Column Config's Empty value allowed at each floor column's row and leaves a business column's row and Custom default value editable", () => {
    floorFixture();
    const { floor } = applyFloor();

    expect(protectionsOf(floor, "columnConfig")[0]?.unprotectedRanges).toEqual(
      columnConfigEditableRanges,
    );
  });

  it("keeps Column Config's two editable columns merged while no floor column has a row", () => {
    floorFixture({ columnConfigColumnIds: ["c:biz:one"] });
    const { floor } = applyFloor();

    expect(protectionsOf(floor, "columnConfig")[0]?.unprotectedRanges).toEqual([
      {
        sheetId: columnConfigGid,
        startRowIndex: topDataRowIndex,
        startColumnIndex: 4,
        endColumnIndex: 6,
      },
    ]);
  });

  it("leaves a floor tab's row uncarved when Sheet Config holds none for it, and does not throw", () => {
    floorFixture({ sheetConfigGids: [businessSheetGid] });
    const { floor } = applyFloor();

    expect(protectionsOf(floor, "sheetConfig")[0]?.unprotectedRanges).toEqual([
      {
        sheetId: sheetConfigGid,
        startRowIndex: topDataRowIndex,
        startColumnIndex: 2,
        endColumnIndex: 3,
      },
    ]);
  });

  it("queues no protection change on a second sync against the fixture the first one left", () => {
    const { batchUpdateCalls } = floorFixture();
    applyFloor();
    expect(batchUpdateCalls).toHaveLength(1);

    const second = applyFloor();

    expect(second.report).toBe("");
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

  it("renames a drifted floor tab back and reports it", () => {
    const { batchUpdateCalls } = floorFixture({
      spreadsheetConfigTitle: "Old Spreadsheet Config",
    });
    const { report } = applyFloor();

    expect(report).toContain(
      'Restored tab titles: "Old Spreadsheet Config" → Spreadsheet Config',
    );
    expect(sheetTitleUpdates(batchUpdateCalls)).toContainEqual({
      sheetId: spreadsheetConfigGid,
      title: "Spreadsheet Config",
    });
  });

  it("names a restored tab by its seed title in the rest of the report", () => {
    floorFixture({
      spreadsheetConfigTitle: "Old Spreadsheet Config",
      spreadsheetConfigHeaders: { tableMenuSpace: "Menu spacer" },
      spreadsheetConfigColumnTypes: { idHeader: "DOUBLE" },
      extraSpreadsheetConfigColumn: {
        columnId: "c:sscf:notes",
        header: "Notes",
      },
    });
    const { report } = applyFloor();

    expect(report).toContain(
      `Spreadsheet Config · Menu spacer (${ssc.tableMenuSpace.columnId}) → Table menu space`,
    );
    expect(report).toContain(
      `Spreadsheet Config · ID header (${ssc.idHeader.columnId}) → TEXT`,
    );
    expect(report).toContain(
      "Covered added columns: Spreadsheet Config · Notes",
    );
    expect(report).not.toContain("Old Spreadsheet Config ·");
  });

  it("renames Value Config's tab back and reports it", () => {
    const { batchUpdateCalls } = floorFixture({
      valueConfig: { title: "Values" },
    });
    const { report } = applyFloor();

    expect(report).toContain('Restored tab titles: "Values" → Value Config');
    expect(sheetTitleUpdates(batchUpdateCalls)).toContainEqual({
      sheetId: valueConfigGid,
      title: "Value Config",
    });
  });

  it("renames a wrongly named floor Table and reports it", () => {
    const { batchUpdateCalls } = floorFixture({
      spreadsheetConfigTableName: "wrongTable",
    });
    const { report } = applyFloor();

    expect(report).toContain(
      `Restored Table names: Spreadsheet Config's Table "wrongTable" → spreadsheetConfig`,
    );
    expect(tableNameUpdates(batchUpdateCalls)).toContainEqual({
      tableId: `fake-table-${spreadsheetConfigGid}`,
      name: "spreadsheetConfig",
    });
  });

  it("renames Value Config's Table back to valueConfig", () => {
    const { batchUpdateCalls } = floorFixture({
      valueConfig: { tableName: "values" },
    });
    const { report } = applyFloor();

    expect(report).toContain(
      `Restored Table names: Value Config's Table "values" → valueConfig`,
    );
    expect(tableNameUpdates(batchUpdateCalls)).toContainEqual({
      tableId: `fake-table-${valueConfigGid}`,
      name: "valueConfig",
    });
  });

  it("throws naming the tab when a floor title sits on the wrong GID, and flushes nothing", () => {
    const { batchUpdateCalls } = floorFixture({
      spreadsheetConfigTitle: "Old Spreadsheet Config",
      extraSheets: [
        {
          sheetId: 999001,
          title: "Spreadsheet Config",
          table: { endRowIndex: 5 },
        },
      ],
    });

    expect(() => applyFloor()).toThrow(
      'A tab titled "Spreadsheet Config" is not the floor tab.',
    );
    expect(batchUpdateCalls).toHaveLength(0);
  });

  it("throws naming the tab when a floor tab has no Table, and flushes nothing", () => {
    const { batchUpdateCalls } = floorFixture({
      omitSpreadsheetConfigTable: true,
    });

    expect(() => applyFloor()).toThrow(
      'Floor tab "Spreadsheet Config" has no Table.',
    );
    expect(batchUpdateCalls).toHaveLength(0);
  });

  it("throws naming the tab when several Tables are present and none has the floor name, and flushes nothing", () => {
    const { batchUpdateCalls } = floorFixture({
      spreadsheetConfigTableName: "firstWrong",
      spreadsheetConfigExtraTables: [{ endRowIndex: 5, name: "secondWrong" }],
    });

    expect(() => applyFloor()).toThrow(
      'Floor tab "Spreadsheet Config" has several Tables and none is named spreadsheetConfig.',
    );
    expect(batchUpdateCalls).toHaveLength(0);
  });

  it("throws naming the tab when several Tables are present and one has the floor name, and flushes nothing", () => {
    const { batchUpdateCalls } = floorFixture({
      spreadsheetConfigExtraTables: [{ endRowIndex: 5, name: "extra" }],
    });

    expect(() => applyFloor()).toThrow(
      '1 sheet(s) have more than one Table — delete the extras so each sheet has exactly one: "Spreadsheet Config"',
    );
    expect(batchUpdateCalls).toHaveLength(0);
  });

  it("overwrites a drifted floor header and reports it", () => {
    const { batchUpdateCalls } = floorFixture({
      spreadsheetConfigHeaders: { tableMenuSpace: "Menu spacer" },
    });
    const { report } = applyFloor();

    expect(report).toContain("Restored headers:");
    expect(report).toContain(
      `Spreadsheet Config · Menu spacer (${ssc.tableMenuSpace.columnId}) → Table menu space`,
    );
    expect(cellUpdates(batchUpdateCalls)).toContainEqual({
      sheetId: spreadsheetConfigGid,
      rowIndex: 3,
      colIndex: 0,
      value: "Table menu space",
    });
  });

  it("overwrites a drifted floor column ID and reports it", () => {
    const { batchUpdateCalls } = floorFixture({
      spreadsheetConfigColumnIds: { tableMenuSpace: "c:sscf:drifted" },
    });
    const { report } = applyFloor();

    expect(report).toContain("Restored column IDs:");
    expect(report).toContain(
      `Spreadsheet Config · Table menu space (c:sscf:drifted) → ${ssc.tableMenuSpace.columnId}`,
    );
    expect(cellUpdates(batchUpdateCalls)).toContainEqual({
      sheetId: spreadsheetConfigGid,
      rowIndex: 0,
      colIndex: 0,
      value: ssc.tableMenuSpace.columnId,
    });
  });

  it("overwrites a drifted floor group heading and reports it", () => {
    const { batchUpdateCalls } = floorFixture({
      spreadsheetConfigGroupHeadings: { idHeader: "Rules" },
    });
    const { report } = applyFloor();

    expect(report).toContain("Restored group headings:");
    expect(report).toContain(
      `Spreadsheet Config · ID header (${ssc.idHeader.columnId}) → Spreadsheet Rules`,
    );
    expect(cellUpdates(batchUpdateCalls)).toContainEqual({
      sheetId: spreadsheetConfigGid,
      rowIndex: 1,
      colIndex: sscColumns.indexOf("idHeader"),
      value: "Spreadsheet Rules",
    });
  });

  it("leaves an extra non-floor column's header, column ID and group heading alone", () => {
    const { batchUpdateCalls } = floorFixture({
      extraSpreadsheetConfigColumn: {
        columnId: "c:sscf:notes",
        header: "Notes",
        groupHeading: "Mine",
      },
    });
    applyFloor();

    const extraColIndex = sscColumns.length;
    expect(cellUpdates(batchUpdateCalls)).not.toContainEqual(
      expect.objectContaining({
        sheetId: spreadsheetConfigGid,
        colIndex: extraColIndex,
      }),
    );
  });

  it("writes Not used into a blank Table menu space data cell and reports it", () => {
    const { batchUpdateCalls } = floorFixture({ tableMenuSpaceValue: "" });
    const { report } = applyFloor();

    expect(report).toContain('Restored Table menu space: "" → Not used');
    const dataCellUpdates = cellUpdates(batchUpdateCalls).filter(
      (update) => update.rowIndex === topDataRowIndex,
    );
    expect(dataCellUpdates).toEqual([
      {
        sheetId: spreadsheetConfigGid,
        rowIndex: topDataRowIndex,
        colIndex: 0,
        value: "Not used",
      },
    ]);
  });

  it("queues no Table menu space update when the cell already reads Not used", () => {
    const { batchUpdateCalls } = floorFixture();
    const { report } = applyFloor();

    expect(report).not.toContain("Table menu space");
    expect(
      cellUpdates(batchUpdateCalls).filter(
        (update) => update.rowIndex === topDataRowIndex,
      ),
    ).toEqual([]);
  });

  it("overwrites an edited Table menu space data cell and reports it", () => {
    const { batchUpdateCalls } = floorFixture({ tableMenuSpaceValue: "notes" });
    const { report } = applyFloor();

    expect(report).toContain('Restored Table menu space: "notes" → Not used');
    expect(cellUpdates(batchUpdateCalls)).toContainEqual({
      sheetId: spreadsheetConfigGid,
      rowIndex: topDataRowIndex,
      colIndex: 0,
      value: "Not used",
    });
  });
});
