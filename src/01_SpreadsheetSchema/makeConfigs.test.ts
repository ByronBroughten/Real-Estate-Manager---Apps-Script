import { afterEach, describe, expect, it } from "vitest";
import {
  makeIdPrefixFromTitle,
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
    ).toThrow(/Column group heading row index base 1.*Action row index base 1/);
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

  it("throws when a sheet has an empty ID prefix", () => {
    expect(() =>
      makeSheetConfigs({
        notes: { sheetGid: 1, idPrefix: "", hasIdColumn: false },
      }),
    ).toThrow(/notes.*no ID prefix/);
  });
});

describe("makeIdPrefixFromTitle", () => {
  it("abbreviates a one-word title to the first letter plus consonants, up to 3", () => {
    expect(makeIdPrefixFromTitle("Property", new Set())).toBe("prp");
    expect(makeIdPrefixFromTitle("Unit", new Set())).toBe("unt");
    expect(makeIdPrefixFromTitle("Household", new Set())).toBe("hsh");
  });

  it("takes the first letter of each word and tops up from the last word's consonants to 3", () => {
    expect(makeIdPrefixFromTitle("Occupancy Terms", new Set())).toBe("otr");
  });

  it("keeps a title shorter than 3 consonants", () => {
    expect(makeIdPrefixFromTitle("Id", new Set())).toBe("id");
  });

  it("steps up with the next consonant on a collision, then a number suffix", () => {
    expect(makeIdPrefixFromTitle("Property", new Set(["prp"]))).toBe("prpr");
    expect(
      makeIdPrefixFromTitle(
        "Property",
        new Set(["prp", "prpr", "prprt", "prprty"]),
      ),
    ).toBe("prp2");
    expect(
      makeIdPrefixFromTitle(
        "Property",
        new Set(["prp", "prpr", "prprt", "prprty", "prp2"]),
      ),
    ).toBe("prp3");
  });

  it("uses s plus a number suffix when the title has no letters", () => {
    expect(makeIdPrefixFromTitle("2024", new Set())).toBe("s");
    expect(makeIdPrefixFromTitle("2024", new Set(["s"]))).toBe("s2");
  });

  it("drops punctuation and digits before abbreviating", () => {
    expect(makeIdPrefixFromTitle("Unit-2B!", new Set())).toBe("unt");
  });

  it("returns only lowercase letters and digits", () => {
    const prefixes = [
      makeIdPrefixFromTitle("Property", new Set()),
      makeIdPrefixFromTitle("Occupancy Terms", new Set()),
      makeIdPrefixFromTitle("2024", new Set(["s"])),
      makeIdPrefixFromTitle("Unit-2B!", new Set()),
      makeIdPrefixFromTitle(
        "Property",
        new Set(["prp", "prpr", "prprt", "prprty"]),
      ),
    ];
    prefixes.forEach((prefix) => {
      expect(prefix).toMatch(/^[a-z0-9]+$/);
    });
  });
});
