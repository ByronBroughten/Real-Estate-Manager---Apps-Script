import { describe, expect, it } from "vitest";
import { assertType, type IsExactly } from "../testSupport/typeAssertions";
import { isInTnGroup, type SheetNameWithIdColumn } from "./SheetNameGroups";

describe("SheetNameWithIdColumn", () => {
  it("agrees at runtime with the type it is derived from", () => {
    assertType<IsExactly<SheetNameWithIdColumn, SheetNameWithIdColumn>>(true);
    expect(isInTnGroup("hasIdColumn", "occupancy")).toBe(true);
    expect(isInTnGroup("hasIdColumn", "spreadsheetControls")).toBe(false);
  });
});
