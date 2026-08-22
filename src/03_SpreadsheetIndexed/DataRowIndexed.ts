import { DataRowRaw } from "../01_SpreadsheetRaw/ClassBases/DataRowRaw";
import { type Value } from "../02_generatedTraits/06_valueSchemas";
import { CellIndexed } from "./CellIndexed";
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
  updateValue(columnId: string, value: Value): this {
    this.cell(columnId).updateValue(value);
    return this;
  }
  cell(columnId: string) {
    return new CellIndexed({
      ...this.rowIndexedProps,
      columnId,
    });
  }
  updateToDefault(...columnIds: string[]): DataRowIndexed {
    columnIds.forEach((columnId) => this.cell(columnId).updateToDefault());
    return this;
  }
}
