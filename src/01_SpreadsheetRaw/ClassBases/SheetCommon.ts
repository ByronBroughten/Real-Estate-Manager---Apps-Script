import { Arr } from "../../utils/Arr";
import { SheetRawBase } from "./SheetRawBase";

export abstract class SheetCommon extends SheetRawBase {
  get rowIndexesAreValid(): boolean {
    return this.sheetState.rowIndexesAreValid;
  }
  invalidateRowIndexes(): void {
    this.sheetState.rowIndexesAreValid = false;
  }
  validateRowIndexes(): void {
    this.sheetState.rowIndexesAreValid = true;
  }
  get firstStaleColIndex(): number | null {
    return this.sheetState.firstStaleColIndex;
  }
  ensureColIndexIsStale(colIndex: number): void {
    this.sheetState.firstStaleColIndex = Math.min(
      this.sheetState.firstStaleColIndex ?? Infinity,
      colIndex,
    );
  }
  get title(): string {
    if (this.sheetState.title === null) {
      throw new Error(
        `Sheet title is null for sheetGid ${this.sheetGid}. Ensure that the sheet properties have been fetched.`,
      );
    }
    return this.sheetState.title;
  }
  get indexesOfFullRowsToFetch(): Set<number> {
    return this.sheetState.indexesOfFullRowsToFetch;
  }
  get indexesOfColDataToFetch(): Set<number> {
    return this.sheetState.indexesOfColDataToFetch;
  }
  get activeRowIndexes(): number[] {
    const indexes = Array.from(this.sheetState.rowStates.keys());
    return Arr.sortAscending(indexes);
  }
  get activeDataRowIndexes(): number[] {
    return this.activeRowIndexes.filter((rowIndex) =>
      this.sheetSchema.isDataRowIndex(rowIndex),
    );
  }
  get fullDataColIndexes(): number[] {
    return Arr.indexesFromUntil(
      this.sheetSchema.startTableColIndex,
      this.activeTable.endColumnIndex,
    );
  }
  get fullDataRowIndexes(): number[] {
    return Arr.indexesFromUntil(
      this.sheetSchema.topDataRowIdx,
      this.activeTable.endRowIndex,
    );
  }
  get rowCount(): number {
    return this.sheetState.rowStates.size;
  }
  get dataRowCount(): number {
    return this.rowCount - this.sheetSchema.topDataRowIdx;
  }
}
