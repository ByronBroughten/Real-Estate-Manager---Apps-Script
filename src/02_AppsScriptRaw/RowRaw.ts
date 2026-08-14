import type {
  CellValue,
  CellValueName,
} from "../00_configPrecursors/configPrecursors";
import { SchemaBase } from "../01_SchemaIndexed/SchemaBase";
import {
  getCellValTrait,
  type CellValueTrait,
} from "../02_Schemas/03_baseValueSchemas";
import { type ValueSchemaKey } from "../02_Schemas/03_valueSchema";
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
  ): CellValueTrait<VN, K> {
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

  value<VN extends CellValueName>(
    colIdx: number,
    valueNameAssert?: VN,
  ): CellValue<VN> {
    if (!this.cellIsActive(colIdx)) {
      throw new Error(
        `Row ${this.rowIndex} does not have a value set for column index ${colIdx}.`,
      );
    }
    const value = this.rowState.get(colIdx);
    if (valueNameAssert) {
      return this.cellTrait(valueNameAssert, "strictValidate")(value);
    } else {
      return value as CellValue<VN>;
    }
  }
  hasValue(value: unknown): boolean {
    return this.activeValueArr.includes(value as CellValue);
  }
  setValueState(colIdx: number, value: CellValue): void {
    if (!this.rowIsActive()) {
      throw new Error(
        `Cannot set value for row ${this.rowIndex} because it is not active.`,
      );
    }
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
