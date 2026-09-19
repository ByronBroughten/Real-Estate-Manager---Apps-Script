import { beforeEach, describe, expect, it } from "vitest";
import type { EditProtection } from "../00_Source/RawSource/EditProtection";
import { columnConfigs } from "../01_SpreadsheetSchema/generated/columnConfigs";
import { getSheetTraitByName } from "../01_SpreadsheetSchema/sheetConfigsTypes";
import { ssConfigGet } from "../01_SpreadsheetSchema/spreadsheetConfigTypes";
import {
  stubLogger,
  stubPropertiesService,
} from "../testSupport/fakeAppsScriptGlobals";
import {
  buildGridRows,
  stubSheetsService,
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

function sscField<K extends (typeof sscColumns)[number]>(columnName: K) {
  return ssc[columnName];
}

function floorFixture(
  options: {
    spreadsheetConfigColumnOrder?: readonly (typeof sscColumns)[number][];
    spreadsheetConfigHeaders?: Partial<
      Record<(typeof sscColumns)[number], string>
    >;
    spreadsheetConfigProtections?: GoogleAppsScript.Sheets.Schema.ProtectedRange[];
    sheetConfigProtections?: GoogleAppsScript.Sheets.Schema.ProtectedRange[];
  } = {},
) {
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
          0: sscOrder.map((columnName) => sscField(columnName).columnId),
          1: groupHeadings,
          3: sscHeaders,
          4: dataRow,
        }),
        table: { endRowIndex: 5, endColumnIndex: sscOrder.length },
        protectedRanges: options.spreadsheetConfigProtections,
      },
      {
        sheetId: sheetConfigGid,
        title: "Sheet Config",
        rows: buildGridRows({
          0: [
            sc.sheetGid.columnId,
            sc.sheetTitle.columnId,
            sc.letApiAccess.columnId,
          ],
          3: [sc.sheetGid.header, sc.sheetTitle.header, sc.letApiAccess.header],
          4: [sheetConfigGid, "Sheet Config", true],
          5: [columnConfigGid, "Column Config", true],
        }),
        table: { endRowIndex: 6, endColumnIndex: 3 },
        protectedRanges: options.sheetConfigProtections,
      },
      {
        sheetId: columnConfigGid,
        title: "Column Config",
        rows: buildGridRows({
          0: [
            cc.sheetGid.columnId,
            cc.columnId.columnId,
            cc.sheetTitle.columnId,
            cc.header.columnId,
            cc.emptyValueAllowed.columnId,
            cc.customDefaultValue.columnId,
          ],
          3: [
            cc.sheetGid.header,
            cc.columnId.header,
            cc.sheetTitle.header,
            cc.header.header,
            cc.emptyValueAllowed.header,
            cc.customDefaultValue.header,
          ],
          4: [],
        }),
        table: { endRowIndex: 5, endColumnIndex: 6 },
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

    const sheetConfigKeys = keysOf(sheetConfig);
    expect(sheetConfigKeys).not.toContain(
      `${sc.idPrefix.columnId} · header · warning`,
    );
    expect(sheetConfigKeys).not.toContain(
      `${sc.idPrefixIsUniqueOrEmpty.columnId} · data · warning`,
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
});
