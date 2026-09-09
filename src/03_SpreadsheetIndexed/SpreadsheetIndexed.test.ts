import { describe, expect, it } from "vitest";
import { columnConfigs } from "../01_generatedConfigs/columnConfigs";
import { sheetConfigs } from "../01_generatedConfigs/sheetConfigs";
import { assertType, type IsExactly } from "../testSupport/typeAssertions";
import { ColumnIndexed } from "./ColumnIndexed";
import { ColumnMetaIndexed } from "./ColumnMetaIndexed";
import { RowIndexed } from "./RowIndexed";
import { SheetIndexed } from "./SheetIndexed";
import { SheetMetaIndexed } from "./SheetMetaIndexed";
import { SpreadsheetIndexed } from "./SpreadsheetIndexed";
import { SpreadsheetIndexedBase } from "./SpreadsheetIndexedBase";

const OCCUPANCY_GID = sheetConfigs.occupancy.sheetGid;
const ID_COLUMN_ID = columnConfigs.occupancy.id.columnId;

// A mis-wired accessor still type-checks; the instance checks catch it.
describe("SpreadsheetIndexed navigation", () => {
  it("gives each accessor the class its return type names", () => {
    const ssi = new SpreadsheetIndexed(
      SpreadsheetIndexedBase.initSpreadsheetIndexedProps(),
    );
    const sheet = ssi.sheet(OCCUPANCY_GID);
    const sheetMeta = ssi.sheetMeta(OCCUPANCY_GID);
    const column = sheet.column(ID_COLUMN_ID);
    const columnMeta = sheetMeta.column(ID_COLUMN_ID);

    assertType<IsExactly<typeof sheet, SheetIndexed>>(true);
    assertType<IsExactly<typeof sheetMeta, SheetMetaIndexed>>(true);
    assertType<IsExactly<typeof sheet.meta, SheetMetaIndexed>>(true);
    assertType<IsExactly<typeof sheetMeta.primary, SheetIndexed>>(true);
    assertType<IsExactly<typeof column, ColumnIndexed>>(true);
    assertType<IsExactly<typeof columnMeta, ColumnMetaIndexed>>(true);
    assertType<IsExactly<typeof column.sheet, SheetIndexed>>(true);
    assertType<IsExactly<typeof columnMeta.sheet, SheetMetaIndexed>>(true);
    assertType<IsExactly<typeof column.meta, ColumnMetaIndexed>>(true);
    assertType<IsExactly<typeof columnMeta.primary, ColumnIndexed>>(true);
    assertType<IsExactly<ReturnType<typeof sheet.row>, RowIndexed>>(true);

    expect(sheet.meta).toBeInstanceOf(SheetMetaIndexed);
    expect(sheetMeta.primary).toBeInstanceOf(SheetIndexed);
    expect(column).toBeInstanceOf(ColumnIndexed);
    expect(columnMeta).toBeInstanceOf(ColumnMetaIndexed);
    expect(column.sheet).toBeInstanceOf(SheetIndexed);
    expect(columnMeta.sheet).toBeInstanceOf(SheetMetaIndexed);
    expect(column.meta).toBeInstanceOf(ColumnMetaIndexed);
    expect(columnMeta.primary).toBeInstanceOf(ColumnIndexed);
    expect(sheet.row(sheet.schema.topDataRowIdx)).toBeInstanceOf(RowIndexed);
  });
});
