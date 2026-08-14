import type {
  UniformRowName,
  UniformRowValueName,
} from "../1.0 Configs/0.0 ConfigPrecursors";
import { SheetSchemaRaw } from "../1.1 SpreadsheetSchemaRaw/SheetSchemaRaw";
import { SheetRawBase } from "./ClassBases/SheetRawBase";
import { SchemaColumn } from "./SchemaColumn";
import { SchemaDataRow } from "./SchemaDataRow";
import { SheetRaw } from "./SheetRaw";
import type { UniformRow } from "./UniformRowRaw/UniformRow";

export class SchemaSheetRaw extends SheetRawBase {
  get schema(): SheetSchemaRaw {
    return new SheetSchemaRaw(this.sheetGid);
  }
  column(colIndex: number): SchemaColumn {
    return new SchemaColumn({
      ...this.sheetRawProps,
      colIndex,
    });
  }
  uniformRow<UN extends UniformRowName>(
    rowName: UN,
  ): UniformRow<UniformRowValueName<UN>> {
    return this.raw.uniformRow(rowName);
  }
  get raw(): SheetRaw {
    return new SheetRaw(this.sheetRawProps);
  }
  get topDataRow(): SchemaDataRow {
    return this.dataRow(this.schema.topDataRowIdx);
  }
  dataRow(rowIndex: number): SchemaDataRow {
    return new SchemaDataRow({
      ...this.sheetRawProps,
      rowIndex,
    });
  }
  get dataRows() {
    return this.raw.dataRows.map((row) => this.dataRow(row.rowIndex));
  }
  appendRowDefault(): SchemaDataRow {
    const defaultValues = this.schema.defaultValues(
      this.topDataRow.activeColIdxsNotFormula,
    );
    const { rowIndex } = this.raw.appendDataRowValues(defaultValues);
    return this.dataRow(rowIndex);
  }
}
