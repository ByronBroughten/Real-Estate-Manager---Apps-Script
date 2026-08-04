import { allSheetGids } from "../0. spreadsheetMetaData/4.0 tableAttributes";

import { ColumnSchemaRaw } from "./ColumnSchemaRaw";
import { SchemaBase } from "./SchemaBase";
import { SheetSchemaRaw } from "./SheetSchemaRaw";

export class SpreadsheetSchemaRaw extends SchemaBase {
  sheet(sheetGid: number): SheetSchemaRaw {
    return new SheetSchemaRaw(sheetGid);
  }
  column(sheetGid: number, columnIdx: number): ColumnSchemaRaw {
    return new ColumnSchemaRaw(sheetGid, columnIdx);
  }
  idsFromSheetRowId(sheetRowId: string): { sheetGid: number; rowIdx: number } {
    const [sheetGidStr, rowIdxStr] = sheetRowId.split(
      this.config("idDelimiterNext"),
    );
    if (!sheetGidStr || !rowIdxStr) {
      throw new Error(
        `Invalid sheetRowId: ${sheetRowId}. Must be in the format "sheetGid${this.config("idDelimiterNext")}rowIdx"`,
      );
    }
    const sheetGid = parseInt(sheetGidStr);
    const rowIdx = parseInt(rowIdxStr);
    if (isNaN(sheetGid) || isNaN(rowIdx)) {
      throw new Error(
        `Invalid sheetRowId: ${sheetRowId}. Must be in numeric values with a delimiter.`,
      );
    }
    return { sheetGid, rowIdx };
  }

  get allSheetGids(): number[] {
    return allSheetGids;
  }
}
