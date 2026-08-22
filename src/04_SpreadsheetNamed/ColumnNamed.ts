import type { UniformRowName } from "../00_base/base";
import type { SheetName } from "../02_generatedTraits/02_sheetTraitsTypes";
import type {
  ColumnFullName,
  ColumnName,
} from "../02_generatedTraits/03_columnTraits";

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
  gatherFetchUniformCell(rowName: UniformRowName): ColumnNamed<SN, CN> {
    this.raw.uniformCell(rowName).gatherFetchRange();
    return this;
  }
  gatherFetchAllDataCells(): ColumnNamed<SN, CN> {
    this.raw.data.gatherFetchAll();
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
