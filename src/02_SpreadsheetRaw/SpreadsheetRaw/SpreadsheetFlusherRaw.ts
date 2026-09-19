import type {
  TableColumnSnapshot,
  UpdateTableColumnPropertiesOperation,
} from "../../00_Source/RawSource/RawSource";
import { Val } from "../../utils/Val";
import { SpreadsheetBaseRaw } from "../ClassBases/SpreadsheetBaseRaw";
import {
  emptySheetChanges,
  emptyUpdateRequests,
  type RowChangesToSave,
  type SheetChangesToSave,
  type UpdateTableColumnTypeOperation,
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
    const sheetGidsWithColumnTypeUpdates = new Set(
      this.updateRequests.updateTableColumnType.map(({ sheetId }) => sheetId),
    );
    this._sendUpdateRequests();
    this._clearFetchedColumnProperties(sheetGidsWithColumnTypeUpdates);
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
      // First, so a header write in the same batch renames the column rather than being reverted.
      ...this._tableColumnPropertiesOperations(),
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
      // Outside the ordering rules the queue was built around, so last.
      ...requests.raw,
    ];
    this.spreadsheetStateRaw.rawSource.flush(this.spreadsheetId, operations);
    this.spreadsheetStateRaw.writeQueue.updateRequests = emptyUpdateRequests();
  }
  private _tableColumnPropertiesOperations(): UpdateTableColumnPropertiesOperation[] {
    const opsBySheet = new Map<number, UpdateTableColumnTypeOperation[]>();
    this.updateRequests.updateTableColumnType.forEach((operation) => {
      const ops = opsBySheet.get(operation.sheetId) ?? [];
      ops.push(operation);
      opsBySheet.set(operation.sheetId, ops);
    });
    return Array.from(opsBySheet, ([sheetGid, ops]) =>
      this._tableColumnPropertiesOperation(sheetGid, ops),
    );
  }
  private _tableColumnPropertiesOperation(
    sheetGid: number,
    ops: UpdateTableColumnTypeOperation[],
  ): UpdateTableColumnPropertiesOperation {
    const { title, knownTable } = Val.assert(
      this.sheetsStateRaw.get(sheetGid),
      `sheet state ${sheetGid}`,
    ).working;
    const tableId = Val.assert(ops[0], "queued column type").tableId;
    const tableLabel = `Table ${tableId} on "${title}"`;
    if (
      knownTable?.tableId !== tableId ||
      ops.some((operation) => operation.tableId !== tableId)
    ) {
      throw new Error(`${tableLabel} is not the fetched Table on that sheet.`);
    }
    const snapshot = knownTable.columnProperties;
    if (snapshot.length === 0) {
      throw new Error(
        `${tableLabel} has no fetched column properties; refetch it before setting a column type.`,
      );
    }
    if (
      this.updateRequests.insertColumn.some((op) => op.sheetId === sheetGid)
    ) {
      throw new Error(
        `Refusing to set column types on ${tableLabel}: the same flush inserts a column on that sheet.`,
      );
    }
    const validated = snapshot.filter(
      (column) =>
        column.dataValidationConditionType !== undefined ||
        column.dataValidationValues.length > 0,
    );
    if (validated.length > 0) {
      throw new Error(
        `Refusing to set column types on ${tableLabel}: it would reset the dropdown style and colours on its validated columns ${validated.map(columnLabel).join(", ")}.`,
      );
    }
    const typeByIndex = new Map(
      ops.map((operation) => [operation.columnIndex, operation.columnType]),
    );
    typeByIndex.forEach((_columnType, columnIndex) => {
      if (
        !snapshot.some((column) => (column.columnIndex ?? 0) === columnIndex)
      ) {
        throw new Error(
          `${tableLabel} has no fetched ${tableColumnLabel(columnIndex)}.`,
        );
      }
    });
    return {
      kind: "updateTableColumnProperties",
      tableId: knownTable.tableId,
      columnProperties: snapshot.map((column) => {
        const columnIndex = column.columnIndex ?? 0;
        if (column.columnName === undefined) {
          throw new Error(
            `${tableLabel} ${tableColumnLabel(columnIndex)} has no columnName; refusing to replace column properties.`,
          );
        }
        const columnType = typeByIndex.get(columnIndex) ?? column.columnType;
        return {
          columnIndex,
          columnName: column.columnName,
          ...(columnType !== undefined ? { columnType } : {}),
        };
      }),
    };
  }
  // The sent list is now the Table's, and what was fetched no longer is.
  private _clearFetchedColumnProperties(sheetGids: Set<number>) {
    sheetGids.forEach((sheetGid) => {
      const knownTable = this.sheetsStateRaw.get(sheetGid)?.working.knownTable;
      if (knownTable) knownTable.columnProperties = [];
    });
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

function columnLabel(column: TableColumnSnapshot): string {
  return column.columnName ?? tableColumnLabel(column.columnIndex ?? 0);
}

function tableColumnLabel(columnIndex: number): string {
  return `table column ${columnIndex}`;
}
