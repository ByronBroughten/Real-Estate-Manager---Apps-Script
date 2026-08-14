import type { ValueSchemaKey } from "../00_rawPrecursors/valueSchema";
import { RowRawBase } from "../01_SpreadsheetRaw/ClassBases/RowRawBase";
import { RowRaw } from "../01_SpreadsheetRaw/RowRaw";
import {
  getValTrait,
  type Value,
  type ValueName,
  type ValueTrait,
} from "../02_generatedTraits/042_valueSchemas";
import { ColumnIndexed } from "./ColumnIndexed";
import { SheetIndexed } from "./SheetIndexed";

export class DataRowIndexed extends RowRawBase {
  constructor(props) {
    super(props);
    this.validateIsDataRow();
  }
  updateValue(colIndex: number, value: Value): DataRowIndexed {
    this.column(colIndex).schema.validateDataNotFormula();
    this.raw.updateValue(colIndex, value);
    return this;
  }
  updateCellToDefault(colIndex: number): DataRowIndexed {
    const defaultValue = this.column(colIndex).schema.makeDefaultDataValue();
    this.updateValue(colIndex, defaultValue);
    return this;
  }
  updateToDefault(...colIndexes: number[]): DataRowIndexed {
    if (colIndexes.length === 0) {
      this._validateHasActiveNonFormulaColumns();
      colIndexes = this.activeColIdxsNotFormula;
    }
    colIndexes.forEach((colIndex) => this.updateCellToDefault(colIndex));
    return this;
  }
  validateIsDataRow(): void {
    if (!this.raw.isDataRow) {
      throw new Error(
        `Row ${this.rowIndex} is not a data row. Cannot perform this operation.`,
      );
    }
  }
  get raw(): RowRaw {
    return new RowRaw(this.rowRawProps);
  }
  get sheet(): SheetIndexed {
    return new SheetIndexed(this.sheetRawProps);
  }
  column(colIndex: number): ColumnIndexed {
    return new ColumnIndexed({
      ...this.sheetRawProps,
      colIndex,
    });
  }
  get activeColIdxsNotFormula(): number[] {
    return this.activeColIdxs.filter(
      (colIndex) => !this.column(colIndex).schema.isFormula,
    );
  }
  valTrait<VN extends ValueName, K extends ValueSchemaKey>(
    valueName: VN,
    key: K,
  ): ValueTrait<VN, K> {
    return getValTrait(valueName, key);
  }
  private _validateHasActiveNonFormulaColumns() {
    if (this.activeColIdxsNotFormula.length === 0) {
      throw new Error(
        `Row ${this.rowIndex} has no active non-formula columns. Cannot perform this operation.`,
      );
    }
  }
}
