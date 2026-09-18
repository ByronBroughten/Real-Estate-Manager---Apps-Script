import { beforeEach, describe, expect, it } from "vitest";
import { columnConfigs } from "../01_generatedConfigs/columnConfigs";
import { sheetConfigs } from "../01_generatedConfigs/sheetConfigs";
import { ssConfigGet } from "../01_generatedConfigs/spreadsheetConfigTypes";
import { stubPropertiesService } from "../testSupport/fakeAppsScriptGlobals";
import {
  buildGridRows,
  stubSheetsService,
} from "../testSupport/fakeSheetsService";
import { Val } from "../utils/Val";
import { SpreadsheetNamed } from "./SpreadsheetNamed";

const topDataRowIndex = ssConfigGet("tableHeaderRowIndexBase0") + 1;
const occupancyGid = sheetConfigs.occupancy.sheetGid;
const idColumnId = columnConfigs.occupancy.id.columnId;
const selectColumnId = columnConfigs.occupancy.updateTermsSelect.columnId;
const pink = { red: 244 / 255, green: 204 / 255, blue: 204 / 255 };
const grey = { red: 0.6, green: 0.6, blue: 0.6 };
const green = { red: 0.7, green: 0.9, blue: 0.7 };

const sheetRange = {
  sheetId: occupancyGid,
  startRowIndex: topDataRowIndex,
  endRowIndex: 6,
  startColumnIndex: 0,
  endColumnIndex: 2,
};
const idColumnRange = {
  ...sheetRange,
  startColumnIndex: 0,
  endColumnIndex: 1,
};
const selectColumnRange = {
  ...sheetRange,
  startColumnIndex: 1,
  endColumnIndex: 2,
};

function googleBooleanRule(
  range: GoogleAppsScript.Sheets.Schema.GridRange,
  type: string,
  userEnteredValue: string,
  backgroundColor: { red: number; green: number; blue: number },
): GoogleAppsScript.Sheets.Schema.ConditionalFormatRule {
  return {
    ranges: [range],
    booleanRule: {
      condition: { type, values: [{ userEnteredValue }] },
      format: { backgroundColor },
    },
  };
}

function stubOccupancyWithRules(
  conditionalFormats: GoogleAppsScript.Sheets.Schema.ConditionalFormatRule[],
) {
  return stubSheetsService({
    sheets: [
      {
        sheetId: occupancyGid,
        title: "Occupancy",
        rows: buildGridRows({
          0: [idColumnId, selectColumnId],
          3: ["ID", "Update terms, select"],
          4: ["r:occ:row4", true],
          5: [null, null],
        }),
        table: { endRowIndex: 6, endColumnIndex: 2 },
        conditionalFormats,
      },
    ],
  });
}

function fetchedOccupancy() {
  const ss = SpreadsheetNamed.init();
  const sheet = ss.sheet("occupancy");
  sheet.prepFetchConditionalFormatRules();
  ss.fetchAllPrepped();
  return { ss, sheet };
}

describe("SheetNamed conditional format rules", () => {
  beforeEach(() => {
    stubPropertiesService({ realEstateSpreadsheetId: "test-spreadsheet-id" });
  });

  it("reads a sheet with no rules as an empty list", () => {
    stubOccupancyWithRules([]);
    const { sheet } = fetchedOccupancy();

    expect(sheet.conditionalFormatRules()).toEqual([]);
  });

  it("prepends a column rule so it takes precedence over rules already on the sheet", () => {
    const { batchUpdateCalls } = stubOccupancyWithRules([
      googleBooleanRule(sheetRange, "NUMBER_EQ", "TRUE", grey),
    ]);
    const { ss, sheet } = fetchedOccupancy();

    sheet.column("id").addConditionalFormatRule({
      condition: { type: "NUMBER_EQ", value: true },
      format: { backgroundColor: pink },
    });
    ss.batchUpdateGSheets();

    expect(batchUpdateCalls[0]?.requests).toEqual([
      {
        addConditionalFormatRule: {
          index: 0,
          rule: {
            ranges: [idColumnRange],
            booleanRule: {
              condition: {
                type: "NUMBER_EQ",
                values: [{ userEnteredValue: "TRUE" }],
              },
              format: { backgroundColor: pink },
            },
          },
        },
      },
    ]);

    sheet.prepFetchConditionalFormatRules();
    ss.fetchAllPrepped({ skipFetchingProperties: true });
    expect(sheet.conditionalFormatRules()[0]).toMatchObject({
      kind: "boolean",
      condition: { type: "NUMBER_EQ", value: true },
    });
    expect(sheet.conditionalFormatRules()[1]).toMatchObject({
      kind: "boolean",
      format: { backgroundColor: grey },
    });
  });

  it("removes every rule whose range exactly matches a column and leaves a sheet-wide rule alone", () => {
    const { batchUpdateCalls } = stubOccupancyWithRules([
      googleBooleanRule(sheetRange, "NUMBER_EQ", "TRUE", grey),
      googleBooleanRule(idColumnRange, "NUMBER_EQ", "TRUE", pink),
      googleBooleanRule(selectColumnRange, "NUMBER_EQ", "TRUE", green),
      googleBooleanRule(idColumnRange, "NUMBER_NOT_EQ", "TRUE", green),
    ]);
    const { ss, sheet } = fetchedOccupancy();

    sheet.column("id").removeConditionalFormatRules();
    ss.batchUpdateGSheets();

    expect(batchUpdateCalls[0]?.requests).toEqual([
      { deleteConditionalFormatRule: { sheetId: occupancyGid, index: 3 } },
      { deleteConditionalFormatRule: { sheetId: occupancyGid, index: 1 } },
    ]);

    sheet.prepFetchConditionalFormatRules();
    ss.fetchAllPrepped({ skipFetchingProperties: true });
    const rules = sheet.conditionalFormatRules();
    expect(rules).toHaveLength(2);
    expect(rules[0]).toMatchObject({
      ranges: [sheetRange],
      format: { backgroundColor: grey },
    });
    expect(rules[1]).toMatchObject({
      ranges: [selectColumnRange],
    });
  });

  it("removes a single rule by exact content so a re-stamp can replace it", () => {
    const { batchUpdateCalls } = stubOccupancyWithRules([
      googleBooleanRule(idColumnRange, "NUMBER_EQ", "TRUE", pink),
      googleBooleanRule(idColumnRange, "NUMBER_NOT_EQ", "TRUE", green),
    ]);
    const { ss, sheet } = fetchedOccupancy();
    const toRemove = Val.assert(
      sheet.conditionalFormatRules()[0],
      "ID column rule to remove",
    );

    sheet.column("id").removeConditionalFormatRule(toRemove);
    ss.batchUpdateGSheets();

    expect(batchUpdateCalls[0]?.requests).toEqual([
      { deleteConditionalFormatRule: { sheetId: occupancyGid, index: 0 } },
    ]);
  });

  it("queues nothing when adding a rule identical to one already present", () => {
    const { batchUpdateCalls } = stubOccupancyWithRules([
      googleBooleanRule(idColumnRange, "NUMBER_EQ", "TRUE", pink),
    ]);
    const { ss, sheet } = fetchedOccupancy();

    sheet.column("id").addConditionalFormatRule({
      condition: { type: "NUMBER_EQ", value: true },
      format: { backgroundColor: pink },
    });
    ss.batchUpdateGSheets();

    expect(batchUpdateCalls).toEqual([]);
  });

  it("sends several deletes highest-index-first so the intended rules are the ones removed", () => {
    const { batchUpdateCalls } = stubOccupancyWithRules([
      googleBooleanRule(idColumnRange, "NUMBER_EQ", "1", pink),
      googleBooleanRule(sheetRange, "NUMBER_EQ", "TRUE", grey),
      googleBooleanRule(idColumnRange, "NUMBER_EQ", "2", green),
      googleBooleanRule(idColumnRange, "NUMBER_EQ", "3", grey),
    ]);
    const { ss, sheet } = fetchedOccupancy();

    sheet.column("id").removeConditionalFormatRules();
    ss.batchUpdateGSheets();

    expect(batchUpdateCalls[0]?.requests).toEqual([
      { deleteConditionalFormatRule: { sheetId: occupancyGid, index: 3 } },
      { deleteConditionalFormatRule: { sheetId: occupancyGid, index: 2 } },
      { deleteConditionalFormatRule: { sheetId: occupancyGid, index: 0 } },
    ]);

    sheet.prepFetchConditionalFormatRules();
    ss.fetchAllPrepped({ skipFetchingProperties: true });
    expect(sheet.conditionalFormatRules()).toHaveLength(1);
    expect(sheet.conditionalFormatRules()[0]).toMatchObject({
      ranges: [sheetRange],
    });
  });

  it("refuses a second rule-mutating flush against the same sheet until the rules are re-fetched", () => {
    const { batchUpdateCalls } = stubOccupancyWithRules([]);
    const { ss, sheet } = fetchedOccupancy();

    sheet.column("id").addConditionalFormatRule({
      condition: { type: "NUMBER_EQ", value: true },
      format: { backgroundColor: pink },
    });
    ss.batchUpdateGSheets();

    expect(() =>
      sheet.column("id").addConditionalFormatRule({
        condition: { type: "NUMBER_NOT_EQ", value: true },
        format: { backgroundColor: green },
      }),
    ).toThrowError(/Conditional format indexes are stale/);

    sheet.prepFetchConditionalFormatRules();
    ss.fetchAllPrepped({ skipFetchingProperties: true });
    sheet.column("id").addConditionalFormatRule({
      condition: { type: "NUMBER_NOT_EQ", value: true },
      format: { backgroundColor: green },
    });
    ss.batchUpdateGSheets();
    expect(batchUpdateCalls).toHaveLength(2);
  });

  it("builds an anchored A1 reference from a column name at the data-start row", () => {
    stubOccupancyWithRules([]);
    const { sheet } = fetchedOccupancy();

    expect(sheet.column("id").anchoredA1()).toBe("$A5");
    expect(sheet.column("id").anchoredA1("updateTermsSelect")).toBe("$B5");
    expect(
      sheet
        .column("id")
        .cell(topDataRowIndex + 1)
        .anchoredA1("id"),
    ).toBe("$A6");
  });

  it("adds a sheet-wide rule over the live data range and a cell rule over one cell", () => {
    const { batchUpdateCalls } = stubOccupancyWithRules([]);
    const { ss, sheet } = fetchedOccupancy();

    sheet.addConditionalFormatRule({
      condition: { type: "NUMBER_EQ", value: true },
      format: { backgroundColor: grey, foregroundColor: grey },
    });
    sheet
      .column("id")
      .cell(topDataRowIndex)
      .addConditionalFormatRule({
        condition: {
          type: "CUSTOM_FORMULA",
          formula: `=${sheet.column("id").cell(topDataRowIndex).anchoredA1()}=FALSE`,
        },
        format: { backgroundColor: pink },
      });
    ss.batchUpdateGSheets();

    const requests = batchUpdateCalls[0]?.requests ?? [];
    expect(requests).toHaveLength(2);
    expect(requests[0]?.addConditionalFormatRule?.rule?.ranges).toEqual([
      sheetRange,
    ]);
    expect(requests[1]?.addConditionalFormatRule?.rule?.ranges).toEqual([
      {
        ...idColumnRange,
        endRowIndex: topDataRowIndex + 1,
      },
    ]);
  });

  it("sends a content delete and a declaration add in one batch so a malformed add cannot leave the column bare", () => {
    const { batchUpdateCalls } = stubOccupancyWithRules([
      googleBooleanRule(idColumnRange, "CUSTOM_FORMULA", "=$B5=FALSE", pink),
    ]);
    const { ss, sheet } = fetchedOccupancy();
    const existing = Val.assert(
      sheet.conditionalFormatRules()[0],
      "existing ID column rule",
    );
    const idPrefix = sheet.column("id");

    idPrefix.removeConditionalFormatRule(existing);
    idPrefix.addConditionalFormatRule({
      condition: {
        type: "CUSTOM_FORMULA",
        formula: `=${idPrefix.anchoredA1("updateTermsSelect")}=FALSE`,
      },
      format: { backgroundColor: pink },
    });
    ss.batchUpdateGSheets();

    expect(
      batchUpdateCalls[0]?.requests?.map((request) => Object.keys(request)[0]),
    ).toEqual(["deleteConditionalFormatRule", "addConditionalFormatRule"]);
  });
});

function googleProtection(
  range: GoogleAppsScript.Sheets.Schema.GridRange,
  extras: Partial<GoogleAppsScript.Sheets.Schema.ProtectedRange> = {},
): GoogleAppsScript.Sheets.Schema.ProtectedRange {
  return {
    protectedRangeId: extras.protectedRangeId ?? 1,
    range,
    warningOnly: extras.warningOnly ?? true,
    ...extras,
  };
}

function stubOccupancyWithProtections(
  protectedRanges: GoogleAppsScript.Sheets.Schema.ProtectedRange[],
) {
  return stubSheetsService({
    sheets: [
      {
        sheetId: occupancyGid,
        title: "Occupancy",
        rows: buildGridRows({
          0: [idColumnId, selectColumnId],
          3: ["ID", "Update terms, select"],
          4: ["r:occ:row4", true],
          5: [null, null],
        }),
        table: { endRowIndex: 6, endColumnIndex: 2 },
        protectedRanges,
      },
    ],
  });
}

function fetchedOccupancyProtections(
  protectedRanges: GoogleAppsScript.Sheets.Schema.ProtectedRange[] = [],
) {
  const service = stubOccupancyWithProtections(protectedRanges);
  const ss = SpreadsheetNamed.init();
  const sheet = ss.sheet("occupancy");
  sheet.prepFetchEditProtections();
  ss.fetchAllPrepped();
  return { ss, sheet, ...service };
}

const wholeSheetRange = { sheetId: occupancyGid };
const columnIdRowRange = {
  sheetId: occupancyGid,
  startRowIndex: 0,
  endRowIndex: 1,
};
const idHeaderCellRange = {
  sheetId: occupancyGid,
  startRowIndex: 3,
  endRowIndex: 4,
  startColumnIndex: 0,
  endColumnIndex: 1,
};
const idColumnIdCellRange = {
  sheetId: occupancyGid,
  startRowIndex: 0,
  endRowIndex: 1,
  startColumnIndex: 0,
  endColumnIndex: 1,
};
const idGroupHeadingCellRange = {
  sheetId: occupancyGid,
  startRowIndex: 1,
  endRowIndex: 2,
  startColumnIndex: 0,
  endColumnIndex: 1,
};
const topIdCellRange = {
  ...idColumnRange,
  endRowIndex: topDataRowIndex + 1,
};
const idWholeColumnRange = {
  sheetId: occupancyGid,
  startRowIndex: 0,
  startColumnIndex: 0,
  endColumnIndex: 1,
};
const idWholeColumnGoogleRange = {
  sheetId: occupancyGid,
  startColumnIndex: 0,
  endColumnIndex: 1,
};

describe("SheetNamed edit warnings and edit locks", () => {
  beforeEach(() => {
    stubPropertiesService({ realEstateSpreadsheetId: "test-spreadsheet-id" });
  });

  it("queues nothing when adding a warning identical to one already present", () => {
    const { batchUpdateCalls, ss, sheet } = fetchedOccupancyProtections([
      googleProtection(idColumnRange, {
        protectedRangeId: 4,
        description: "id warning",
        warningOnly: true,
      }),
    ]);

    sheet.column("id").addEditWarning({ description: "id warning" });
    ss.batchUpdateGSheets();

    expect(batchUpdateCalls).toEqual([]);
  });

  it("queues nothing when a present lock has every declared editor plus ones Google added", () => {
    const googleAdded = ["service@example.com", "owner@example.com"];
    const fetchedLock = (users: string[]) =>
      fetchedOccupancyProtections([
        googleProtection(idColumnRange, {
          protectedRangeId: 6,
          description: "id lock",
          warningOnly: false,
          editors: { users, groups: ["editors@example.com"] },
        }),
      ]);

    const unnamed = fetchedLock(googleAdded);
    unnamed.sheet.column("id").addEditLock({ description: "id lock" });
    unnamed.ss.batchUpdateGSheets();
    expect(unnamed.batchUpdateCalls).toEqual([]);

    const named = fetchedLock([...googleAdded, "editor@example.com"]);
    named.sheet.column("id").addEditLock({
      description: "id lock",
      users: ["editor@example.com"],
      groups: ["editors@example.com"],
    });
    named.ss.batchUpdateGSheets();
    expect(named.batchUpdateCalls).toEqual([]);
  });

  it("adds a lock when a present lock lacks a declared editor", () => {
    const { batchUpdateCalls, ss, sheet } = fetchedOccupancyProtections([
      googleProtection(idColumnRange, {
        protectedRangeId: 6,
        description: "id lock",
        warningOnly: false,
        editors: { users: ["service@example.com", "owner@example.com"] },
      }),
    ]);

    sheet.column("id").addEditLock({
      description: "id lock",
      users: ["editor@example.com"],
    });
    ss.batchUpdateGSheets();

    expect(batchUpdateCalls[0]?.requests).toHaveLength(1);
  });

  it("removes a hand-set protection by exact range, content, description and id", () => {
    const handSet = googleProtection(idColumnRange, {
      protectedRangeId: 11,
      description: "hand-set",
      warningOnly: true,
    });
    const other = googleProtection(selectColumnRange, {
      protectedRangeId: 12,
      description: "other",
      warningOnly: true,
    });

    const byRange = fetchedOccupancyProtections([handSet, other]);
    byRange.sheet.column("id").removeEditProtections();
    byRange.ss.batchUpdateGSheets();
    expect(byRange.batchUpdateCalls[0]?.requests).toEqual([
      { deleteProtectedRange: { protectedRangeId: 11 } },
    ]);

    const byContent = fetchedOccupancyProtections([handSet, other]);
    const named = Val.assert(
      byContent.sheet.editProtections()[0],
      "hand-set protection",
    );
    byContent.sheet.removeEditProtection(named);
    byContent.ss.batchUpdateGSheets();
    expect(byContent.batchUpdateCalls[0]?.requests).toEqual([
      { deleteProtectedRange: { protectedRangeId: 11 } },
    ]);

    const byDescription = fetchedOccupancyProtections([handSet, other]);
    byDescription.sheet.removeEditProtectionByDescription("hand-set");
    byDescription.ss.batchUpdateGSheets();
    expect(byDescription.batchUpdateCalls[0]?.requests).toEqual([
      { deleteProtectedRange: { protectedRangeId: 11 } },
    ]);

    const byId = fetchedOccupancyProtections([handSet, other]);
    byId.sheet.removeEditProtectionById(11);
    byId.ss.batchUpdateGSheets();
    expect(byId.batchUpdateCalls[0]?.requests).toEqual([
      { deleteProtectedRange: { protectedRangeId: 11 } },
    ]);
  });

  it("adds a whole-sheet warning with unprotected ranges", () => {
    const { batchUpdateCalls, ss, sheet } = fetchedOccupancyProtections();
    const unprotected = {
      sheetId: occupancyGid,
      startRowIndex: 2,
      endRowIndex: 3,
      startColumnIndex: 1,
      endColumnIndex: 2,
    };

    sheet.addEditWarningWholeSheet({
      description: "sheet warning",
      unprotectedRanges: [unprotected],
    });
    ss.batchUpdateGSheets();

    expect(batchUpdateCalls[0]?.requests).toEqual([
      {
        addProtectedRange: {
          protectedRange: {
            range: wholeSheetRange,
            description: "sheet warning",
            warningOnly: true,
            unprotectedRanges: [unprotected],
          },
        },
      },
    ]);
  });

  it("refuses a coordinate-bearing protection write while row indexes are stale", () => {
    const { ss, sheet } = fetchedOccupancyProtections();

    sheet.row(topDataRowIndex + 1).delete();
    ss.batchUpdateGSheets();

    expect(() => sheet.column("id").addEditWarning()).toThrowError(
      /Row indexes are stale/,
    );
    expect(() =>
      sheet.addEditWarningWholeSheet({
        unprotectedRanges: [topIdCellRange],
      }),
    ).toThrowError(/Row indexes are stale/);
    expect(() => sheet.addEditLockWholeSheet()).not.toThrow();
  });

  it("refuses a read or mutation after a protection flush until protections are re-fetched", () => {
    const { batchUpdateCalls, ss, sheet } = fetchedOccupancyProtections();

    sheet.column("id").addEditWarning({ description: "id warning" });
    ss.batchUpdateGSheets();

    expect(() => sheet.editProtections()).toThrowError(
      /Edit protections are stale/,
    );
    expect(() =>
      sheet.column("id").addEditLock({ description: "id lock" }),
    ).toThrowError(/Edit protections are stale/);

    sheet.prepFetchEditProtections();
    ss.fetchAllPrepped({ skipFetchingProperties: true });
    expect(sheet.editProtections()[0]).toMatchObject({
      kind: "warning",
      description: "id warning",
    });
    sheet.column("id").addEditLock({ description: "id lock" });
    ss.batchUpdateGSheets();
    expect(batchUpdateCalls).toHaveLength(2);
  });

  it("adds a lock with named editors", () => {
    const { batchUpdateCalls, ss, sheet } = fetchedOccupancyProtections();

    sheet.column("id").addEditLock({
      description: "id lock",
      users: ["editor@example.com"],
      groups: ["editors@example.com"],
    });
    ss.batchUpdateGSheets();

    expect(batchUpdateCalls[0]?.requests).toEqual([
      {
        addProtectedRange: {
          protectedRange: {
            range: idColumnRange,
            description: "id lock",
            editors: {
              users: ["editor@example.com"],
              groups: ["editors@example.com"],
            },
          },
        },
      },
    ]);
  });

  it("adds warnings over a bookkeeping row, header cells, a column-group heading cell and a single cell", () => {
    const { batchUpdateCalls, ss, sheet } = fetchedOccupancyProtections();

    sheet.meta.uniformRow("columnId").addEditWarning({
      description: "column id row",
    });
    sheet.meta.column("id").addEditWarningOn("tableHeader", {
      description: "id header",
    });
    sheet.meta.column("id").addEditWarningOn("columnId", {
      description: "id column id",
    });
    sheet.meta.column("id").addEditWarningOn("colGroupName", {
      description: "id group heading",
    });
    sheet.column("id").cell(topDataRowIndex).addEditWarning({
      description: "id cell",
    });
    ss.batchUpdateGSheets();

    const ranges = (batchUpdateCalls[0]?.requests ?? []).map(
      (request) => request.addProtectedRange?.protectedRange?.range,
    );
    expect(ranges).toEqual([
      columnIdRowRange,
      idHeaderCellRange,
      idColumnIdCellRange,
      idGroupHeadingCellRange,
      topIdCellRange,
    ]);
  });

  it("adds an open-ended column warning from a start row with no end row", () => {
    const { batchUpdateCalls, ss, sheet } = fetchedOccupancyProtections();

    sheet.column("id").addEditWarningFromRow(topDataRowIndex, {
      description: "open-ended id",
    });
    ss.batchUpdateGSheets();

    expect(batchUpdateCalls[0]?.requests).toEqual([
      {
        addProtectedRange: {
          protectedRange: {
            range: {
              sheetId: occupancyGid,
              startRowIndex: topDataRowIndex,
              startColumnIndex: 0,
              endColumnIndex: 1,
            },
            description: "open-ended id",
            warningOnly: true,
          },
        },
      },
    ]);
  });

  it("adds a whole-column warning as a start-row-0 column range with no end row", () => {
    const { batchUpdateCalls, ss, sheet } = fetchedOccupancyProtections();

    sheet.column("id").addEditWarningWholeColumn({
      description: "id column",
    });
    ss.batchUpdateGSheets();

    expect(batchUpdateCalls[0]?.requests).toEqual([
      {
        addProtectedRange: {
          protectedRange: {
            range: idWholeColumnRange,
            description: "id column",
            warningOnly: true,
          },
        },
      },
    ]);
  });

  it("adds a whole-column lock as a start-row-0 column range with no end row", () => {
    const { batchUpdateCalls, ss, sheet } = fetchedOccupancyProtections();

    sheet.column("id").addEditLockWholeColumn({
      description: "id column lock",
      users: ["editor@example.com"],
    });
    ss.batchUpdateGSheets();

    expect(batchUpdateCalls[0]?.requests).toEqual([
      {
        addProtectedRange: {
          protectedRange: {
            range: idWholeColumnRange,
            description: "id column lock",
            editors: { users: ["editor@example.com"] },
          },
        },
      },
    ]);
  });

  it("queues nothing when adding a whole-column warning identical to one already present", () => {
    const { batchUpdateCalls, ss, sheet } = fetchedOccupancyProtections([
      googleProtection(idWholeColumnGoogleRange, {
        protectedRangeId: 20,
        description: "id column",
        warningOnly: true,
      }),
    ]);

    sheet.column("id").addEditWarningWholeColumn({ description: "id column" });
    ss.batchUpdateGSheets();

    expect(batchUpdateCalls).toEqual([]);
  });

  it("removes a whole-column protection by exact range, content, description and id, and leaves a whole-sheet protection alone", () => {
    const wholeColumn = googleProtection(idWholeColumnGoogleRange, {
      protectedRangeId: 21,
      description: "id column",
      warningOnly: true,
    });
    const wholeSheet = googleProtection(wholeSheetRange, {
      protectedRangeId: 22,
      description: "sheet",
      warningOnly: true,
    });

    const byRange = fetchedOccupancyProtections([wholeColumn, wholeSheet]);
    byRange.sheet.column("id").removeEditProtectionsWholeColumn();
    byRange.ss.batchUpdateGSheets();
    expect(byRange.batchUpdateCalls[0]?.requests).toEqual([
      { deleteProtectedRange: { protectedRangeId: 21 } },
    ]);

    const byContent = fetchedOccupancyProtections([wholeColumn, wholeSheet]);
    const named = Val.assert(
      byContent.sheet.editProtections()[0],
      "whole-column protection",
    );
    byContent.sheet.removeEditProtection(named);
    byContent.ss.batchUpdateGSheets();
    expect(byContent.batchUpdateCalls[0]?.requests).toEqual([
      { deleteProtectedRange: { protectedRangeId: 21 } },
    ]);

    const byDescription = fetchedOccupancyProtections([
      wholeColumn,
      wholeSheet,
    ]);
    byDescription.sheet.removeEditProtectionByDescription("id column");
    byDescription.ss.batchUpdateGSheets();
    expect(byDescription.batchUpdateCalls[0]?.requests).toEqual([
      { deleteProtectedRange: { protectedRangeId: 21 } },
    ]);

    const byId = fetchedOccupancyProtections([wholeColumn, wholeSheet]);
    byId.sheet.removeEditProtectionById(21);
    byId.ss.batchUpdateGSheets();
    expect(byId.batchUpdateCalls[0]?.requests).toEqual([
      { deleteProtectedRange: { protectedRangeId: 21 } },
    ]);
  });

  it("removes a whole-sheet protection by exact range without matching a whole-column protection", () => {
    const { batchUpdateCalls, ss, sheet } = fetchedOccupancyProtections([
      googleProtection(idWholeColumnGoogleRange, {
        protectedRangeId: 21,
        description: "id column",
        warningOnly: true,
      }),
      googleProtection(wholeSheetRange, {
        protectedRangeId: 22,
        description: "sheet",
        warningOnly: true,
      }),
    ]);

    sheet.indexed.raw.removeEditProtectionsAt(wholeSheetRange);
    ss.batchUpdateGSheets();

    expect(batchUpdateCalls[0]?.requests).toEqual([
      { deleteProtectedRange: { protectedRangeId: 22 } },
    ]);
  });

  it("refuses a whole-column protection write while column indexes are stale", () => {
    const { ss, sheet } = fetchedOccupancyProtections();

    sheet.indexed.raw.addSheetChangeToSave({
      action: "insertColumn",
      startColumnIndex: 0,
    });
    ss.batchUpdateGSheets();

    expect(() => sheet.column("id").addEditWarningWholeColumn()).toThrowError(
      /Column index 0 is stale/,
    );
    expect(() => sheet.column("id").addEditLockWholeColumn()).toThrowError(
      /Column index 0 is stale/,
    );
  });

  it("allows a whole-column protection write while row indexes are stale", () => {
    const { ss, sheet } = fetchedOccupancyProtections();

    sheet.row(topDataRowIndex + 1).delete();
    ss.batchUpdateGSheets();

    expect(() =>
      sheet
        .column("id")
        .addEditWarningWholeColumn({ description: "id column" }),
    ).not.toThrow();
    expect(() =>
      sheet.column("id").addEditLockWholeColumn({
        description: "id column lock",
      }),
    ).not.toThrow();
  });
});
