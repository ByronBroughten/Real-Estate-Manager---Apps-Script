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
  makeSheetIdxId(sheetGid: number, idx: number): string {
    return this.makeId(sheetGid, idx);
  }
  idsFromSheetColumnId(sheetColumnId: string): {
    sheetGid: number;
    columnIdx: number;
  } {
    const { idx, ...rest } = this._idsFromSheetIdxId(sheetColumnId);
    return { ...rest, columnIdx: idx };
  }
  idsFromSheetRowId(sheetRowId: string): { sheetGid: number; rowIdx: number } {
    const { idx, ...rest } = this._idsFromSheetIdxId(sheetRowId);
    return { ...rest, rowIdx: idx };
  }
  private _idsFromSheetIdxId(sheetRowId: string): {
    sheetGid: number;
    idx: number;
  } {
    const { prefix, suffix } = this.splitId(sheetRowId);
    const sheetGid = parseInt(prefix);
    const idx = parseInt(suffix);
    if (isNaN(sheetGid) || isNaN(idx)) {
      throw new Error(
        `Invalid sheetRowId: ${sheetRowId}. Must be in numeric values with a delimiter.`,
      );
    }
    return { sheetGid, idx };
  }

  get allSheetGids(): number[] {
    return allSheetGids;
  }
}
