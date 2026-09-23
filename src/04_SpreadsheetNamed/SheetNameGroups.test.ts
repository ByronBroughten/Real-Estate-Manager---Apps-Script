import { describe, expect, it } from "vitest";
import { assertType, type IsExactly } from "../testSupport/typeAssertions";
import {
  isInTnGroup,
  type SheetNameWithIdAndNameColumn,
  type SheetNameWithIdColumn,
  type SheetNameWithNameColumn,
} from "./SheetNameGroups";

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

describe("SheetNameWithNameColumn", () => {
  it("includes a sheet whose header row has the Name header and excludes one that doesn't", () => {
    assertType<
      IsExactly<Extract<SheetNameWithNameColumn, "property">, "property">
    >(true);
    assertType<
      IsExactly<Extract<SheetNameWithNameColumn, "spreadsheetConfig">, never>
    >(true);
  });
});

describe("SheetNameWithIdAndNameColumn", () => {
  it("excludes a sheet with a name column but no id column", () => {
    assertType<
      IsExactly<
        Extract<SheetNameWithIdAndNameColumn, "property" | "occPayAllocation">,
        "property"
      >
    >(true);
  });
});
