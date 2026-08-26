import type {
  GoogleCellValue,
  UserEnteredValue,
} from "../../00_base/AppsScriptTypes";
import type { CellValue, CellValueName } from "../../00_base/base";
import type { CellValueTrait } from "../../00_base/baseValueSchemas";
import { getCellValTrait } from "../../00_base/baseValueSchemas";
import type { ValueSchemaKey } from "../../00_base/valueSchema";
import { valS } from "../../utils/validation";
import { SheetRaw } from "../SheetRaw";
import type { UniformRowRaw } from "../UniformRowRaw";
import { CellRawBase } from "./CellRawBase";
import type { DataRowRaw } from "./DataRowRaw";

export class CellRaw<
  VN extends CellValueName = CellValueName,
> extends CellRawBase<VN> {
  private trait<V extends CellValueName, K extends ValueSchemaKey>(
    valueName: V,
    key: K,
  ): CellValueTrait<V, K> {
    return getCellValTrait(valueName, key);
  }
  get sheet(): SheetRaw {
    return new SheetRaw(this.sheetRawProps);
  }
  get row(): DataRowRaw | UniformRowRaw {
    return this.sheet.row(this.rowIndex);
  }
  get gridRange() {
    return {
      sheetId: this.sheetGid,
      startRowIndex: this.rowIndex,
      endRowIndex: this.rowIndex + 1,
      startColumnIndex: this.colIndex,
      endColumnIndex: this.colIndex + 1,
    };
  }
  gatherFetchRange(): this {
    this.sheet.gatherFetchRange(this.gridRange);
    return this;
  }
  gatherUpdateRequest(): void {
    this.updateRequests.update.push({
      updateCells: {
        range: this.gridRange,
        rows: [
          {
            values: [{ userEnteredValue: this._valueForSheet() }],
          },
        ],
        fields: "userEnteredValue",
      },
    });
  }
  setValueState(value: CellValue): void {
    if (!this.row.rowIsActive()) {
      throw new Error(
        `Cannot set value for row ${this.rowIndex} because it is not active.`,
      );
    }
    this.rowState.set(this.colIndex, value);
  }
  get isEmpty(): boolean {
    if (!this.isActive) {
      throw new Error(
        `Row ${this.rowIndex} does not have a value set for column index ${this.colIndex}.`,
      );
    }
    const value = this.rowState.get(this.colIndex);
    return value === "";
  }
  get isActive(): boolean {
    return this.rowState.has(this.colIndex);
  }
  ensureActive() {
    if (!this.isActive) {
      this.setValueState("");
    }
  }
  value(): CellValue<VN> {
    if (!this.isActive) {
      throw new Error(
        `Row ${this.rowIndex} does not have a value set for column index ${this.colIndex}.`,
      );
    }
    const value = this.rowState.get(this.colIndex);
    const valueName = this.valueName;
    if (valueName) {
      const test = this.trait(valueName, "strictValidate")(value);
      return test as CellValue<VN>;
    } else {
      return value as CellValue<VN>;
    }
  }
  updateValue(value: CellValue<VN>): this {
    this.validateIndexNotStale();
    this.setValueState(value);
    this.row.addRowChangeToSave({
      action: "update",
      colIdxes: [this.colIndex],
    });
    return this;
  }
  integrateGState(cellValue: GoogleCellValue | undefined): void {
    const value = this._extractFromSheetValue(cellValue);
    this.setValueState(value);
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
  _valueForSheet(): UserEnteredValue {
    const value = this.value();
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
}
