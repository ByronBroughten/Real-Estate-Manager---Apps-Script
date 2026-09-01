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
import { DataSheetIndexed } from "./DataSheetIndexed";

export class DataColumnIndexed<
  VN extends ValueName = ValueName,
> extends ColumnCommonIndexed<VN> {
  get sheet(): DataSheetIndexed {
    return new DataSheetIndexed(this.sheetIndexedProps);
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
  get cellIndexesActive(): number[] {
    return this.raw.cellIndexesActive;
  }
  get cellIndexesFull(): number[] {
    return this.raw.cellIndexesFull;
  }
  get cellsFull(): CellIndexed<VN>[] {
    return this.cellIndexesFull.map((rowIndex) => this.cell(rowIndex));
  }
  prepFetchFull(): this {
    this.preFetchGridRanges.push({ row: "allDataRows", column: this.columnId });
    return this;
  }
  get valueArr(): Value<VN>[] {
    return this.raw.valueArr as Value<VN>[];
  }
  get valueArrFilterEmpty(): Value<VN>[] {
    return this.raw.valueArrFilterEmpty as Value<VN>[];
  }
  get valueValidationStrings(): string[] {
    return this.raw.valueValidationStrings;
  }
  get valueArrNotEmpty(): Value<VN>[] {
    return this.sheet.rowIndexesActive.map((rowIndex) =>
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
  allCellsToValue(value: Value<VN>): this {
    this.cellsFull.forEach((cell) => {
      cell.updateValue(value);
    });
    return this;
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
