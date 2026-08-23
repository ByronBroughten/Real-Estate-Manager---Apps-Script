import type { ValueName, VnToCvn } from "../01_generatedConfigs/valueSchemas";
import { ColumnRaw } from "../02_SpreadsheetRaw/ColumnRaw";
import { ColumnCommon } from "./ColumnCommon";
import { ColumnSchemaIndexed } from "./ColumnSchemaIndexed";
import { DataColumnIndexed } from "./DataColumnIndexed";

export class ColumnIndexed<
  VN extends ValueName = ValueName,
> extends ColumnCommon<VN> {
  get schema(): ColumnSchemaIndexed {
    return new ColumnSchemaIndexed(this.columnIndexedProps);
  }
  get raw(): ColumnRaw<VnToCvn<VN>> {
    return new ColumnRaw({
      ...this.sheetIndexedProps,
      colIndex: this.colIndex,
    });
  }
  get data(): DataColumnIndexed<VN> {
    return new DataColumnIndexed(this.columnIndexedProps);
  }
}
