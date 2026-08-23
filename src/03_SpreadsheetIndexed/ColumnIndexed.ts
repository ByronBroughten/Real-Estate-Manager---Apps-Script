import type {
  Value,
  ValueName,
  VnToCvn,
} from "../01_generatedConfigs/valueSchemas";
import { ColumnRaw } from "../02_SpreadsheetRaw/ColumnRaw";
import type { StrictExclude } from "../utils/Arr";
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
  prepFetchAllDataCells(): this {
    this.prepFetchDataFull();
    return this;
  }
  prepFetchDataFull(): this {
    this.sheetState.idsOfFullDataColsToFetch.add(this.columnId);
    this.preFetchGridRanges.push({ row: "allDataRows", column: this.columnId });
    return this;
  }
  get activeDataCellIndexes(): number[] {
    return this.raw.sheet.activeDataRowIndexes;
  }
  dataValue(rowIndex: number): Value<VN> {
    return this.dataCell(rowIndex).value();
  }
  dataValueNotEmpty(rowIndex: number): StrictExclude<Value<VN>, ""> {
    return this.dataCell(rowIndex).valueNotEmpty();
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
