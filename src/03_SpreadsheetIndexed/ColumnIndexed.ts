import { ColumnRaw } from "../01_SpreadsheetRaw/ColumnRaw";
import type { ValueName, VnToCvn } from "../02_generatedTraits/06_valueSchemas";
import { CellIndexed } from "./CellIndexed";
import { ColumnIndexedBase } from "./ColumnIndexedBase";
import { ColumnSchemaIndexed } from "./ColumnSchemaIndexed";
import { SheetIndexed } from "./SheetIndexed";

export class ColumnIndexed<
  VN extends ValueName = ValueName,
> extends ColumnIndexedBase<VN> {
  get schema(): ColumnSchemaIndexed {
    return new ColumnSchemaIndexed(this.columnIndexedProps);
  }
  get sheet(): SheetIndexed {
    return new SheetIndexed(this.sheetIndexedProps);
  }
  get colIndex() {
    return this.sheet.raw.uniformRow("columnId").colIndexOfValue(this.columnId);
  }
  get raw(): ColumnRaw<VnToCvn<VN>> {
    return new ColumnRaw({
      ...this.sheetIndexedProps,
      colIndex: this.colIndex,
    });
  }
  get fullDataCellIndexes(): number[] {
    return this.sheet.fullDataRowIndexes;
  }
  get activeDataCellIndexes(): number[] {
    return this.raw.sheet.activeDataRowIndexes;
  }
  dataCell(rowIndex: number): CellIndexed<VN> {
    return new CellIndexed({
      ...this.columnIndexedProps,
      rowIndex,
    });
  }
  get activeDataCells(): CellIndexed<VN>[] {
    return this.activeDataCellIndexes.map((rowIndex) =>
      this.dataCell(rowIndex),
    );
  }
  activeDataCellsToDefault() {
    this.activeDataCells.forEach((cell) => {
      cell.updateToDefault();
    });
  }
  ensureFullActiveDataCells() {
    this.fullDataCellIndexes.forEach((rowIndex) => {
      this.dataCell(rowIndex).raw.ensureActive();
    });
  }
  emptyDataCellsToDefault() {
    this.activeDataCellIndexes.forEach((rowIndex) => {
      const cell = this.dataCell(rowIndex);
      if (cell.raw.isEmpty) {
        cell.updateToDefault();
      }
    });
  }
}
