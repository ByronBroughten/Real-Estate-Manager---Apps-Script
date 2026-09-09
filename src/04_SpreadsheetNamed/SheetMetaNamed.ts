import type { UniformRowName } from "../00_base/base";
import type { ColumnName } from "../01_generatedConfigs/columnConfigsTypes";
import type { SheetName } from "../01_generatedConfigs/sheetConfigsTypes";
import type { SheetMetaRaw } from "../02_SpreadsheetRaw/SheetMetaRaw";
import { SheetMetaIndexed } from "../03_SpreadsheetIndexed/SheetMetaIndexed";
import type { UniformRowIndexed } from "../03_SpreadsheetIndexed/UniformRowIndexed";
import { ColumnMetaNamed } from "./ColumnMetaNamed";
import { SheetCommon } from "./SheetCommon";
import { SheetNamed } from "./SheetNamed";
import { SpreadsheetNamed } from "./SpreadsheetNamed";

export class SheetMetaNamed<
  SN extends SheetName = SheetName,
> extends SheetCommon<SN> {
  get spreadsheet(): SpreadsheetNamed {
    return new SpreadsheetNamed(this.spreadsheetNamedProps);
  }
  get raw(): SheetMetaRaw {
    return this.spreadsheet.raw.sheetMeta(this.sheetGid);
  }
  get indexed(): SheetMetaIndexed {
    return new SheetMetaIndexed({
      ...this.sheetNamedProps,
      sheetGid: this.sheetGid,
    });
  }
  get primary(): SheetNamed<SN> {
    return new SheetNamed(this.sheetNamedProps);
  }
  get activeColumnIds(): string[] {
    return this.raw.activeColumnIds;
  }
  column<CN extends ColumnName<SN>>(columnName: CN): ColumnMetaNamed<SN, CN> {
    return new ColumnMetaNamed({
      ...this.sheetNamedProps,
      columnName,
    });
  }
  columnByIndex(colIndex: number): ColumnMetaNamed<SN> {
    const columnId = this.indexed.columnIdByIndex(colIndex);
    const columnName = this.schema.colNameByColumnId(columnId);
    return this.column(columnName);
  }
  uniformRow<UN extends UniformRowName>(rowName: UN): UniformRowIndexed<UN> {
    return this.indexed.uniformRow(rowName);
  }
  isActiveColumnId(columnId: string): boolean {
    return this.indexed.isActiveColumnId(columnId);
  }
  addMissingColumnIds(): number {
    return this.indexed.addMissingColumnIds();
  }
}
