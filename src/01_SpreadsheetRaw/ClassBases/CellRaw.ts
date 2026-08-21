import type { UserEnteredValue } from "../../00_base/AppsScriptTypes";
import type { CellValue, CellValueName } from "../../00_base/base";
import type { CellValueTrait } from "../../00_base/baseValueSchemas";
import { getCellValTrait } from "../../00_base/baseValueSchemas";
import type { ValueSchemaKey } from "../../00_base/valueSchema";
import { SheetRaw } from "../SheetRaw";
import { CellRawBase } from "./CellRawBase";

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
  isEmptyCell(): boolean {
    if (!this.isActive) {
      throw new Error(
        `Row ${this.rowIndex} does not have a value set for column index ${this.colIndex}.`,
      );
    }
    const value = this.rowState.get(this.colIndex);
    return value === "" || value === null || value === undefined;
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
      const test = this.trait(this.valueName, "strictValidate")(value);
      return test as CellValue<VN>;
    } else {
      return value as CellValue<VN>;
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
