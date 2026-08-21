import { DataRowRaw } from "../01_SpreadsheetRaw/ClassBases/DataRowRaw";
import { type Value } from "../02_generatedTraits/06_valueSchemas";
import { ColumnSchemaIndexed } from "./ColumnSchemaIndexed";
import type { RowIndexedProps } from "./RowIndexedBase";
import { RowIndexedBase } from "./RowIndexedBase";
import { SheetIndexed } from "./SheetIndexed";

export class DataRowIndexed extends RowIndexedBase {
  constructor(props: RowIndexedProps) {
    super(props);
    void this.raw;
  }
  get raw(): DataRowRaw {
    return new DataRowRaw(this.rowIndexedProps);
  }
  get sheet(): SheetIndexed {
    return new SheetIndexed(this.sheetIndexedProps);
  }
  columnSchema(columnId: string): ColumnSchemaIndexed {
    return new ColumnSchemaIndexed({
      sheetGid: this.sheetGid,
      columnId,
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
