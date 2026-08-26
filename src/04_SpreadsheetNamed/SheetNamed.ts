import type { UniformRowName } from "../00_base/base";
import type { ColumnName } from "../01_generatedConfigs/columnConfigsTypes";
import type { SheetName } from "../01_generatedConfigs/sheetConfigsTypes";
import type { SheetRaw } from "../02_SpreadsheetRaw/SheetRaw";
import type { UniformRow } from "../02_SpreadsheetRaw/UniformRow";
import { SheetIndexed } from "../03_SpreadsheetIndexed/SheetIndexed";
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
  get raw(): SheetRaw {
    return this.spreadsheet.raw.sheet(this.schema.sheetGid);
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
  uniformRow<UN extends UniformRowName>(rowName: UN): UniformRow<UN> {
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
  addMissingColumnIds(): number {
    return this.indexed.addMissingColumnIds();
  }
  column<CN extends ColumnName<SN>>(columnName: CN): ColumnNamed<SN, CN> {
    return new ColumnNamed({
      ...this.sheetNamedProps,
      columnName,
    });
  }
}
