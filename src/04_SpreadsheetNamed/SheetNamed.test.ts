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

const TOP_DATA_ROW_INDEX = ssConfigGet("tableHeaderRowIndexBase0") + 1;
const OCCUPANCY_GID = sheetConfigs.occupancy.sheetGid;
const ID_COLUMN_ID = columnConfigs.occupancy.id.columnId;
const SELECT_COLUMN_ID = columnConfigs.occupancy.updateTermsSelect.columnId;
const PINK = { red: 244 / 255, green: 204 / 255, blue: 204 / 255 };
const GREY = { red: 0.6, green: 0.6, blue: 0.6 };
const GREEN = { red: 0.7, green: 0.9, blue: 0.7 };

const SHEET_RANGE = {
  sheetId: OCCUPANCY_GID,
  startRowIndex: TOP_DATA_ROW_INDEX,
  endRowIndex: 6,
  startColumnIndex: 0,
  endColumnIndex: 2,
};
const ID_COLUMN_RANGE = {
  ...SHEET_RANGE,
  startColumnIndex: 0,
  endColumnIndex: 1,
};
const SELECT_COLUMN_RANGE = {
  ...SHEET_RANGE,
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
        sheetId: OCCUPANCY_GID,
        title: "Occupancy",
        rows: buildGridRows({
          0: [ID_COLUMN_ID, SELECT_COLUMN_ID],
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

  it("prepends a column rule so it takes precedence over rules already on the sheet", () => {
    const { batchUpdateCalls } = stubOccupancyWithRules([
      googleBooleanRule(SHEET_RANGE, "NUMBER_EQ", "TRUE", GREY),
    ]);
    const { ss, sheet } = fetchedOccupancy();

    sheet.column("id").addConditionalFormatRule({
      condition: { type: "NUMBER_EQ", value: true },
      format: { backgroundColor: PINK },
    });
    ss.batchUpdateGSheets();

    expect(batchUpdateCalls[0]?.requests).toEqual([
      {
        addConditionalFormatRule: {
          index: 0,
          rule: {
            ranges: [ID_COLUMN_RANGE],
            booleanRule: {
              condition: {
                type: "NUMBER_EQ",
                values: [{ userEnteredValue: "TRUE" }],
              },
              format: { backgroundColor: PINK },
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
      format: { backgroundColor: GREY },
    });
  });

  it("removes every rule whose range exactly matches a column and leaves a sheet-wide rule alone", () => {
    const { batchUpdateCalls } = stubOccupancyWithRules([
      googleBooleanRule(SHEET_RANGE, "NUMBER_EQ", "TRUE", GREY),
      googleBooleanRule(ID_COLUMN_RANGE, "NUMBER_EQ", "TRUE", PINK),
      googleBooleanRule(SELECT_COLUMN_RANGE, "NUMBER_EQ", "TRUE", GREEN),
      googleBooleanRule(ID_COLUMN_RANGE, "NUMBER_NOT_EQ", "TRUE", GREEN),
    ]);
    const { ss, sheet } = fetchedOccupancy();

    sheet.column("id").removeConditionalFormatRules();
    ss.batchUpdateGSheets();

    expect(batchUpdateCalls[0]?.requests).toEqual([
      { deleteConditionalFormatRule: { sheetId: OCCUPANCY_GID, index: 3 } },
      { deleteConditionalFormatRule: { sheetId: OCCUPANCY_GID, index: 1 } },
    ]);

    sheet.prepFetchConditionalFormatRules();
    ss.fetchAllPrepped({ skipFetchingProperties: true });
    const rules = sheet.conditionalFormatRules();
    expect(rules).toHaveLength(2);
    expect(rules[0]).toMatchObject({
      ranges: [SHEET_RANGE],
      format: { backgroundColor: GREY },
    });
    expect(rules[1]).toMatchObject({
      ranges: [SELECT_COLUMN_RANGE],
    });
  });

  it("removes a single rule by exact content so a re-stamp can replace it", () => {
    const { batchUpdateCalls } = stubOccupancyWithRules([
      googleBooleanRule(ID_COLUMN_RANGE, "NUMBER_EQ", "TRUE", PINK),
      googleBooleanRule(ID_COLUMN_RANGE, "NUMBER_NOT_EQ", "TRUE", GREEN),
    ]);
    const { ss, sheet } = fetchedOccupancy();
    const toRemove = Val.assert(
      sheet.conditionalFormatRules()[0],
      "ID column rule to remove",
    );

    sheet.column("id").removeConditionalFormatRule(toRemove);
    ss.batchUpdateGSheets();

    expect(batchUpdateCalls[0]?.requests).toEqual([
      { deleteConditionalFormatRule: { sheetId: OCCUPANCY_GID, index: 0 } },
    ]);
  });

  it("queues nothing when adding a rule identical to one already present", () => {
    const { batchUpdateCalls } = stubOccupancyWithRules([
      googleBooleanRule(ID_COLUMN_RANGE, "NUMBER_EQ", "TRUE", PINK),
    ]);
    const { ss, sheet } = fetchedOccupancy();

    sheet.column("id").addConditionalFormatRule({
      condition: { type: "NUMBER_EQ", value: true },
      format: { backgroundColor: PINK },
    });
    ss.batchUpdateGSheets();

    expect(batchUpdateCalls).toEqual([]);
  });

  it("sends several deletes highest-index-first so the intended rules are the ones removed", () => {
    const { batchUpdateCalls } = stubOccupancyWithRules([
      googleBooleanRule(ID_COLUMN_RANGE, "NUMBER_EQ", "1", PINK),
      googleBooleanRule(SHEET_RANGE, "NUMBER_EQ", "TRUE", GREY),
      googleBooleanRule(ID_COLUMN_RANGE, "NUMBER_EQ", "2", GREEN),
      googleBooleanRule(ID_COLUMN_RANGE, "NUMBER_EQ", "3", GREY),
    ]);
    const { ss, sheet } = fetchedOccupancy();

    sheet.column("id").removeConditionalFormatRules();
    ss.batchUpdateGSheets();

    expect(batchUpdateCalls[0]?.requests).toEqual([
      { deleteConditionalFormatRule: { sheetId: OCCUPANCY_GID, index: 3 } },
      { deleteConditionalFormatRule: { sheetId: OCCUPANCY_GID, index: 2 } },
      { deleteConditionalFormatRule: { sheetId: OCCUPANCY_GID, index: 0 } },
    ]);

    sheet.prepFetchConditionalFormatRules();
    ss.fetchAllPrepped({ skipFetchingProperties: true });
    expect(sheet.conditionalFormatRules()).toHaveLength(1);
    expect(sheet.conditionalFormatRules()[0]).toMatchObject({
      ranges: [SHEET_RANGE],
    });
  });

  it("refuses a second rule-mutating flush against the same sheet until the rules are re-fetched", () => {
    const { batchUpdateCalls } = stubOccupancyWithRules([]);
    const { ss, sheet } = fetchedOccupancy();

    sheet.column("id").addConditionalFormatRule({
      condition: { type: "NUMBER_EQ", value: true },
      format: { backgroundColor: PINK },
    });
    ss.batchUpdateGSheets();

    expect(() =>
      sheet.column("id").addConditionalFormatRule({
        condition: { type: "NUMBER_NOT_EQ", value: true },
        format: { backgroundColor: GREEN },
      }),
    ).toThrowError(/Conditional format indexes are stale/);

    sheet.prepFetchConditionalFormatRules();
    ss.fetchAllPrepped({ skipFetchingProperties: true });
    sheet.column("id").addConditionalFormatRule({
      condition: { type: "NUMBER_NOT_EQ", value: true },
      format: { backgroundColor: GREEN },
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
      sheet.column("id").cell(TOP_DATA_ROW_INDEX + 1).anchoredA1("id"),
    ).toBe("$A6");
  });

  it("adds a sheet-wide rule over the live data range and a cell rule over one cell", () => {
    const { batchUpdateCalls } = stubOccupancyWithRules([]);
    const { ss, sheet } = fetchedOccupancy();

    sheet.addConditionalFormatRule({
      condition: { type: "NUMBER_EQ", value: true },
      format: { backgroundColor: GREY, foregroundColor: GREY },
    });
    sheet.column("id").cell(TOP_DATA_ROW_INDEX).addConditionalFormatRule({
      condition: { type: "CUSTOM_FORMULA", formula: `=${sheet.column("id").cell(TOP_DATA_ROW_INDEX).anchoredA1()}=FALSE` },
      format: { backgroundColor: PINK },
    });
    ss.batchUpdateGSheets();

    const requests = batchUpdateCalls[0]?.requests ?? [];
    expect(requests).toHaveLength(2);
    expect(requests[0]?.addConditionalFormatRule?.rule?.ranges).toEqual([
      SHEET_RANGE,
    ]);
    expect(requests[1]?.addConditionalFormatRule?.rule?.ranges).toEqual([
      {
        ...ID_COLUMN_RANGE,
        endRowIndex: TOP_DATA_ROW_INDEX + 1,
      },
    ]);
  });

  it("sends a content delete and a declaration add in one batch so a malformed add cannot leave the column bare", () => {
    const { batchUpdateCalls } = stubOccupancyWithRules([
      googleBooleanRule(ID_COLUMN_RANGE, "CUSTOM_FORMULA", "=$B5=FALSE", PINK),
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
      format: { backgroundColor: PINK },
    });
    ss.batchUpdateGSheets();

    expect(batchUpdateCalls[0]?.requests?.map((request) => Object.keys(request)[0])).toEqual([
      "deleteConditionalFormatRule",
      "addConditionalFormatRule",
    ]);
  });
});
