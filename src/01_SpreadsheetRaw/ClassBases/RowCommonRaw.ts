import type {
  GoogleCellValue,
  GoogleUpdateRequest,
} from "../../00_base/AppsScriptTypes";
import type { CellValue, CellValueName } from "../../00_base/base";
import { SchemaBase } from "../../03_SpreadsheetIndexed/SchemaBase";
import { valS } from "../../utils/validation";
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
  value<VN extends CellValueName>(
    colIndex: number,
    valueNameAssert?: VN,
  ): CellValue<VN> {
    return this.cell(colIndex, valueNameAssert).value();
  }
  hasValue(value: unknown): boolean {
    return this.activeValueArr.includes(value as CellValue);
  }
  setValueState(colIndex: number, value: CellValue): void {
    if (!this.rowIsActive()) {
      throw new Error(
        `Cannot set value for row ${this.rowIndex} because it is not active.`,
      );
    }
    this.rowState.set(colIndex, value);
  }
  updateValue(colIndex: number, value: CellValue): this {
    this.cell(colIndex).validateIndexNotStale();
    this.setValueState(colIndex, value);
    return this.addRowChangeToSave({ action: "update", colIdxes: [colIndex] });
  }
  integrateEmptyState(colIndex: number): void {
    this.setValueState(colIndex, "");
  }
  integrateState(
    colIndex: number,
    cellValue: GoogleCellValue | undefined,
  ): void {
    const value = this._extractFromSheetValue(cellValue);
    this.setValueState(colIndex, value);
  }
  private _extractFromSheetValue(
    cellValue: GoogleCellValue | undefined,
  ): CellValue {
    if (cellValue === undefined) {
      return "";
    }
    const effectiveValue = cellValue.effectiveValue;
    if (effectiveValue === undefined) {
      return "";
    }
    if ("stringValue" in effectiveValue) {
      return valS.assert(effectiveValue.stringValue, "stringValue");
    } else if ("boolValue" in effectiveValue) {
      return valS.assert(effectiveValue.boolValue, "boolValue");
    } else if ("numberValue" in effectiveValue) {
      return valS.assert(effectiveValue.numberValue, "numberValue");
    } else {
      return "";
    }
  }
  delete(): void {
    this.remove();
    this.addRowChangeToSave({ action: "delete" });
  }
  append(): this {
    if (this.rowIsActive()) {
      throw new Error(
        `Cannot append row ${this.rowIndex} because it is already active.`,
      );
    }
    this.sheetState.rowStates.set(this.rowIndex, new Map());
    this.activeTable.endRowIndex++;
    this.addRowChangeToSave({ action: "append" });
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
  get sheetRowId(): string {
    return this.schema.makeId(this.sheetGid, this.rowIndex);
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
        update: new Set(),
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
        for (const colIndex of (props as RowChangeUpdateProps).colIdxes) {
          changes.update.add(colIndex);
        }
      },
    };
    actions[props.action](props);
    return this;
  }
  gatherFetchFull(): this {
    this.sheet.gatherFetchRange({
      startRowIndex: this.rowIndex,
      endRowIndex: this.rowIndex + 1,
      startColumnIndex: this.schema.startTableColIndex,
    });
    return this;
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
