import { describe, expect, it } from "vitest";
import { assertType, type IsExactly } from "../testSupport/typeAssertions";
import {
  isInTnGroup,
  type SheetNameWithRunnerColumns,
} from "./SheetNameGroups";

describe("SheetNameWithRunnerColumns", () => {
  it("is exactly the sheets carrying a complete runner stem", () => {
    assertType<
      IsExactly<SheetNameWithRunnerColumns, "spreadsheetControls" | "occupancy">
    >(true);
  });

  it("agrees at runtime with the type it is derived from", () => {
    expect(isInTnGroup("hasRunnerColumns", "spreadsheetControls")).toBe(true);
    expect(isInTnGroup("hasRunnerColumns", "occupancy")).toBe(true);
    expect(isInTnGroup("hasRunnerColumns", "sheetConfig")).toBe(false);
  });
});
