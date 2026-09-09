import type { UniformRowName, UniformRowValueName } from "../00_base/base";
import type { ValueName, VnToCvn } from "../01_generatedConfigs/valueSchemas";
import { ColumnMetaRaw } from "../02_SpreadsheetRaw/ColumnMetaRaw";
import { CellIndexed } from "./CellIndexed";
import { ColumnCommonIndexed } from "./ColumnCommonIndexed";
import { ColumnIndexed } from "./ColumnIndexed";
import { SheetMetaIndexed } from "./SheetMetaIndexed";

export class ColumnMetaIndexed<
  VN extends ValueName = ValueName,
> extends ColumnCommonIndexed<VN> {
  get raw(): ColumnMetaRaw<VnToCvn<VN>> {
    return new ColumnMetaRaw({
      ...this.sheetIndexedProps,
      colIndex: this.colIndex,
    });
  }
  get sheet(): SheetMetaIndexed {
    return new SheetMetaIndexed(this.sheetIndexedProps);
  }
  get primary(): ColumnIndexed<VN> {
    return new ColumnIndexed(this.columnIndexedProps);
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
