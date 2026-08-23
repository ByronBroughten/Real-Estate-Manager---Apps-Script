import { DataRowRaw } from "../02_SpreadsheetRaw/ClassBases/DataRowRaw";
import { type Value } from "../01_generatedConfigs/valueSchemas";
import { CellIndexed } from "./CellIndexed";
import { ColumnSchemaIndexed } from "./ColumnSchemaIndexed";
import type { RowIndexedProps } from "./RowIndexedBase";
import { RowCommonIndexed } from "./RowCommonIndexed";

export class DataRowIndexed extends RowCommonIndexed {
  constructor(props: RowIndexedProps) {
    super(props);
    void this.raw;
  }
  get raw(): DataRowRaw {
    return new DataRowRaw(this.rowIndexedProps);
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
  get activeColumnIds(): string[] {
    return [...this.raw.rowState.keys()].map((colIndex) =>
      this.sheet.columnIdByIndex(colIndex),
    );
  }
  delete(): void {
    this.raw.delete();
  }
}
