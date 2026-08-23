import type {
  Value,
  ValueName,
  VnToCvn,
} from "../01_generatedConfigs/valueSchemas";
import { DataColumnRaw } from "../02_SpreadsheetRaw/ClassBases/DataColumnRaw";
import type { StrictExclude } from "../utils/Arr";
import { CellIndexed } from "./CellIndexed";
import { ColumnCommon } from "./ColumnCommon";
import { ColumnIndexed } from "./ColumnIndexed";

export class DataColumnIndexed<
  VN extends ValueName = ValueName,
> extends ColumnCommon<VN> {
  get column(): ColumnIndexed<VN> {
    return new ColumnIndexed(this.columnIndexedProps);
  }
  get raw(): DataColumnRaw<VnToCvn<VN>> {
    return new DataColumnRaw({
      ...this.sheetIndexedProps,
      colIndex: this.colIndex,
    });
  }
  get fullDataCellIndexes(): number[] {
    return this.sheet.fullDataRowIndexes;
  }
  prepFetchDataFull(): this {
    this.sheetState.idsOfFullDataColsToFetch.add(this.columnId);
    this.preFetchGridRanges.push({ row: "allDataRows", column: this.columnId });
    return this;
  }
  get activeDataCellIndexes(): number[] {
    return this.raw.sheet.dataRowIndexesActive;
  }
  get valueArr(): Value<VN>[] {
    return this.raw.valueArr as Value<VN>[];
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
    return this.activeDataCellIndexes.map((rowIndex) => this.cell(rowIndex));
  }
  cellsToDefault() {
    this.activeDataCells.forEach((cell) => {
      cell.updateToDefault();
    });
  }
  ensureFullActiveDataCells() {
    this.fullDataCellIndexes.forEach((rowIndex) => {
      this.cell(rowIndex).raw.ensureActive();
    });
  }
  emptyDataCellsToDefault() {
    this.activeDataCellIndexes.forEach((rowIndex) => {
      const cell = this.cell(rowIndex);
      if (cell.raw.isEmpty) {
        cell.updateToDefault();
      }
    });
  }
}
