import { describe, expect, it } from "vitest";
import { columnConfigs } from "../01_generatedConfigs/columnConfigs";
import type {
  ColumnFullName,
  ColumnName,
  ColumnNameFiltered,
  ColumnNameOf,
  ColumnValue,
  ColumnValueName,
  MakeColumnFullName,
  SheetNameOf,
  ValueNameOf,
  ValueOf,
} from "../01_generatedConfigs/columnConfigsTypes";
import {
  configSheetGids,
  getSheetTraitByName,
  type SheetName,
} from "../01_generatedConfigs/sheetConfigsTypes";
import type { ValueName } from "../01_generatedConfigs/valueSchemas";
import { assertType, type IsExactly } from "../testSupport/typeAssertions";
import {
  ColumnSchema,
  SheetSchema,
  SpreadsheetSchema,
} from "./SpreadsheetSchema";

describe("SpreadsheetSchema", () => {
  const schema = new SpreadsheetSchema();

  describe("combineNames", () => {
    it("joins two names with the name delimiter", () => {
      expect(schema.combineNames("foo", "bar")).toBe("foo_bar");
    });
  });

  describe("makeId / splitId", () => {
    it("round-trips a prefix and suffix through the id delimiter", () => {
      const id = schema.makeId("c", "abc123");
      expect(id).toBe("c:abc123");
      expect(schema.splitId(id)).toEqual({ prefix: "c", suffix: "abc123" });
    });

    it("throws on an id missing the delimiter", () => {
      expect(() => schema.splitId("noDelimiterHere")).toThrow();
    });

    it("throws on an id with an empty prefix or suffix", () => {
      expect(() => schema.splitId(":suffix")).toThrow();
      expect(() => schema.splitId("prefix:")).toThrow();
    });
  });

  describe("idsFromSheetRowId / idsFromSheetColumnId", () => {
    it("parses a numeric sheetGid:index id", () => {
      expect(schema.idsFromSheetRowId("12:3")).toEqual({
        sheetGid: 12,
        rowIndex: 3,
      });
      expect(schema.idsFromSheetColumnId("12:3")).toEqual({
        sheetGid: 12,
        colIndex: 3,
      });
    });

    it("throws when either part is non-numeric", () => {
      expect(() => schema.idsFromSheetRowId("abc:3")).toThrow();
      expect(() => schema.idsFromSheetRowId("12:xyz")).toThrow();
    });
  });

  describe("makeColIdFromPrefix / makeRowIdFromPrefix", () => {
    it("builds a col id shaped as c:<prefix>:<random>", () => {
      const colId = schema.makeColIdFromPrefix("hh");
      expect(colId).toMatch(/^c:hh:[0-9a-zA-Z_-]{7}$/);
    });

    it("builds a row id shaped as r:<prefix>:<random>", () => {
      const rowId = schema.makeRowIdFromPrefix("hh");
      expect(rowId).toMatch(/^r:hh:[0-9a-zA-Z_-]{7}$/);
    });

    it("throws when the prefix is empty", () => {
      expect(() => schema.makeColIdFromPrefix("")).toThrow();
      expect(() => schema.makeRowIdFromPrefix("")).toThrow();
    });
  });

  describe("uniform row indexes", () => {
    it("recognizes known uniform row indexes", () => {
      expect(schema.isUniformRowIndex(schema.colIdRowIndex)).toBe(true);
      expect(schema.isUniformRowIndex(schema.colIdRowIndex, "columnId")).toBe(
        true,
      );
      expect(schema.isUniformRowIndex(schema.colIdRowIndex, "header")).toBe(
        false,
      );
      expect(schema.isUniformRowIndex(9999)).toBe(false);
    });

    it("maps a known index back to its name", () => {
      expect(schema.uniformRowNameByIndex(schema.colIdRowIndex)).toBe(
        "columnId",
      );
      expect(schema.uniformRowNameByIndex(schema.headerRowIndex)).toBe(
        "header",
      );
    });

    it("throws mapping an unknown index to a name", () => {
      expect(() => schema.uniformRowNameByIndex(9999)).toThrow();
    });

    it("validateUniformRowIndex only throws for non-uniform rows", () => {
      expect(() =>
        schema.validateUniformRowIndex(schema.headerRowIndex, "header"),
      ).not.toThrow();
      expect(() => schema.validateUniformRowIndex(9999)).toThrow();
    });
  });

  describe("table placement", () => {
    it("accepts only the configured header row and start column as a Table's start", () => {
      const { headerRowIndex, startTableColIndex } = schema;
      expect(schema.isTableStart(headerRowIndex, startTableColIndex)).toBe(
        true,
      );
      expect(schema.isTableStart(headerRowIndex - 1, startTableColIndex)).toBe(
        false,
      );
      expect(schema.isTableStart(headerRowIndex, startTableColIndex + 1)).toBe(
        false,
      );
    });

    it("validateTableStart only throws for a start the layout does not allow", () => {
      const { headerRowIndex, startTableColIndex } = schema;
      expect(() =>
        schema.validateTableStart(headerRowIndex, startTableColIndex),
      ).not.toThrow();
      expect(() =>
        schema.validateTableStart(headerRowIndex - 1, startTableColIndex),
      ).toThrowError(/row 3, column A.*row 4, column A/);
    });

    it("labels a position in the numbering Sheets shows the operator", () => {
      expect(schema.positionLabel(0, 0)).toBe("row 1, column A");
      expect(schema.positionLabel(3, 1)).toBe("row 4, column B");
      expect(schema.positionLabel(3, 26)).toBe("row 4, column AA");
    });
  });

  describe("isDataRowIndex", () => {
    it("is false above the header row and true at/after the top data row", () => {
      const topDataRowIdx = schema.topDataRowIdx;
      expect(schema.isDataRowIndex(topDataRowIdx - 1)).toBe(false);
      expect(schema.isDataRowIndex(topDataRowIdx)).toBe(true);
    });
  });

  describe("isInSheetGids", () => {
    it("agrees with the generated sheet gid list", () => {
      const [firstGid] = configSheetGids;
      expect(firstGid).toBeDefined();
      expect(schema.isInSheetGids(firstGid as number)).toBe(true);
      expect(schema.isInSheetGids(Number.MAX_SAFE_INTEGER)).toBe(false);
    });
  });

  describe("config", () => {
    it("exposes the hand-authored spreadsheet layout constants", () => {
      expect(schema.idDelimiter).toBe(":");
      expect(schema.startTableColIndex).toBe(0);
      expect(schema.colIdRowIndex).toBe(0);
      expect(schema.actionRowIndex).toBe(2);
      expect(schema.headerRowIndex).toBe(3);
      expect(schema.topDataRowIdx).toBe(4);
    });
  });
});

describe("type-level precision", () => {
  it("resolves a name-addressed column to its exact literal types", () => {
    const column = ColumnSchema.fromColumnName("sheetConfig", "sheetGid");
    assertType<IsExactly<typeof column.valueName, "number">>(true);
    assertType<IsExactly<typeof column.columnName, "sheetGid">>(true);
    assertType<IsExactly<typeof column.sheetName, "sheetConfig">>(true);
    assertType<IsExactly<typeof column.fullName, "sheetConfig_sheetGid">>(true);
    assertType<
      IsExactly<ReturnType<typeof column.makeDefaultDataValue>, number | "">
    >(true);
    assertType<IsExactly<ColumnValue<"sheetConfig", "sheetGid">, number | "">>(
      true,
    );
    expect(column.valueName).toBe("number");
    expect(column.fullName).toBe("sheetConfig_sheetGid");
  });

  it("resolves a gid-addressed column to the usable widened types, never `never`", () => {
    const sheetGid = getSheetTraitByName("sheetConfig", "sheetGid");
    const column = ColumnSchema.fromColumnId(
      sheetGid,
      columnConfigs.sheetConfig.sheetGid.columnId,
    );
    assertType<IsExactly<typeof column.valueName, ValueName>>(true);
    assertType<IsExactly<typeof column.columnName, ColumnName<SheetName>>>(
      true,
    );
    assertType<IsExactly<typeof column.fullName, ColumnFullName>>(true);
    expect(column.valueName).toBe("number");
    expect(column.columnName).toBe("sheetGid");
  });

  it("keeps the sheet trait accessor's shape at both instantiations", () => {
    const byName = SheetSchema.fromSheetName("sheetConfig");
    const byGid = SheetSchema.fromSheetGid(byName.sheetGid);
    assertType<IsExactly<typeof byName.sheetName, "sheetConfig">>(true);
    assertType<IsExactly<typeof byGid.sheetName, SheetName>>(true);
    assertType<
      IsExactly<ReturnType<typeof byName.trait<"hasIdColumn">>, boolean>
    >(true);
    assertType<
      IsExactly<typeof byName.columnNames, ColumnName<"sheetConfig">[]>
    >(true);
    expect(byGid.sheetName).toBe("sheetConfig");
    expect(byName.columnNames).toContain("sheetGid");
  });

  it("reaches a sheet from the spreadsheet schema by either address", () => {
    const ss = new SpreadsheetSchema();
    const byName = ss.sheetByName("sheetConfig");
    const byGid = ss.sheetByGid(byName.sheetGid);
    assertType<IsExactly<typeof byName, SheetSchema<"sheetConfig">>>(true);
    assertType<IsExactly<typeof byGid, SheetSchema>>(true);
    expect(byGid.sheetGid).toBe(byName.sheetGid);
  });

  it("navigates from a column schema back to its own sheet", () => {
    const sheet = ColumnSchema.fromColumnName("sheetConfig", "sheetGid").sheet;
    assertType<IsExactly<typeof sheet, SheetSchema<"sheetConfig">>>(true);
    expect(sheet.sheetName).toBe("sheetConfig");
  });
});

function columnConfigOf(fullName: ColumnFullName) {
  const column = ColumnSchema.fromColumnName(
    ...(fullName.split("_") as [SheetName, never]),
  );
  return column;
}
function valueNameOfFullName(fullName: ColumnFullName): ValueName {
  return columnConfigOf(fullName).valueName;
}
function columnFullNameIsFormula(fullName: ColumnFullName): boolean {
  return columnConfigOf(fullName).isFormula;
}

describe("ColumnFullName, absolute column addressing", () => {
  it("narrows to a proper subset of columns when filtered by value name", () => {
    const sampled: ColumnFullName<"boolean"> = "test_sampledBoolean";
    // @ts-expect-error a number column is not a boolean column
    const numeric: ColumnFullName<"boolean"> = "sheetConfig_sheetGid";
    // @ts-expect-error a string column is not a boolean column
    const text: ColumnFullName<"boolean"> =
      "spreadsheetControls_fillRowIdsTimeLastRan";
    expect(valueNameOfFullName(sampled)).toBe("boolean");
    expect(valueNameOfFullName(numeric)).toBe("number");
    expect(valueNameOfFullName(text)).toBe("string");
  });

  // The two names are siblings, not one inside the other.
  it("keeps a declared checkbox column out of the boolean set, and the reverse", () => {
    const declared: ColumnFullName<"checkbox"> = "occupancy_updateTermsSelect";
    // @ts-expect-error a declared checkbox column is no longer a boolean column
    const asBoolean: ColumnFullName<"boolean"> = "occupancy_updateTermsSelect";
    // @ts-expect-error a column that only samples as boolean is not a checkbox column
    const sampled: ColumnFullName<"checkbox"> = "test_sampledBoolean";
    expect(valueNameOfFullName(declared)).toBe("checkbox");
    expect(valueNameOfFullName(asBoolean)).toBe("checkbox");
    expect(valueNameOfFullName(sampled)).toBe("boolean");
  });

  it("denotes every column, formula ones included, when unfiltered", () => {
    // Derived through the relative family, so this is an independent check
    // that collapsing the old "simple" union lost nothing.
    type EveryColumnFullName = {
      [SN in SheetName]: MakeColumnFullName<SN, ColumnName<SN>>;
    }[SheetName];
    assertType<IsExactly<ColumnFullName, EveryColumnFullName>>(true);
  });

  it("narrows further on the formula axis, which defaults to not caring", () => {
    const writable: ColumnFullName<"boolean", false> = "test_sampledBoolean";
    // @ts-expect-error a formula column can't be written to
    const derived: ColumnFullName<"boolean", false> =
      "sheetConfig_idPrefixIsUniqueOrEmpty";
    const eitherWay: ColumnFullName<"boolean"> =
      "sheetConfig_idPrefixIsUniqueOrEmpty";
    expect(columnFullNameIsFormula(writable)).toBe(false);
    expect(columnFullNameIsFormula(derived)).toBe(true);
    expect(eitherWay).toBe(derived);
  });

  it("resolves a full name's sheet, column, value name and value type exactly", () => {
    type FN = "occupancy_updateTermsSelect";
    assertType<IsExactly<SheetNameOf<FN>, "occupancy">>(true);
    assertType<IsExactly<ColumnNameOf<FN>, "updateTermsSelect">>(true);
    assertType<IsExactly<ValueNameOf<FN>, "checkbox">>(true);
    assertType<IsExactly<ValueOf<FN>, boolean>>(true);
  });

  it("agrees with relative addressing on sampled columns", () => {
    assertType<
      IsExactly<
        ValueNameOf<"occupancy_updateTermsSelect">,
        ColumnValueName<"occupancy", "updateTermsSelect">
      >
    >(true);
    assertType<
      IsExactly<
        ValueOf<"sheetConfig_sheetGid">,
        ColumnValue<"sheetConfig", "sheetGid">
      >
    >(true);
    assertType<
      IsExactly<
        ColumnNameOf<"valueConfig_transactionDescription">,
        "transactionDescription"
      >
    >(true);
  });

  it("filters a column name within a sheet on the same two axes", () => {
    assertType<
      IsExactly<
        ColumnNameFiltered<"sheetConfig", "checkbox", false>,
        "hasIdColumn" | "letApiAccess"
      >
    >(true);
    assertType<
      IsExactly<ColumnNameFiltered<"occupancy">, ColumnName<"occupancy">>
    >(true);
  });
});
