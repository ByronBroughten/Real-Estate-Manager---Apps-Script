import { describe, expect, it } from "vitest";
import type { OpaqueRawRequest } from "../00_base/GoogleSheetsAPI";
import { getSheetTraitByName } from "../01_generatedConfigs/sheetConfigsTypes";
import { UpdateRequestSummary } from "./UpdateRequestSummary";

const OCCUPANCY_GID = getSheetTraitByName("occupancy", "sheetGid");
const UNKNOWN_GID = 999999;

function onlyLine(request: OpaqueRawRequest): string {
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

  it("states a range-scoped replace as its range, its two strings and its flags", () => {
    expect(
      onlyLine({
        findReplace: {
          find: "Currency",
          replacement: "Payment",
          matchEntireCell: true,
          range: {
            sheetId: OCCUPANCY_GID,
            startRowIndex: 4,
            endRowIndex: 9,
            startColumnIndex: 2,
            endColumnIndex: 3,
          },
        },
      }),
    ).toBe(
      'findReplace occupancy!C5:C9 matching cells "Currency" → "Payment" matchEntireCell',
    );
  });

  it("names the whole sheet when the replace is scoped by sheet rather than range", () => {
    expect(
      onlyLine({
        findReplace: {
          find: "Currency",
          replacement: "Payment",
          sheetId: OCCUPANCY_GID,
        },
      }),
    ).toBe(
      'findReplace occupancy!all matching cells "Currency" → "Payment" (no flags)',
    );
  });

  it("says every sheet when the replace is unscoped", () => {
    expect(
      onlyLine({
        findReplace: {
          find: "Currency",
          replacement: "Payment",
          allSheets: true,
          includeFormulas: true,
        },
      }),
    ).toBe(
      'findReplace every sheet matching cells "Currency" → "Payment" includeFormulas',
    );
  });

  it("names the sheet, coordinate, formula text and PASTE_FORMULA of a formula paste", () => {
    expect(
      onlyLine({
        pasteData: {
          coordinate: {
            sheetId: OCCUPANCY_GID,
            rowIndex: 4,
            columnIndex: 6,
          },
          data: '"=2+SINGLE(test[Number])"',
          delimiter: "\t",
          type: "PASTE_FORMULA",
        },
      }),
    ).toBe(
      "pasteData occupancy!G5:G5 1 row(s) =2+SINGLE(test[Number]) PASTE_FORMULA",
    );
  });

  it("spans the quoted records of a column formula fill", () => {
    expect(
      onlyLine({
        pasteData: {
          coordinate: {
            sheetId: OCCUPANCY_GID,
            rowIndex: 4,
            columnIndex: 6,
          },
          data: '"=2+1"\n"=2+1"\n"=2+1"',
          delimiter: "\t",
          type: "PASTE_FORMULA",
        },
      }),
    ).toBe("pasteData occupancy!G5:G7 3 row(s) =2+1 PASTE_FORMULA");
  });

  it("names the sheet, range and condition of an added conditional format rule", () => {
    expect(
      onlyLine({
        addConditionalFormatRule: {
          index: 0,
          rule: {
            ranges: [
              {
                sheetId: OCCUPANCY_GID,
                startRowIndex: 4,
                endRowIndex: 11,
                startColumnIndex: 0,
                endColumnIndex: 1,
              },
            ],
            booleanRule: {
              condition: { type: "CUSTOM_FORMULA" },
            },
          },
        },
      }),
    ).toBe("addConditionalFormatRule occupancy!A5:A11 prepend CUSTOM_FORMULA");
  });

  it("names the sheet and index of a deleted conditional format rule", () => {
    expect(
      onlyLine({
        deleteConditionalFormatRule: {
          sheetId: OCCUPANCY_GID,
          index: 3,
        },
      }),
    ).toBe("deleteConditionalFormatRule occupancy index 3");
  });

  it("names the range and kind of an added protected range", () => {
    expect(
      onlyLine({
        addProtectedRange: {
          protectedRange: {
            range: {
              sheetId: OCCUPANCY_GID,
              startRowIndex: 4,
              endRowIndex: 11,
              startColumnIndex: 0,
              endColumnIndex: 1,
            },
            warningOnly: true,
            description: "id warning",
          },
        },
      }),
    ).toBe("addProtectedRange occupancy!A5:A11 warning id warning");
  });

  it("names the id of a deleted protected range", () => {
    expect(
      onlyLine({
        deleteProtectedRange: { protectedRangeId: 11 },
      }),
    ).toBe("deleteProtectedRange (no sheet) id 11");
  });

  it("renders a request the framework does not model as its own verb and JSON", () => {
    const line = onlyLine({
      updateTable: {
        table: { tableId: "t" },
      },
    } as OpaqueRawRequest);

    expect(line).toContain("updateTable");
    expect(line).toContain('"tableId":"t"');
  });

  it("is empty when nothing was queued", () => {
    const summary = UpdateRequestSummary.init([]);

    expect(summary.isEmpty).toBe(true);
    expect(summary.lines).toEqual([]);
  });
});
