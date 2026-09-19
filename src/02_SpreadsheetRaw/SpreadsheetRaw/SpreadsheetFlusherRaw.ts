import { SpreadsheetBaseRaw } from "../ClassBases/SpreadsheetBaseRaw";
import {
  emptySheetChanges,
  emptyUpdateRequests,
  type RowChangesToSave,
  type SheetChangesToSave,
} from "../ClassTypes/StateRaw";
import { SpreadsheetRaw } from "../SpreadsheetRaw";

interface SheetRowRef {
  sheetGid: number;
  rowIndex: number;
}

export class SpreadsheetFlusherRaw extends SpreadsheetBaseRaw {
  get ss(): SpreadsheetRaw {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  flush() {
    this._gatherUpdateRequests();
    const sheetGidsWithRowDeletes = this._sheetGidsWithRowDeletes();
    const sheetGidsWithConditionalFormatMutations =
      this._sheetGidsWithConditionalFormatMutations();
    const sheetGidsWithEditProtectionMutations =
      this._sheetGidsWithEditProtectionMutations();
    const hasFindReplace = this.updateRequests.findReplace.length > 0;
    this._sendUpdateRequests();
    // Row indexes only actually shift once the deletes have been sent.
    sheetGidsWithRowDeletes.forEach((sheetGid) =>
      this.ss.sheet(sheetGid).markRowIndexesStale(),
    );
    sheetGidsWithConditionalFormatMutations.forEach((sheetGid) =>
      this.ss.sheet(sheetGid).markConditionalFormatIndexesStale(),
    );
    sheetGidsWithEditProtectionMutations.forEach((sheetGid) =>
      this.ss.sheet(sheetGid).markEditProtectionsStale(),
    );
    if (hasFindReplace) this._invalidateFetchedCellState();
  }
  private _gatherUpdateRequests() {
    this.sheetsStateRaw.forEach((state, sheetGid) => {
      this._gatherSheetRequests(sheetGid, state.writeQueue.sheet);
      for (const [rowIndex, change] of state.writeQueue.rows) {
        this._gatherRowRequests(change, { sheetGid, rowIndex });
      }
      state.writeQueue.sheet = emptySheetChanges();
      state.writeQueue.rows = new Map();
    });
  }
  private _gatherSheetRequests(sheetGid: number, change: SheetChangesToSave) {
    if (change.insertColumn !== null) {
      this.ss.sheet(sheetGid).gatherInsertColumnRequest(change.insertColumn);
    }
    if (change.sort !== null) {
      this.ss.sheet(sheetGid).gatherSortRequest(change.sort);
    }
    change.fills.forEach((fill) => {
      this.ss.sheet(sheetGid).gatherFillRequest(fill);
    });
  }
  private _gatherRowRequests(
    change: RowChangesToSave,
    { sheetGid, rowIndex }: SheetRowRef,
  ) {
    if (change.append && change.delete) {
      return;
    } else if (change.delete) {
      this.updateRequests.delete.push({
        kind: "deleteRows",
        sheetId: sheetGid,
        startIndex: rowIndex,
        endIndex: rowIndex + 1,
      });
    } else {
      const row = this.ss.sheet(sheetGid).rowCommon(rowIndex);
      if (change.append) {
        row.gatherAppendRequest();
      }
      for (const [colIndex, cellChange] of change.update) {
        row.cell(colIndex).gatherUpdateRequest(cellChange);
      }
    }
  }
  private _sheetGidsWithRowDeletes(): Set<number> {
    return new Set(this.updateRequests.delete.map(({ sheetId }) => sheetId));
  }
  private _sheetGidsWithConditionalFormatMutations(): Set<number> {
    const sheetGids = new Set<number>();
    this.updateRequests.deleteConditionalFormat.forEach(({ sheetId }) =>
      sheetGids.add(sheetId),
    );
    this.updateRequests.addConditionalFormat.forEach(({ rule }) => {
      const sheetId = rule.ranges[0]?.sheetId;
      if (sheetId === undefined) {
        throw new Error(
          "Queued addConditionalFormatRule has no range sheetId.",
        );
      }
      sheetGids.add(sheetId);
    });
    return sheetGids;
  }
  private _sheetGidsWithEditProtectionMutations(): Set<number> {
    return new Set([
      ...this.updateRequests.deleteProtectedRange.map(({ sheetId }) => sheetId),
      ...this.updateRequests.addProtectedRange.map(
        ({ protection }) => protection.range.sheetId,
      ),
    ]);
  }
  private _sendUpdateRequests() {
    const requests = this.updateRequests;
    const operations = [
      ...requests.append,
      ...requests.insertColumn,
      // Fills go before updates, so a per-cell write on a filled column wins.
      ...requests.fill,
      ...requests.update,
      // Reads the text as it stands mid-batch, so it must follow what writes it.
      ...requests.findReplace,
      ...this._deleteOperationsDescending(),
      ...requests.sort,
      ...this._deleteConditionalFormatOperationsDescending(),
      ...requests.addConditionalFormat,
      ...requests.deleteProtectedRange,
      ...requests.addProtectedRange,
      ...requests.updateTableColumnType,
      // Outside the ordering rules the queue was built around, so last.
      ...requests.raw,
    ];
    this.spreadsheetStateRaw.rawSource.flush(this.spreadsheetId, operations);
    this.spreadsheetStateRaw.writeQueue.updateRequests = emptyUpdateRequests();
  }
  // Deletes within one batchUpdate apply sequentially and each shifts the
  // row indices below it, so same-sheet deletes must go highest-index-first
  // or a later request's pre-computed startIndex lands on the wrong row.
  private _deleteOperationsDescending() {
    return [...this.updateRequests.delete].sort(
      (a, b) => b.startIndex - a.startIndex,
    );
  }
  private _deleteConditionalFormatOperationsDescending() {
    return [...this.updateRequests.deleteConditionalFormat].sort((a, b) => {
      if (a.sheetId !== b.sheetId) return a.sheetId - b.sheetId;
      return b.index - a.index;
    });
  }
  // Scope can be allSheets, so one rule: every sheet's fetched cells go stale.
  private _invalidateFetchedCellState(): void {
    this.sheetsStateRaw.forEach((_, sheetGid) =>
      this.ss.sheet(sheetGid).invalidateCellState(),
    );
  }
}
