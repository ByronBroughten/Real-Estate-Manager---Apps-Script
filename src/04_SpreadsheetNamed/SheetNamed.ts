import type { UniformRowName } from "../00_base/base";
import type { ColumnName } from "../01_generatedConfigs/columnConfigsTypes";
import type { SheetName } from "../01_generatedConfigs/sheetConfigsTypes";
import type { SheetMetaRaw } from "../02_SpreadsheetRaw/SheetMetaRaw";
import type { DataColumnIndexed } from "../03_SpreadsheetIndexed/DataColumnIndexed";
import { SheetIndexed } from "../03_SpreadsheetIndexed/SheetIndexed";
import type { UniformRowIndexed } from "../03_SpreadsheetIndexed/UniformRowIndexed";
import { ColumnNamed } from "./ColumnNamed";
import { DataSheetNamed } from "./DataSheetNamed";
import { SheetCommon } from "./SheetCommon";
import { SpreadsheetNamed } from "./SpreadsheetNamed";

export class SheetNamed<
  SN extends SheetName = SheetName,
> extends SheetCommon<SN> {
  get spreadsheet(): SpreadsheetNamed {
    return new SpreadsheetNamed(this.spreadsheetNamedProps);
  }
  get raw(): SheetMetaRaw {
    return this.spreadsheet.raw.sheetMeta(this.schema.sheetGid);
  }
  get sheetGid(): number {
    return this.schema.sheetGid;
  }
  get indexed(): SheetIndexed {
    return new SheetIndexed({
      ...this.sheetNamedProps,
      sheetGid: this.schema.sheetGid,
    });
  }
  get data(): DataSheetNamed<SN> {
    return new DataSheetNamed(this.sheetNamedProps);
  }
  uniformRow<UN extends UniformRowName>(rowName: UN): UniformRowIndexed<UN> {
    return this.indexed.uniformRow(rowName);
  }
  columnByIndex(colIndex: number): ColumnNamed<SN> {
    const columnId = this.indexed.columnIdByIndex(colIndex);
    const columnName = this.schema.colNameByColumnId(columnId);
    return new ColumnNamed({
      ...this.sheetNamedProps,
      columnName,
    });
  }
  get activeColumnIds(): string[] {
    return this.raw.activeColumnIds;
  }
  isActiveColumnId(columnId: string): boolean {
    return this.indexed.isActiveColumnId(columnId);
  }
  addMissingColumnIds(): number {
    return this.indexed.addMissingColumnIds();
  }
  // By id, so the column name's value type isn't composed into the result.
  dataColumnIndexed(columnName: ColumnName<SN>): DataColumnIndexed {
    const { columnId } = this.schema.columnByName(columnName);
    return this.indexed.column(columnId).data;
  }
  column<CN extends ColumnName<SN>>(columnName: CN): ColumnNamed<SN, CN> {
    return new ColumnNamed({
      ...this.sheetNamedProps,
      columnName,
    });
  }
}
