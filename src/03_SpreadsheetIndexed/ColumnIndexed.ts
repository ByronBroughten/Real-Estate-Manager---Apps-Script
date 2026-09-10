import type { NotEmpty } from "../00_base/base";
import {
  toWireValue,
  type Value,
  type ValueName,
  type VnToCvn,
} from "../01_generatedConfigs/valueSchemas";
import type { RowCellChange } from "../02_SpreadsheetRaw/ClassTypes/RawState";
import { ColumnRaw } from "../02_SpreadsheetRaw/ColumnRaw";
import { CellIndexed } from "./CellIndexed";
import type { CellChange } from "./ClassTypes/IndexedState";
import { ColumnCommonIndexed } from "./ColumnCommonIndexed";
import { ColumnMetaIndexed } from "./ColumnMetaIndexed";
import { SheetIndexed } from "./SheetIndexed";

export class ColumnIndexed<
  VN extends ValueName = ValueName,
> extends ColumnCommonIndexed<VN> {
  get sheet(): SheetIndexed {
    return new SheetIndexed(this.sheetIndexedProps);
  }
  get meta(): ColumnMetaIndexed<VN> {
    return new ColumnMetaIndexed(this.columnIndexedProps);
  }
  get raw(): ColumnRaw<VnToCvn<VN>> {
    return new ColumnRaw({
      ...this.sheetIndexedProps,
      colIndex: this.colIndex,
    });
  }
  get cellIndexesActive(): number[] {
    return this.raw.cellIndexesActive;
  }
  get cellIndexesFull(): number[] {
    return this.raw.cellIndexesFull;
  }
  get cellsFull(): CellIndexed<VN>[] {
    return this.cellIndexesFull.map((rowIndex) => this.cell(rowIndex));
  }
  prepFetchSpecific(rowIndexes: number[]): this {
    rowIndexes.forEach((rowIndex) => {
      this.cell(rowIndex).prepFetch();
    });
    return this;
  }
  prepFetchActive(): this {
    return this.prepFetchSpecific(this.cellIndexesActive);
  }
  prepFetchFull(): this {
    this.preFetchGridRanges.push({ row: "allDataRows", column: this.columnId });
    return this;
  }
  // Through the cells, not straight to Raw, so the value name's blank is read here too.
  get valueArrOrEmpty(): Value<VN>[] {
    return this.sheet.rowIndexesActive.map((rowIndex) =>
      this.valueOrEmpty(rowIndex),
    );
  }
  get valueArrFilterEmpty(): NotEmpty<Value<VN>>[] {
    return this.valueArrOrEmpty.filter(
      (value): value is NotEmpty<Value<VN>> => value !== "",
    );
  }
  get valueArrNotEmpty(): NotEmpty<Value<VN>>[] {
    return this.sheet.rowIndexesActive.map((rowIndex) =>
      this.cell(rowIndex).valueNotEmpty(),
    );
  }
  hasValue(value: Value<VN>): boolean {
    return this.valueArrOrEmpty.includes(value);
  }
  valueOrEmpty(rowIndex: number): Value<VN> {
    return this.cell(rowIndex).valueOrEmpty();
  }
  valueNotEmpty(rowIndex: number): NotEmpty<Value<VN>> {
    return this.cell(rowIndex).valueNotEmpty();
  }
  cell(rowIndex: number): CellIndexed<VN> {
    return new CellIndexed({
      ...this.columnIndexedProps,
      rowIndex,
    });
  }
  get cellsActive(): CellIndexed<VN>[] {
    return this.cellIndexesActive.map((rowIndex) => this.cell(rowIndex));
  }
  activeCellsToDefault() {
    this.cellsActive.forEach((cell) => {
      cell.updateToDefault();
    });
  }
  allCellsToDefault() {
    this.cellsFull.forEach((cell) => {
      cell.updateToDefault();
    });
  }
  updateAllCells(change: CellChange<VN>): this {
    this.raw.updateAllCells(this._rawChange(change));
    return this;
  }
  updateActiveCells(change: CellChange<VN>): this {
    this.raw.updateActiveCells(this._rawChange(change));
    return this;
  }
  // A colour-only write is legitimate on a formula column; a value is not.
  private _rawChange({
    value,
    ...rest
  }: CellChange<VN>): RowCellChange<VnToCvn<VN>> {
    if (value === undefined) return rest;
    this.schema.validateDataNotFormula();
    return { ...rest, value: toWireValue(value) };
  }
  emptyActiveCellsToDefualt(): this {
    this.cellsActive.forEach((cell) => {
      if (cell.raw.isEmpty) {
        cell.updateToDefault();
      }
    });
    return this;
  }
}
