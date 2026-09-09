import type {
  ColumnName,
  ColumnValue,
  ColumnValueName,
} from "../01_generatedConfigs/columnConfigsTypes";
import type { SheetName } from "../01_generatedConfigs/sheetConfigsTypes";
import type { CellChange } from "../03_SpreadsheetIndexed/ClassTypes/IndexedState";
import { ColumnIndexed } from "../03_SpreadsheetIndexed/ColumnIndexed";
import type { StrictExclude } from "../utils/Arr";
import { CellNamed } from "./CellNamed";
import { ColumnCommonNamed } from "./ColumnCommonNamed";
import { ColumnMetaNamed } from "./ColumnMetaNamed";
import { SheetNamed } from "./SheetNamed";

export class ColumnNamed<
  SN extends SheetName,
  CN extends ColumnName<SN> = ColumnName<SN>,
> extends ColumnCommonNamed<SN, CN> {
  get sheet(): SheetNamed<SN> {
    return new SheetNamed(this.sheetNamedProps);
  }
  get meta(): ColumnMetaNamed<SN, CN> {
    return new ColumnMetaNamed(this.columnNamedProps);
  }
  get indexed(): ColumnIndexed<ColumnValueName<SN, CN>> {
    return new ColumnIndexed<ColumnValueName<SN, CN>>({
      ...this.sheet.indexed.sheetIndexedProps,
      columnId: this.columnId,
    });
  }
  get raw() {
    return this.indexed.raw;
  }
  get rowIndexesActive(): number[] {
    return this.indexed.cellIndexesActive;
  }
  get valueArr(): ColumnValue<SN, CN>[] {
    return this.indexed.valueArr;
  }
  get valueArrFilterEmpty(): StrictExclude<ColumnValue<SN, CN>, "">[] {
    return this.indexed.valueArrFilterEmpty;
  }
  get valueArrNotEmpty(): StrictExclude<ColumnValue<SN, CN>, "">[] {
    return this.indexed.valueArrNotEmpty;
  }
  hasValue(value: ColumnValue<SN, CN>): boolean {
    return this.valueArr.includes(value);
  }
  valueNotEmpty(rowIndex: number): StrictExclude<ColumnValue<SN, CN>, ""> {
    return this.indexed.valueNotEmpty(rowIndex);
  }
  value(rowIndex: number): ColumnValue<SN, CN> {
    return this.cell(rowIndex).value();
  }
  cell(rowIndex: number): CellNamed<SN, CN> {
    return new CellNamed({
      ...this.columnNamedProps,
      rowIndex,
    });
  }
  updateAllCells(change: CellChange<ColumnValueName<SN, CN>>): this {
    this.indexed.updateAllCells(change);
    return this;
  }
  updateActiveCells(change: CellChange<ColumnValueName<SN, CN>>): this {
    this.indexed.updateActiveCells(change);
    return this;
  }
  prepFetchSpecific(rowIndexes: number[]): this {
    this.indexed.prepFetchSpecific(rowIndexes);
    return this;
  }
  prepFetchActive(): this {
    this.indexed.prepFetchActive();
    return this;
  }
  prepFetchFull(): this {
    this.indexed.prepFetchFull();
    return this;
  }
  activeCellsToDefault(): this {
    this.indexed.activeCellsToDefault();
    return this;
  }
  emptyActiveCellsToDefualt(): this {
    this.indexed.emptyActiveCellsToDefualt();
    return this;
  }
}
