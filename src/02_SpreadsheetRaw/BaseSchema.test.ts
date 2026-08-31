import { describe, expect, it } from "vitest";
import { SchemaBase } from "./BaseSchema";

describe("SchemaBase", () => {
  const schema = new SchemaBase();

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
      expect(
        schema.isUniformRowIndex(schema.colIdRowIndex, "columnId"),
      ).toBe(true);
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

  describe("sheetGids / isInSheetGids", () => {
    it("agrees with its own sheetGids list", () => {
      const [firstGid] = schema.sheetGids();
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
