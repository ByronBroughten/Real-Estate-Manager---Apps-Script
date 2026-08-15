import type {
  GoogleCellValue,
  GoogleUpdateRequest,
  UserEnteredValue,
} from "../00_base/AppsScriptTypes";
import type { CellValue, CellValueName } from "../00_base/base";
import {
  getCellValTrait,
  type CellValueTrait,
} from "../00_base/baseValueSchemas";
import { type ValueSchemaKey } from "../00_base/valueSchema";
import { SchemaBase } from "../03_SpreadsheetIndexed/SchemaBase";
import { RowRawBase } from "./ClassBases/RowRawBase";
import type {
  RowChangeProps,
  RowChangesToSave,
  RowChangeUpdateProps,
} from "./ClassTypes/RawState";
import { ColumnRaw } from "./ColumnRaw";
import { SheetRaw } from "./SheetRaw";

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
  ): CellValueTrait<VN, K> {
    return getCellValTrait(valueName, key);
  }
  column(colIndex: number): ColumnRaw {
    return new ColumnRaw({
      ...this.sheetRawProps,
      colIndex: colIndex,
    });
  }
  isEmptyCell(colIndex: number): boolean {
    if (!this.cellIsActive(colIndex)) {
      throw new Error(
        `Row ${this.rowIndex} does not have a value set for column index ${colIndex}.`,
      );
    }
    const value = this.rowState.get(colIndex);
    return value === "" || value === null || value === undefined;
  }
  cellIsActive(colIndex: number): boolean {
    return this.rowState.has(colIndex);
  }

  value<VN extends CellValueName>(
    colIndex: number,
    valueNameAssert?: VN,
  ): CellValue<VN> {
    if (!this.cellIsActive(colIndex)) {
      throw new Error(
        `Row ${this.rowIndex} does not have a value set for column index ${colIndex}.`,
      );
    }
    const value = this.rowState.get(colIndex);
    if (valueNameAssert) {
      return this.cellTrait(valueNameAssert, "strictValidate")(value);
    } else {
      return value as CellValue<VN>;
    }
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
  updateValue(colIndex: number, value: CellValue): RowRaw {
    this.column(colIndex).validateIndexNotStale();
    this.setValueState(colIndex, value);
    return this.addRowChangeToSave({ action: "update", colIdxes: [colIndex] });
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
        for (const colIndex of (props as RowChangeUpdateProps).colIdxes) {
          changes.update.add(colIndex);
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
  gatherUpdateRequest(colIndex: number): void {
    this.updateRequests.update.push({
      updateCells: {
        range: {
          sheetId: this.sheetGid,
          startRowIndex: this.rowIndex,
          endRowIndex: this.rowIndex + 1,
          startColumnIndex: colIndex,
          endColumnIndex: colIndex + 1,
        },
        rows: [
          { values: [{ userEnteredValue: this._valueForSheet(colIndex) }] },
        ],
        fields: "userEnteredValue",
      },
    });
  }
}
