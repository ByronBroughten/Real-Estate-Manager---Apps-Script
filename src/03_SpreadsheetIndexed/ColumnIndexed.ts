import type { UniformRowName, UniformRowValueName } from "../00_base/base";
import type { ValueName, VnToCvn } from "../01_generatedConfigs/valueSchemas";
import { ColumnRaw } from "../02_SpreadsheetRaw/ColumnRaw";
import { CellIndexed } from "./CellIndexed";
import { ColumnCommonIndexed } from "./ColumnCommonIndexed";
import { DataColumnIndexed } from "./DataColumnIndexed";

export class ColumnIndexed<
  VN extends ValueName = ValueName,
> extends ColumnCommonIndexed<VN> {
  get raw(): ColumnRaw<VnToCvn<VN>> {
    return new ColumnRaw({
      ...this.sheetIndexedProps,
      colIndex: this.colIndex,
    });
  }
  get data(): DataColumnIndexed<VN> {
    return new DataColumnIndexed(this.columnIndexedProps);
  }
  uniformCell<UN extends UniformRowName>(
    rowName: UN,
  ): CellIndexed<UniformRowValueName<UN>> {
    const rowIndex = this.schema.uniformRowIndex(rowName);
    const valueName = this.schema.uniformValueName(rowName);
    return new CellIndexed<UniformRowValueName<UN>>({
      ...this.columnIndexedProps,
      rowIndex,
      valueName,
    });
  }
}
