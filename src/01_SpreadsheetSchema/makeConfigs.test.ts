import { afterEach, describe, expect, it } from "vitest";
import { columnConfigsByName } from "./columnConfigsTypes";
import { floorSeedLookup } from "./configSheetFloorSeed";
import { sheetConfigs } from "./generated/sheetConfigs";
import {
  makeColumnConfigs,
  makeIdPrefixFromTitle,
  makeSheetConfigs,
  makeSpreadsheetConfig,
  type ColumnConfigsGeneric,
  type ColumnConfigStored,
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

  it("passes the generated floor tab entries against the floor seed", () => {
    expect(() => makeSheetConfigs(sheetConfigs, floorSeedLookup)).not.toThrow();
  });

  it("throws naming a floor tab with no entry", () => {
    const { valueConfig: _valueConfig, ...withoutValueConfig } = sheetConfigs;

    expect(() => makeSheetConfigs(withoutValueConfig, floorSeedLookup)).toThrow(
      'Floor tab "valueConfig" has no floor entry',
    );
  });
});

describe("makeColumnConfigs", () => {
  function floorColumnConfigs(): ColumnConfigsGeneric {
    return JSON.parse(JSON.stringify(columnConfigsByName));
  }

  function floorColumn(
    configs: ColumnConfigsGeneric,
    sheetName: string,
    columnName: string,
  ): ColumnConfigStored {
    const column = configs[sheetName]?.[columnName];
    if (column === undefined) {
      throw new Error(`No generated column ${sheetName}.${columnName}.`);
    }
    return column;
  }

  it("passes the generated floor entries against the floor seed", () => {
    expect(() =>
      makeColumnConfigs(floorColumnConfigs(), floorSeedLookup),
    ).not.toThrow();
  });

  it("throws naming the sheet, the column and both headers when a floor column's header differs from the seed's", () => {
    const configs = floorColumnConfigs();
    const header = floorColumn(configs, "columnConfig", "header");
    header.header = "Heading";

    expect(() => makeColumnConfigs(configs, floorSeedLookup)).toThrow(
      `Floor column "header" (column ID "${header.columnId}") on "columnConfig" has header "Heading" where the floor seed has "Header".`,
    );
  });

  it("throws when a floor column's valueName isn't the one the seed's column type implies", () => {
    const configs = floorColumnConfigs();
    const sheetGid = floorColumn(configs, "sheetConfig", "sheetGid");
    sheetGid.valueName = "string";

    expect(() => makeColumnConfigs(configs, floorSeedLookup)).toThrow(
      `Floor column "sheetGid" (column ID "${sheetGid.columnId}") on "sheetConfig" has valueName "string" where the floor seed's column type DOUBLE implies "number".`,
    );
  });

  it("throws when a floor column's emptyValueAllowed differs from the seed's", () => {
    const configs = floorColumnConfigs();
    const idHeader = floorColumn(configs, "spreadsheetConfig", "idHeader");
    idHeader.emptyValueAllowed = true;

    expect(() => makeColumnConfigs(configs, floorSeedLookup)).toThrow(
      `Floor column "idHeader" (column ID "${idHeader.columnId}") on "spreadsheetConfig" has emptyValueAllowed true where the floor seed has false.`,
    );
  });

  it("throws naming a seeded floor column with no entry", () => {
    const configs = floorColumnConfigs();
    delete configs.columnConfig?.emptyValueAllowed;

    expect(() => makeColumnConfigs(configs, floorSeedLookup)).toThrow(
      'Floor column "Empty value allowed" on "columnConfig" has no floor entry.',
    );
  });

  it("passes a floor entry with a Custom default value and one without", () => {
    const configs = floorColumnConfigs();
    floorColumn(configs, "sheetConfig", "sheetTitle").customDefaultValue =
      "Untitled";
    floorColumn(configs, "columnConfig", "sheetTitle").customDefaultValue =
      null;

    expect(() => makeColumnConfigs(configs, floorSeedLookup)).not.toThrow();
  });

  it("passes a live column the seed doesn't declare", () => {
    const configs = floorColumnConfigs();
    const columnConfigTab = configs.columnConfig ?? {};
    columnConfigTab.notes = {
      columnId: "c:ccf:notes01",
      header: "Notes",
      valueName: "string",
      isFormula: false,
      emptyValueAllowed: true,
      customDefaultValue: null,
    };

    expect(() => makeColumnConfigs(configs, floorSeedLookup)).not.toThrow();
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
