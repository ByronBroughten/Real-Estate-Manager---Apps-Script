import type {
  ColumnName,
  ColumnValue,
  ColumnValueName,
} from "../01_generatedConfigs/columnConfigsTypes";
import type { SheetName } from "../01_generatedConfigs/sheetConfigsTypes";
import type { DataColumnIndexed } from "../03_SpreadsheetIndexed/DataColumnIndexed";
import type { StrictExclude } from "../utils/Arr";
import { CellNamed } from "./CellNamed";
import { ColumnCommonNamed } from "./ColumnCommonNamed";
import { ColumnNamed } from "./ColumnNamed";

export class DataColumnNamed<
  SN extends SheetName,
  CN extends ColumnName<SN> = ColumnName<SN>,
> extends ColumnCommonNamed<SN, CN> {
  get column(): ColumnNamed<SN, CN> {
    return new ColumnNamed(this.columnNamedProps);
  }
  get indexed(): DataColumnIndexed<ColumnValueName<SN, CN>> {
    return this.column.indexed.data;
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
  get valueValidationStrings(): string[] {
    return this.indexed.valueValidationStrings;
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
  topCell(): CellNamed<SN, CN> {
    return this.cell(this.schema.topDataRowIdx);
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
  allCellsToValue(value: ColumnValue<SN, CN>): this {
    this.indexed.allCellsToValue(value);
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
