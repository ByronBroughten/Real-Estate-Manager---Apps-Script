import type {
  ColumnName,
  ColumnValue,
} from "../01_generatedConfigs/columnConfigsTypes";
import type { SheetName } from "../01_generatedConfigs/sheetConfigsTypes";
import { DataColumnIndexed } from "../03_SpreadsheetIndexed/DataColumnIndexed";
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
  get indexed(): DataColumnIndexed {
    return this.sheet.indexed.column(this.columnId).data;
  }
  get raw() {
    return this.indexed.raw;
  }
  get valueArr(): ColumnValue<SN, CN>[] {
    return this.indexed.valueArr as ColumnValue<SN, CN>[];
  }
  get valueArrFilterEmpty(): StrictExclude<ColumnValue<SN, CN>, "">[] {
    return this.indexed.valueArrFilterEmpty as StrictExclude<
      ColumnValue<SN, CN>,
      ""
    >[];
  }
  get valueValidationStrings(): string[] {
    return this.indexed.valueValidationStrings;
  }
  get valueArrNotEmpty(): StrictExclude<ColumnValue<SN, CN>, "">[] {
    return this.indexed.valueArrNotEmpty as StrictExclude<
      ColumnValue<SN, CN>,
      ""
    >[];
  }
  hasValue(value: ColumnValue<SN, CN>): boolean {
    return this.valueArr.includes(value);
  }
  valueNotEmpty(rowIndex: number): StrictExclude<ColumnValue<SN, CN>, ""> {
    return this.indexed.valueNotEmpty(rowIndex) as StrictExclude<
      ColumnValue<SN, CN>,
      ""
    >;
  }
  topCell(): CellNamed<SN, CN> {
    return this.cell(this.baseSchema.topDataRowIdx);
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
