import { describe, expect, it } from "vitest";
import { assertType, type IsExactly } from "../testSupport/typeAssertions";
import { isInTnGroup, type SheetNameWithIdColumn } from "./SheetNameGroups";

describe("SheetNameWithIdColumn", () => {
  it("includes a sheet that declares an id column and excludes one that doesn't", () => {
    assertType<
      IsExactly<Extract<SheetNameWithIdColumn, "occupancy">, "occupancy">
    >(true);
    assertType<
      IsExactly<Extract<SheetNameWithIdColumn, "spreadsheetConfig">, never>
    >(true);
  });

  it("agrees at runtime with the type it is derived from", () => {
    expect(isInTnGroup("hasIdColumn", "occupancy")).toBe(true);
    expect(isInTnGroup("hasIdColumn", "spreadsheetConfig")).toBe(false);
  });
});
