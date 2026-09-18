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
    const sheetGidsWithProtectedRangeMutations =
      this._sheetGidsWithProtectedRangeMutations();
    const hasFindReplace = this.updateRequests.findReplace.length > 0;
    this._sendUpdateRequests();
    // Row indexes only actually shift once the deletes have been sent.
    sheetGidsWithRowDeletes.forEach((sheetGid) =>
      this.ss.sheet(sheetGid).markRowIndexesStale(),
    );
    sheetGidsWithConditionalFormatMutations.forEach((sheetGid) =>
      this.ss.sheet(sheetGid).markConditionalFormatIndexesStale(),
    );
    sheetGidsWithProtectedRangeMutations.forEach((sheetGid) =>
      this.ss.sheet(sheetGid).markProtectedRangesStale(),
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
    return new Set(
      this.updateRequests.delete.map((operation) => {
        if (operation.kind !== "deleteRows") {
          throw new Error("Queued delete is not a deleteRows operation.");
        }
        return operation.sheetId;
      }),
    );
  }
  private _sheetGidsWithConditionalFormatMutations(): Set<number> {
    const sheetGids = new Set<number>();
    this.updateRequests.deleteConditionalFormat.forEach((operation) => {
      if (operation.kind !== "deleteConditionalFormatRule") {
        throw new Error(
          "Queued deleteConditionalFormat is not a deleteConditionalFormatRule operation.",
        );
      }
      sheetGids.add(operation.sheetId);
    });
    this.updateRequests.addConditionalFormat.forEach((operation) => {
      if (operation.kind !== "addConditionalFormatRule") {
        throw new Error(
          "Queued addConditionalFormat is not an addConditionalFormatRule operation.",
        );
      }
      const sheetId = operation.rule.ranges[0]?.sheetId;
      if (sheetId === undefined) {
        throw new Error(
          "Queued addConditionalFormatRule has no range sheetId.",
        );
      }
      sheetGids.add(sheetId);
    });
    return sheetGids;
  }
  private _sheetGidsWithProtectedRangeMutations(): Set<number> {
    const sheetGids = new Set<number>();
    this.updateRequests.deleteProtectedRange.forEach((operation) => {
      if (operation.kind !== "deleteProtectedRange") {
        throw new Error(
          "Queued deleteProtectedRange is not a deleteProtectedRange operation.",
        );
      }
      sheetGids.add(operation.sheetId);
    });
    this.updateRequests.addProtectedRange.forEach((operation) => {
      if (operation.kind !== "addProtectedRange") {
        throw new Error(
          "Queued addProtectedRange is not an addProtectedRange operation.",
        );
      }
      sheetGids.add(operation.protection.range.sheetId);
    });
    return sheetGids;
  }
  private _sendUpdateRequests() {
    const surs = this.spreadsheetStateRaw.writeQueue.updateRequests;
    const operations = [
      ...surs.append,
      ...surs.insertColumn,
      // Fills go before updates, so a per-cell write on a filled column wins.
      ...surs.fill,
      ...surs.update,
      // Reads the text as it stands mid-batch, so it must follow what writes it.
      ...surs.findReplace,
      ...this._deleteOperationsDescending(),
      ...surs.sort,
      ...this._deleteConditionalFormatOperationsDescending(),
      ...surs.addConditionalFormat,
      ...surs.deleteProtectedRange,
      ...surs.addProtectedRange,
      // Outside the ordering rules the queue was built around, so last.
      ...surs.raw,
    ];
    this.spreadsheetStateRaw.rawSource.flush(this.spreadsheetId, operations);
    this.spreadsheetStateRaw.writeQueue.updateRequests = emptyUpdateRequests();
  }
  // Deletes within one batchUpdate apply sequentially and each shifts the
  // row indices below it, so same-sheet deletes must go highest-index-first
  // or a later request's pre-computed startIndex lands on the wrong row.
  private _deleteOperationsDescending() {
    return [...this.spreadsheetStateRaw.writeQueue.updateRequests.delete].sort(
      (a, b) => {
        if (a.kind !== "deleteRows" || b.kind !== "deleteRows") {
          throw new Error("Queued delete is not a deleteRows operation.");
        }
        return b.startIndex - a.startIndex;
      },
    );
  }
  private _deleteConditionalFormatOperationsDescending() {
    return [
      ...this.spreadsheetStateRaw.writeQueue.updateRequests
        .deleteConditionalFormat,
    ].sort((a, b) => {
      if (
        a.kind !== "deleteConditionalFormatRule" ||
        b.kind !== "deleteConditionalFormatRule"
      ) {
        throw new Error(
          "Queued deleteConditionalFormat is not a deleteConditionalFormatRule operation.",
        );
      }
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
