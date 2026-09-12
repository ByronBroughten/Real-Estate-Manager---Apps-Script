import type { GoogleUpdateRequest } from "../../00_base/AppsScriptTypes";
import type { CellValue, CellValueName } from "../../00_base/base";
import { Obj } from "../../utils/Obj";
import type {
  RowChangeProps,
  RowChangesToSave,
  RowChangeUpdateProps,
} from "../ClassTypes/RawState";
import { CellRaw } from "../CellRaw";
import { SheetRaw } from "../SheetRaw";
import { RowRawBase } from "./RowRawBase";

export abstract class RowCommonRaw extends RowRawBase {
  get sheet(): SheetRaw {
    return new SheetRaw(this.sheetRawProps);
  }
  ensureFullActiveDataCells() {
    this.ensureStateExists();
    this.sheet.fullTableColIndexes.forEach((colIndex) => {
      this.cell(colIndex).ensureActive();
    });
  }
  cell<VN extends CellValueName = CellValueName>(
    colIndex: number,
  ): CellRaw<VN> {
    return new CellRaw<VN>({
      ...this.sheetRawProps,
      rowIndex: this.rowIndex,
      colIndex: colIndex,
    });
  }
  firstTableCell(): CellRaw {
    return this.cell(this.schema.startTableColIndex);
  }
  abstract get activeValueArr(): CellValue[];
  hasValue(value: unknown): boolean {
    return this.activeValueArr.includes(value as CellValue);
  }
  returnMissingValues<V extends CellValue>(...values: V[]): V[] {
    return values.filter((value) => !this.activeValueArr.includes(value));
  }
  remove(): void {
    this.rowStates.delete(this.rowIndex);
  }
  updateValue(colIndex: number, value: CellValue): this {
    this.cell(colIndex).updateValue(value);
    return this;
  }
  get sheetRowId(): string {
    return this.schema.makeId(this.sheetGid, this.rowIndex);
  }
  gatherFetchFull(): this {
    this.sheet.gatherFetchRange({
      startRowIndex: this.rowIndex,
      endRowIndex: this.rowIndex + 1,
      startColumnIndex: this.schema.startTableColIndex,
    });
    this.sheetState.rowIndexesToFinalize.add(this.rowIndex);
    return this;
  }
  get isQueuedForDelete(): boolean {
    const changes = this.allChangesToSave.get(this.sheetRowId);
    return changes?.level === "row" && changes.delete !== null;
  }
  get changesToSave(): RowChangesToSave {
    this._ensureChangesToSaveExists();
    return this.allChangesToSave.get(this.sheetRowId) as RowChangesToSave;
  }
  private _ensureChangesToSaveExists(): void {
    const sheetChangesToSave = this.rawState.changesToSave;
    const sheetRowId = this.sheetRowId;
    if (!sheetChangesToSave.has(sheetRowId)) {
      sheetChangesToSave.set(sheetRowId, {
        level: "row",
        append: false,
        delete: null,
        update: new Map(),
      });
    }
  }
  addRowChangeToSave(props: RowChangeProps): this {
    const changes = this.changesToSave;
    if (changes.delete) return this;
    const actions = {
      append: (_: RowChangeProps) => (changes.append = true),
      delete: (_: RowChangeProps) => (changes.delete = this.deleteRequest),
      update: (props: RowChangeProps) => {
        const { colIndex, ...rest } = props as RowChangeUpdateProps;
        changes.update.set(colIndex, {
          ...changes.update.get(colIndex),
          ...Obj.strictOmit(rest, "action"),
        });
      },
    };
    actions[props.action](props);
    return this;
  }
  get deleteRequest(): GoogleUpdateRequest {
    return {
      deleteDimension: {
        range: {
          sheetId: this.sheetGid,
          dimension: "ROWS",
          startIndex: this.rowIndex,
          endIndex: this.rowIndex + 1,
        },
      },
    };
  }
  gatherAppendRequest(): void {
    const appendCells = this._appendCellsRequest();
    appendCells.rows = [...(appendCells.rows ?? []), {}];
  }
  // One request per table: Sheets treats each appendCells as targeting the
  // same first free row, so N one-row requests only grow the table by one.
  private _appendCellsRequest(): GoogleAppsScript.Sheets.Schema.AppendCellsRequest {
    const existing = this.updateRequests.append.find(
      (request) => request.appendCells?.sheetId === this.sheetGid,
    )?.appendCells;
    if (existing) return existing;
    const appendCells: GoogleAppsScript.Sheets.Schema.AppendCellsRequest = {
      sheetId: this.sheetGid,
      tableId: `${this.activeTable.tableId}`,
      rows: [],
      fields: "userEnteredValue",
    };
    this.updateRequests.append.push({ appendCells });
    return appendCells;
  }
}
