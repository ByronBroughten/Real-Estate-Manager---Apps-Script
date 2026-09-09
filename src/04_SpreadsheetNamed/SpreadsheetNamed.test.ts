import { describe, expect, it } from "vitest";
import { assertType, type IsExactly } from "../testSupport/typeAssertions";
import { ColumnMetaNamed } from "./ColumnMetaNamed";
import { ColumnNamed } from "./ColumnNamed";
import { RowNamed } from "./RowNamed";
import { SheetMetaNamed } from "./SheetMetaNamed";
import { SheetNamed } from "./SheetNamed";
import { SpreadsheetNamed } from "./SpreadsheetNamed";

// An accessor typed for one view but wired to the other's constructor
// type-checks; only an identity assertion plus an instance check catch it.
describe("Named navigation graph", () => {
  it("gives each accessor the class its return type names", () => {
    const ss = SpreadsheetNamed.init();
    const sheet = ss.sheet("occupancy");
    const sheetMeta = ss.sheetMeta("occupancy");
    const column = sheet.column("id");
    const columnMeta = sheetMeta.column("id");

    assertType<IsExactly<typeof sheet, SheetNamed<"occupancy">>>(true);
    assertType<IsExactly<typeof sheetMeta, SheetMetaNamed<"occupancy">>>(true);
    assertType<IsExactly<typeof sheet.meta, SheetMetaNamed<"occupancy">>>(true);
    assertType<IsExactly<typeof sheetMeta.primary, SheetNamed<"occupancy">>>(
      true,
    );
    assertType<IsExactly<typeof column, ColumnNamed<"occupancy", "id">>>(true);
    assertType<
      IsExactly<typeof columnMeta, ColumnMetaNamed<"occupancy", "id">>
    >(true);
    assertType<IsExactly<typeof column.sheet, SheetNamed<"occupancy">>>(true);
    assertType<IsExactly<typeof columnMeta.sheet, SheetMetaNamed<"occupancy">>>(
      true,
    );
    assertType<
      IsExactly<typeof column.meta, ColumnMetaNamed<"occupancy", "id">>
    >(true);
    assertType<
      IsExactly<typeof columnMeta.primary, ColumnNamed<"occupancy", "id">>
    >(true);
    assertType<IsExactly<ReturnType<typeof sheet.row>, RowNamed<"occupancy">>>(
      true,
    );

    expect(sheet.meta).toBeInstanceOf(SheetMetaNamed);
    expect(sheetMeta.primary).toBeInstanceOf(SheetNamed);
    expect(column).toBeInstanceOf(ColumnNamed);
    expect(columnMeta).toBeInstanceOf(ColumnMetaNamed);
    expect(column.sheet).toBeInstanceOf(SheetNamed);
    expect(columnMeta.sheet).toBeInstanceOf(SheetMetaNamed);
    expect(column.meta).toBeInstanceOf(ColumnMetaNamed);
    expect(columnMeta.primary).toBeInstanceOf(ColumnNamed);
    expect(sheet.row(sheet.schema.topDataRowIdx)).toBeInstanceOf(RowNamed);
  });
});
