import type {
  Value,
  ValueName,
  VnToCvn,
} from "../01_generatedConfigs/valueSchemas";
import { DataColumnRaw } from "../02_SpreadsheetRaw/ClassBases/DataColumnRaw";
import type { StrictExclude } from "../utils/Arr";
import { CellIndexed } from "./CellIndexed";
import { ColumnCommonIndexed } from "./ColumnCommonIndexed";
import { ColumnIndexed } from "./ColumnIndexed";
import { SheetIndexed } from "./SheetIndexed";

export class DataColumnIndexed<
  VN extends ValueName = ValueName,
> extends ColumnCommonIndexed<VN> {
  get sheet(): SheetIndexed {
    return new SheetIndexed(this.sheetIndexedProps);
  }
  get column(): ColumnIndexed<VN> {
    return new ColumnIndexed(this.columnIndexedProps);
  }
  get raw(): DataColumnRaw<VnToCvn<VN>> {
    return new DataColumnRaw({
      ...this.sheetIndexedProps,
      colIndex: this.colIndex,
    });
  }
  get activeCellIndexes(): number[] {
    return this.raw.sheet.data.rowIndexesActive;
  }
  get fullCellIndexes(): number[] {
    return this.sheet.data.fullDataRowIndexes;
  }
  prepFetchFull(): this {
    this.sheetState.idsOfFullDataColsToFetch.add(this.columnId);
    this.preFetchGridRanges.push({ row: "allDataRows", column: this.columnId });
    return this;
  }
  get valueArr(): Value<VN>[] {
    return this.raw.valueArr as Value<VN>[];
  }
  get valueArrNotEmpty(): Value<VN>[] {
    return this.sheet.data.rowIndexesActive.map((rowIndex) =>
      this.cell(rowIndex).valueNotEmpty(),
    );
  }
  hasValue(value: Value<VN>): boolean {
    return this.valueArr.includes(value);
  }
  value(rowIndex: number): Value<VN> {
    return this.cell(rowIndex).value();
  }
  valueNotEmpty(rowIndex: number): StrictExclude<Value<VN>, ""> {
    return this.cell(rowIndex).valueNotEmpty();
  }
  cell(rowIndex: number): CellIndexed<VN> {
    return new CellIndexed({
      ...this.columnIndexedProps,
      rowIndex,
    });
  }
  get activeDataCells(): CellIndexed<VN>[] {
    return this.activeCellIndexes.map((rowIndex) => this.cell(rowIndex));
  }
  cellsToDefault() {
    this.activeDataCells.forEach((cell) => {
      cell.updateToDefault();
    });
  }
  ensureFullActiveDataCells() {
    this.fullCellIndexes.forEach((rowIndex) => {
      this.cell(rowIndex).raw.ensureActive();
    });
  }
  emptyDataCellsToDefault() {
    this.activeCellIndexes.forEach((rowIndex) => {
      const cell = this.cell(rowIndex);
      if (cell.raw.isEmpty) {
        cell.updateToDefault();
      }
    });
  }
}
