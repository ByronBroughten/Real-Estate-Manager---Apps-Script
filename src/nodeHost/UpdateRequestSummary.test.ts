import { describe, expect, it } from "vitest";
import type { GoogleUpdateRequest } from "../00_base/AppsScriptTypes";
import { getSheetTraitByName } from "../01_generatedConfigs/sheetConfigsTypes";
import { UpdateRequestSummary } from "./UpdateRequestSummary";

const OCCUPANCY_GID = getSheetTraitByName("occupancy", "sheetGid");
const UNKNOWN_GID = 999999;

function onlyLine(request: GoogleUpdateRequest): string {
  const [line] = UpdateRequestSummary.init([request]).lines;
  return (line ?? "").replace(/\s+/g, " ").trim();
}

describe("UpdateRequestSummary.lines", () => {
  it("names the sheet, the range, the values and the field mask of a cell write", () => {
    expect(
      onlyLine({
        updateCells: {
          range: {
            sheetId: OCCUPANCY_GID,
            startRowIndex: 4,
            endRowIndex: 6,
            startColumnIndex: 2,
            endColumnIndex: 3,
          },
          rows: [
            { values: [{ userEnteredValue: { stringValue: "yes" } }] },
            { values: [{ userEnteredValue: { numberValue: 42 } }] },
          ],
          fields: "userEnteredValue",
        },
      }),
    ).toBe(
      'updateCells occupancy!C5:C6 2 cell(s) "yes", 42 [userEnteredValue]',
    );
  });

  it("falls back to the gid for a sheet the config does not describe", () => {
    expect(
      onlyLine({
        updateCells: {
          range: { sheetId: UNKNOWN_GID, startRowIndex: 0, endRowIndex: 1 },
        },
      }),
    ).toContain(`gid ${UNKNOWN_GID}`);
  });

  it("counts every cell a column fill covers", () => {
    expect(
      onlyLine({
        repeatCell: {
          range: {
            sheetId: OCCUPANCY_GID,
            startRowIndex: 4,
            endRowIndex: 9,
            startColumnIndex: 5,
            endColumnIndex: 6,
          },
          cell: { userEnteredValue: { boolValue: false } },
          fields: "userEnteredValue",
        },
      }),
    ).toBe("repeatCell occupancy!F5:F9 5 cell(s) false [userEnteredValue]");
  });

  it("counts the rows an append adds", () => {
    expect(
      onlyLine({
        appendCells: {
          sheetId: OCCUPANCY_GID,
          rows: [{ values: [{ userEnteredValue: { stringValue: "r:abc" } }] }],
          fields: "userEnteredValue",
        },
      }),
    ).toBe('appendCells occupancy 1 row(s) "r:abc" [userEnteredValue]');
  });

  it("states a row delete as the 1-based rows it removes", () => {
    expect(
      onlyLine({
        deleteDimension: {
          range: {
            sheetId: OCCUPANCY_GID,
            dimension: "ROWS",
            startIndex: 6,
            endIndex: 9,
          },
        },
      }),
    ).toBe("deleteDimension occupancy!7:9 delete 3 rows");
  });

  it("states a column insert by its column letter", () => {
    expect(
      onlyLine({
        insertDimension: {
          range: {
            sheetId: OCCUPANCY_GID,
            dimension: "COLUMNS",
            startIndex: 27,
            endIndex: 28,
          },
        },
      }),
    ).toBe("insertDimension occupancy!AB:AB insert 1 columns");
  });

  it("states a sort by its column and direction", () => {
    expect(
      onlyLine({
        sortRange: {
          range: { sheetId: OCCUPANCY_GID, startRowIndex: 4 },
          sortSpecs: [{ dimensionIndex: 2, sortOrder: "ASCENDING" }],
        },
      }),
    ).toBe("sortRange occupancy!A5: by column C ascending");
  });

  it("renders a request the framework does not model as its own verb and JSON", () => {
    const line = onlyLine({
      addConditionalFormatRule: {
        index: 3,
        rule: { ranges: [{ sheetId: OCCUPANCY_GID }] },
      },
    } as GoogleUpdateRequest);

    expect(line).toContain("addConditionalFormatRule");
    expect(line).toContain('"index":3');
  });

  it("is empty when nothing was queued", () => {
    const summary = UpdateRequestSummary.init([]);

    expect(summary.isEmpty).toBe(true);
    expect(summary.lines).toEqual([]);
  });
});
