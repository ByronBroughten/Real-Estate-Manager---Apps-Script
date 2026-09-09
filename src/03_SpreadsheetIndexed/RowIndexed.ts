import type { CellValue } from "../00_base/base";
import { type Value } from "../01_generatedConfigs/valueSchemas";
import { RowRaw } from "../02_SpreadsheetRaw/RowRaw";
import { CellIndexed } from "./CellIndexed";
import { RowCommonIndexed } from "./RowCommonIndexed";
import type { RowIndexedProps } from "./RowIndexedBase";
import { SheetIndexed } from "./SheetIndexed";

export class RowIndexed extends RowCommonIndexed {
  constructor(props: RowIndexedProps) {
    super(props);
    void this.raw;
  }
  get sheet(): SheetIndexed {
    return new SheetIndexed(this.sheetIndexedProps);
  }
  get raw(): RowRaw {
    return new RowRaw(this.rowIndexedProps);
  }
  get activeValueArr(): CellValue[] {
    return this.raw.activeValueArr;
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
  updateToDefault(...columnIds: string[]): RowIndexed {
    columnIds.forEach((columnId) => this.cell(columnId).updateToDefault());
    return this;
  }
  get activeColumnIds(): string[] {
    return [...this.raw.rowState.keys()].map((colIndex) =>
      this.sheet.meta.columnIdByIndex(colIndex),
    );
  }
  delete(): void {
    this.raw.delete();
  }
}
