import { afterEach, describe, expect, it } from "vitest";
import {
  makeSheetConfigs,
  makeSpreadsheetConfig,
} from "./makeConfigs";
import {
  clearSpreadsheetConfigOverlay,
  overlaySpreadsheetConfig,
} from "./spreadsheetConfigTypes";

const validLayout = {
  idDelimiter: ":",
  idHeader: "ID",
  startTableColIndexBase0: 0,
  columnIdRowIdxBase0: 0,
  columnGroupHeadingRowIndexBase0: 1,
  actionRowIndexBase0: 2,
  tableHeaderRowIndexBase0: 3,
} as const;

afterEach(() => {
  clearSpreadsheetConfigOverlay();
});

describe("makeSpreadsheetConfig", () => {
  it("loads a layout whose uniform-row indexes are distinct and off the first data row", () => {
    expect(makeSpreadsheetConfig(validLayout)).toEqual(validLayout);
  });

  it("throws when two uniform-row indexes share a number", () => {
    expect(() =>
      makeSpreadsheetConfig({
        ...validLayout,
        actionRowIndexBase0: 0,
      }),
    ).toThrow(/Column ID row index base 1.*Action row index base 1/);
  });

  it("throws when a uniform-row index lands on the first data row", () => {
    expect(() =>
      makeSpreadsheetConfig({
        ...validLayout,
        columnGroupHeadingRowIndexBase0: 4,
      }),
    ).toThrow(/Column group heading row index base 1.*first data row/);
  });
});

describe("overlaySpreadsheetConfig", () => {
  it("throws when overlaying a colliding layout even without a fetch", () => {
    expect(() =>
      overlaySpreadsheetConfig({
        ...validLayout,
        actionRowIndexBase0: 1,
      }),
    ).toThrow(
      /Column group heading row index base 1.*Action row index base 1/,
    );
  });
});

describe("makeSheetConfigs", () => {
  it("throws when two sheets share a non-empty ID prefix", () => {
    expect(() =>
      makeSheetConfigs({
        property: { sheetGid: 1, idPrefix: "prp", hasIdColumn: true },
        unit: { sheetGid: 2, idPrefix: "prp", hasIdColumn: true },
      }),
    ).toThrow(/property.*unit.*"prp"/);
  });

  it("loads two sheets whose ID prefixes are empty", () => {
    expect(
      makeSheetConfigs({
        notes: { sheetGid: 1, idPrefix: "", hasIdColumn: false },
        log: { sheetGid: 2, idPrefix: "", hasIdColumn: false },
      }),
    ).toEqual({
      notes: { sheetGid: 1, idPrefix: "", hasIdColumn: false },
      log: { sheetGid: 2, idPrefix: "", hasIdColumn: false },
    });
  });

  it("loads one empty ID prefix beside a filled one", () => {
    expect(
      makeSheetConfigs({
        notes: { sheetGid: 1, idPrefix: "", hasIdColumn: false },
        property: { sheetGid: 2, idPrefix: "prp", hasIdColumn: true },
      }).property.idPrefix,
    ).toBe("prp");
  });
});
