import type { NotEmpty } from "../00_base/base";
import type {
  ColumnName,
  ColumnValue,
  ColumnValueDeclared,
  ColumnValueName,
} from "../01_generatedConfigs/columnConfigsTypes";
import type { SheetName } from "../01_generatedConfigs/sheetConfigsTypes";
import type { CellChange } from "../03_SpreadsheetIndexed/ClassTypes/IndexedState";
import { ColumnIndexed } from "../03_SpreadsheetIndexed/ColumnIndexed";
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
  get valueArrOrEmpty(): ColumnValue<SN, CN>[] {
    return this.indexed.valueArrOrEmpty;
  }
  get valueArrFilterEmpty(): NotEmpty<ColumnValue<SN, CN>>[] {
    return this.indexed.valueArrFilterEmpty;
  }
  // Not delegated to Indexed, so a blank throws with the Named message.
  get valueArrNotEmpty(): NotEmpty<ColumnValue<SN, CN>>[] {
    return this.rowIndexesActive.map((rowIndex) =>
      this.valueNotEmpty(rowIndex),
    );
  }
  get valueArr(): ColumnValueDeclared<SN, CN>[] {
    return this.rowIndexesActive.map((rowIndex) => this.value(rowIndex));
  }
  hasValue(value: ColumnValue<SN, CN>): boolean {
    return this.valueArrOrEmpty.includes(value);
  }
  valueOrEmpty(rowIndex: number): ColumnValue<SN, CN> {
    return this.cell(rowIndex).valueOrEmpty();
  }
  valueNotEmpty(rowIndex: number): NotEmpty<ColumnValue<SN, CN>> {
    return this.cell(rowIndex).valueNotEmpty();
  }
  value(rowIndex: number): ColumnValueDeclared<SN, CN> {
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
