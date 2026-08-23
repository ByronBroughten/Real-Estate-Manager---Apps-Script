import { RowIndexedBase } from "./RowIndexedBase";
import { SheetIndexed } from "./SheetIndexed";

export class RowCommonIndexed extends RowIndexedBase {
  get sheet(): SheetIndexed {
    return new SheetIndexed(this.sheetIndexedProps);
  }
  prepFetchFull(): void {
    this.sheetState.indexesOfFullRowsToFetch.add(this.rowIndex);
    this.preFetchGridRanges.push({
      row: this.rowIndex,
      column: "allDataColumns",
    });
  }
}
