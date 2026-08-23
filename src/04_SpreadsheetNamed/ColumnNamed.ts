import type { UniformRowName } from "../00_base/base";
import type {
  ColumnFullName,
  ColumnName,
  ColumnValue,
} from "../01_generatedConfigs/columnConfigsTypes";
import type { SheetName } from "../01_generatedConfigs/sheetConfigsTypes";
import type { StrictExclude } from "../utils/Arr";

import { CellNamed } from "./CellNamed";
import { ColumnNamedBase } from "./ClassBases/ColumnNamedBase";
import { SheetNamed } from "./SheetNamed";

export class ColumnNamed<
  SN extends SheetName,
  CN extends ColumnName<SN> = ColumnName<SN>,
> extends ColumnNamedBase<SN, CN> {
  get columnId(): string {
    return this.sheet.schema.column(this.columnName).columnId;
  }
  get sheet(): SheetNamed<SN> {
    return new SheetNamed(this.sheetNamedProps);
  }
  get raw() {
    return this.sheet.raw.column(this.indexed.colIndex);
  }
  get indexed() {
    return this.sheet.indexed.column(this.columnId);
  }
  get colIndex() {
    return this.indexed.colIndex;
  }

  get schema() {
    return this.sheet.schema.column(this.columnName);
  }
  get fullName(): ColumnFullName<SN, CN> {
    return this.schema.fullName;
  }
  get dataValueArr(): ColumnValue<SN, CN>[] {
    return this.indexed.dataValueArr as ColumnValue<SN, CN>[];
  }
  hasDataValue(value: ColumnValue<SN, CN>): boolean {
    return this.dataValueArr.includes(value);
  }
  dataValueNotEmpty(rowIndex: number): StrictExclude<ColumnValue<SN, CN>, ""> {
    return this.indexed.dataValueNotEmpty(rowIndex) as StrictExclude<
      ColumnValue<SN, CN>,
      ""
    >;
  }
  dataValue(rowIndex: number): ColumnValue<SN, CN> {
    return this.dataCell(rowIndex).value();
  }

  dataCell(rowIndex: number): CellNamed<SN, CN> {
    return new CellNamed({
      ...this.columnNamedProps,
      rowIndex,
    });
  }
  gatherFetchUniformCell(rowName: UniformRowName): ColumnNamed<SN, CN> {
    const rowIndex = this.sheet.schema.uniformRowIndex(rowName);
    this.indexed.dataCell(rowIndex).prepFetch();
    return this;
  }
  prepFetchDataFull(): ColumnNamed<SN, CN> {
    this.indexed.prepFetchDataFull();
    return this;
  }
  activeDataCellsToDefault(): ColumnNamed<SN, CN> {
    this.indexed.activeDataCellsToDefault();
    return this;
  }
  emptyDataCellsToDefault(): ColumnNamed<SN, CN> {
    this.indexed.emptyDataCellsToDefault();
    return this;
  }
  actionRowToDefault(): ColumnNamed<SN, CN> {
    this.sheet.indexed.uniformRow("action").updateValue(this.colIndex, false);
    return this;
  }
}
