import type {
  CellValue,
  CellValueName,
} from "../1.0 Configs/0.0 ConfigPrecursors";
import { SchemaBase } from "../1.1 SpreadsheetSchemaRaw/SchemaBase";
import { type ValueSchemaKey } from "../2.0 Schemas/3.0 valueSchema";
import {
  getCellValTrait,
  type ValueTrait,
} from "../2.0 Schemas/3.2 valueSchemas";
import { RowRawBase } from "./ClassBases/RowRawBase";
import { ColumnRaw } from "./ColumnRaw";
import { SheetRaw } from "./SheetRaw";
import type {
  GoogleCellValue,
  GoogleUpdateRequest,
  UserEnteredValue,
} from "./Types/AppsScriptTypes";
import type {
  RowChangeProps,
  RowChangesToSave,
  RowChangeUpdateProps,
} from "./Types/RawState";

export class RowRaw extends RowRawBase {
  get schema() {
    return new SchemaBase();
  }
  get sheet() {
    return new SheetRaw(this.sheetRawProps);
  }
  cellTrait<VN extends CellValueName, K extends ValueSchemaKey>(
    valueName: VN,
    key: K,
  ): ValueTrait<VN, K> {
    return getCellValTrait(valueName, key);
  }
  column(colIndex: number): ColumnRaw {
    return new ColumnRaw({
      ...this.sheetRawProps,
      colIndex: colIndex,
    });
  }
  isEmptyCell(colIdx: number): boolean {
    if (!this.cellIsActive(colIdx)) {
      throw new Error(
        `Row ${this.rowIndex} does not have a value set for column index ${colIdx}.`,
      );
    }
    const value = this.rowState.get(colIdx);
    return value === "" || value === null || value === undefined;
  }
  cellIsActive(colIdx: number): boolean {
    return this.rowState.has(colIdx);
  }

  value(colIdx: number, valueNameAssert?: CellValueName): CellValue {
    if (!this.cellIsActive(colIdx)) {
      throw new Error(
        `Row ${this.rowIndex} does not have a value set for column index ${colIdx}.`,
      );
    }
    const value = this.rowState.get(colIdx);
    if (valueNameAssert) {
      this.cellTrait(valueNameAssert, "strictValidate")(value);
    }
    return this.rowState.get(colIdx);
  }
  ensureStateExists() {
    if (!this.rowIsActive()) {
      this.sheet.rowStates.set(this.rowIndex, new Map());
    }
  }
  setValueState(colIdx: number, value: CellValue): void {
    this.ensureStateExists();
    this.rowState.set(colIdx, value);
  }
  updateValue(colIdx: number, value: CellValue): RowRaw {
    this.column(colIdx).validateIndexNotStale();
    this.setValueState(colIdx, value);
    return this.addRowChangeToSave({ action: "update", colIdxes: [colIdx] });
  }
  integrateState(colIdx: number, cellValue: GoogleCellValue | undefined): void {
    const value = this._extractFromSheetValue(cellValue);
    this.setValueState(colIdx, value);
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
      return effectiveValue.stringValue;
    } else if ("boolValue" in effectiveValue) {
      return effectiveValue.boolValue;
    } else if ("numberValue" in effectiveValue) {
      return effectiveValue.numberValue;
    } else {
      return "";
    }
  }
  private _valueForSheet(colIndex: number): UserEnteredValue {
    const value = this.value(colIndex);
    if (typeof value === "string") {
      return { stringValue: value };
    } else if (typeof value === "number") {
      return { numberValue: value };
    } else if (typeof value === "boolean") {
      return { boolValue: value };
    } else {
      throw new Error(
        `Cannot make user entered value for unsupported type "${typeof value}".`,
      );
    }
  }
  delete(): void {
    this.remove();
    this.addRowChangeToSave({ action: "delete" });
  }
  append(): RowRaw {
    if (this.rowIsActive()) {
      throw new Error(
        `Cannot append row ${this.rowIndex} because it is already active.`,
      );
    }
    this.sheetState.rowStates[this.rowIndex] = new Map();
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
    return this.sheetSchema.makeId(this.sheetGid, this.rowIndex);
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
  addRowChangeToSave(props: RowChangeProps): RowRaw {
    const changes = this.changesToSave;
    if (changes.delete) return;
    const actions = {
      append: (_: RowChangeProps) => (changes.append = true),
      delete: (_: RowChangeProps) => (changes.delete = this.deleteRequest),
      update: (props: RowChangeProps) => {
        for (const colIdx of (props as RowChangeUpdateProps).colIdxes) {
          changes.update.add(colIdx);
        }
      },
    };
    actions[props.action](props);
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
  gatherUpdateRequest(colIdx: number): void {
    this.updateRequests.update.push({
      updateCells: {
        range: {
          sheetId: this.sheetGid,
          startRowIndex: this.rowIndex,
          endRowIndex: this.rowIndex + 1,
          startColumnIndex: colIdx,
          endColumnIndex: colIdx + 1,
        },
        rows: [{ values: [{ userEnteredValue: this._valueForSheet(colIdx) }] }],
        fields: "userEnteredValue",
      },
    });
  }
}
