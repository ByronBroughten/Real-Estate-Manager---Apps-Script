import type { UniformRowName } from "../00_traitPrecursors/base";
import { SheetRawBase } from "../02_AppsScriptRaw/ClassBases/SheetRawBase";
import { SheetRaw } from "../02_AppsScriptRaw/SheetRaw";
import type { UniformRow } from "../02_AppsScriptRaw/UniformRowRaw/UniformRow";
import { ColumnIndexed } from "./ColumnIndexed";
import { DataRowIndexed } from "./DataRowIndexed";
import { SheetSchemaIndexed } from "./SheetSchemaIndexed";

export class SheetIndexed extends SheetRawBase {
  get schema(): SheetSchemaIndexed {
    return new SheetSchemaIndexed(this.sheetGid);
  }
  column(colIndex: number): ColumnIndexed {
    return new ColumnIndexed({
      ...this.sheetRawProps,
      colIndex,
    });
  }
  uniformRow<UN extends UniformRowName>(rowName: UN): UniformRow<UN> {
    return this.raw.uniformRow(rowName);
  }
  get raw(): SheetRaw {
    return new SheetRaw(this.sheetRawProps);
  }
  get topDataRow(): DataRowIndexed {
    return this.dataRow(this.schema.topDataRowIdx);
  }
  dataRow(rowIndex: number): DataRowIndexed {
    return new DataRowIndexed({
      ...this.sheetRawProps,
      rowIndex,
    });
  }
  get dataRows() {
    return this.raw.dataRows.map((row) => this.dataRow(row.rowIndex));
  }
  appendRowDefault(): DataRowIndexed {
    const defaultValues = this.schema.defaultValues(
      this.topDataRow.activeColIdxsNotFormula,
    );
    const { rowIndex } = this.raw.appendDataRowValues(defaultValues);
    return this.dataRow(rowIndex);
  }
}
