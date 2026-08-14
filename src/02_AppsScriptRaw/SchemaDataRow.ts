import type { ValueSchemaKey } from "../2.0 Schemas/3.0 valueSchema";
import {
  getValTrait,
  type Value,
  type ValueName,
  type ValueTrait,
} from "../2.0 Schemas/3.2 valueSchemas";
import { RowRawBase } from "./ClassBases/RowRawBase";
import { RowRaw } from "./RowRaw";
import { SchemaColumn } from "./SchemaColumn";
import { SchemaSheetRaw } from "./SchemaSheetRaw";

export class SchemaDataRow extends RowRawBase {
  constructor(props) {
    super(props);
    this.validateIsDataRow();
  }
  updateValue(colIdx: number, value: Value): SchemaDataRow {
    this.column(colIdx).schema.validateDataNotFormula();
    this.raw.updateValue(colIdx, value);
    return this;
  }
  updateCellToDefault(colIndex: number): SchemaDataRow {
    const defaultValue = this.column(colIndex).schema.makeDefaultDataValue();
    this.updateValue(colIndex, defaultValue);
    return this;
  }
  updateToDefault(...colIndexes: number[]): SchemaDataRow {
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
  get sheet(): SchemaSheetRaw {
    return new SchemaSheetRaw(this.sheetRawProps);
  }
  column(colIndex: number): SchemaColumn {
    return new SchemaColumn({
      ...this.sheetRawProps,
      colIndex,
    });
  }
  get activeColIdxsNotFormula(): number[] {
    return this.activeColIdxs.filter(
      (colIdx) => !this.column(colIdx).schema.isFormula,
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
