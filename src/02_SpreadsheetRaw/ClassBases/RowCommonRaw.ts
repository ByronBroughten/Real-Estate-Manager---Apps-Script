import type { GoogleUpdateRequest } from "../../00_base/AppsScriptTypes";
import type { CellValue, CellValueName } from "../../00_base/base";
import { SchemaBase } from "../BaseSchema";
import type {
  RowChangeProps,
  RowChangesToSave,
  RowChangeUpdateProps,
} from "../ClassTypes/RawState";
import { SheetRaw } from "../SheetRaw";
import { CellRaw } from "./CellRaw";
import { RowRawBase } from "./RowRawBase";

export abstract class RowCommonRaw extends RowRawBase {
  get schema() {
    return new SchemaBase();
  }
  get sheet(): SheetRaw {
    return new SheetRaw(this.sheetRawProps);
  }
  ensureFullActiveDataCells() {
    this.ensureStateExists();
    this.sheet.fullTableColIndexes.forEach((colIndex) => {
      this.cell(colIndex).ensureActive();
    });
  }
  cell<VN extends CellValueName>(
    colIndex: number,
    valueNameAssert?: VN,
  ): CellRaw<VN> {
    return new CellRaw<VN>({
      ...this.sheetRawProps,
      rowIndex: this.rowIndex,
      colIndex: colIndex,
      valueName: valueNameAssert,
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
        const { colIndex, value } = props as RowChangeUpdateProps;
        changes.update.set(colIndex, value);
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
    this.updateRequests.append.push({
      appendCells: {
        sheetId: this.sheetGid,
        tableId: `${this.activeTable.tableId}`,
        rows: [{}],
        fields: "userEnteredValue",
      },
    });
  }
}
