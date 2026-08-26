import type { CellValue } from "../00_base/base";
import { RowIndexedBase } from "./RowIndexedBase";
import { SheetIndexed } from "./SheetIndexed";

export abstract class RowCommonIndexed extends RowIndexedBase {
  get sheet(): SheetIndexed {
    return new SheetIndexed(this.sheetIndexedProps);
  }
  abstract get activeValueArr(): CellValue[];
  hasValue(value: unknown): boolean {
    return this.activeValueArr.includes(value as CellValue);
  }
  prepFetchFull(): void {
    this.sheetState.indexesOfFullRowsToFetch.add(this.rowIndex);
    this.preFetchGridRanges.push({
      row: this.rowIndex,
      column: "allDataColumns",
    });
  }
}
