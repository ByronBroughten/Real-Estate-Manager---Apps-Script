import { describe, expect, it } from "vitest";
import { columnConfigs } from "../01_generatedConfigs/columnConfigs";
import type {
  ColumnFullNameSimple,
  ColumnName,
} from "../01_generatedConfigs/columnConfigsTypes";
import {
  configSheetGids,
  getSheetTraitByName,
  type SheetName,
} from "../01_generatedConfigs/sheetConfigsTypes";
import type { ValueName } from "../01_generatedConfigs/valueSchemas";
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

// The type checker passing does not prove precision survived: a value type that
// widens to a union, or collapses to never, still compiles. These pin both ends.
type IsExactly<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
function assertType<T extends true>(assertion: T): T {
  return assertion;
}

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
    assertType<IsExactly<typeof column.fullName, ColumnFullNameSimple>>(true);
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

  it("navigates from a column schema back to its own sheet", () => {
    const sheet = ColumnSchema.fromColumnName("sheetConfig", "sheetGid").sheet;
    assertType<IsExactly<typeof sheet, SheetSchema<"sheetConfig">>>(true);
    expect(sheet.sheetName).toBe("sheetConfig");
  });
});
