import { DataRowRaw } from "../01_SpreadsheetRaw/ClassBases/DataRowRaw";
import { RowCommon } from "../01_SpreadsheetRaw/ClassBases/RowCommon";
import type { RowRawProps } from "../01_SpreadsheetRaw/ClassBases/RowRawBase";
import { type Value } from "../02_generatedTraits/06_valueSchemas";
import { ColumnSchemaIndexed } from "./ColumnSchemaIndexed";
import { SheetIndexed } from "./SheetIndexed";

export class DataRowIndexed extends RowCommon {
  constructor(props: RowRawProps) {
    super(props);
    void this.raw;
  }
  get raw(): DataRowRaw {
    return new DataRowRaw(this.rowRawProps);
  }
  get sheet(): SheetIndexed {
    return new SheetIndexed(this.sheetRawProps);
  }
  columnSchema(colIndex: number): ColumnSchemaIndexed {
    return new ColumnSchemaIndexed({
      sheetGid: this.sheetGid,
      colIndex,
    });
  }
  updateValue(colIndex: number, value: Value): this {
    this.columnSchema(colIndex).validateDataNotFormula();
    this.raw.updateValue(colIndex, value);
    return this;
  }
  updateCellToDefault(colIndex: number): DataRowIndexed {
    if (!this.columnSchema(colIndex).isFormula) {
      const defaultValue = this.columnSchema(colIndex).makeDefaultDataValue();
      this.updateValue(colIndex, defaultValue);
    }
    return this;
  }
  updateToDefault(...colIndexes: number[]): DataRowIndexed {
    colIndexes.forEach((colIndex) => this.updateCellToDefault(colIndex));
    return this;
  }
}
