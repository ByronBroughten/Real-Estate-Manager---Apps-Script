import type { SheetName } from "../01_configs/02_sheetConfigsTypes";
import type {
  ColumnName,
  ColumnValue,
  TableValues,
} from "../01_configs/03_columnConfigs";
import { SchemaSheetIndexed } from "../02_AppsScriptRaw/SchemaSheetIndexed";
import type { SheetRaw } from "../02_AppsScriptRaw/SheetRaw";
import type { SheetSchemaNamed } from "../02_Schemas/SheetSchemaNamed";
import { Arr } from "../utils/Arr";
import { SheetNamedBase } from "./ClassBases/SheetNamedBase";
import { ColumnNamed } from "./ColumnNamed";
import { DataRowNamed } from "./DataRowNamed";
import { SpreadsheetNamed } from "./SpreadsheetNamed";

export class SheetNamed<
  SN extends SheetName = SheetName,
> extends SheetNamedBase<SN> {
  get spreadsheet(): SpreadsheetNamed {
    return new SpreadsheetNamed(this.spreadsheetNamedProps);
  }
  get schema(): SheetSchemaNamed<SN> {
    return this.spreadsheetSchema.sheet(this.sheetName);
  }
  get raw(): SheetRaw {
    return this.spreadsheet.raw.sheet(this.schema.sheetGid);
  }
  get rich(): SchemaSheetIndexed {
    return new SchemaSheetIndexed(this.raw.sheetRawProps);
  }
  dataRow(rowIndex: number): DataRowNamed<SN> {
    return new DataRowNamed({
      ...this.sheetNamedProps,
      rowIndex,
    });
  }
  column<CN extends ColumnName<SN>>(columnName: CN): ColumnNamed<SN, CN> {
    return new ColumnNamed({
      ...this.sheetNamedProps,
      columnName,
    });
  }
  get topDataRow(): DataRowNamed<SN> {
    return this.dataRow(this.schema.topDataRowIdx);
  }
  get dataRows(): DataRowNamed<SN>[] {
    return this.raw.dataRowIndexes.map((rowIndex) => this.dataRow(rowIndex));
  }
  get activeColumnNames(): ColumnName<SN>[] {
    return this.raw.activeColumnIdxs.map((colIdx) =>
      this.schema.columnNameByIdx(colIdx),
    );
  }
  get idValueIdx(): number {
    return this.schema.column("id").colIndex;
  }
  topDataRowValue<CN extends ColumnName<SN>>(
    columnName: CN,
  ): ColumnValue<SN, CN> {
    return this.topDataRow.value(columnName);
  }
  sortRowsbyColumnName(
    rows: DataRowNamed<SN>[],
    columnName: ColumnName<SN>,
  ): DataRowNamed<SN>[] {
    return rows.sort((a, b) => {
      return Arr.compareForSort(a.value(columnName), b.value(columnName));
    });
  }
  RESET_TOP_DATA_ROW_DELETE_REST() {
    if (this.raw.dataRowCount > 0) {
      this.rich.topDataRow.updateToDefault();
    }
    if (this.raw.dataRowCount > 1) {
      this.DELETE_DATA_ROWS_AFTER_TOP();
    }
  }
  private DELETE_DATA_ROWS_AFTER_TOP() {
    this.raw.DELETE_ACTIVE_DATA_ROWS(this.schema.topDataRowIdx + 1);
  }
  rowsFiltered(values: Partial<TableValues<SN>>): DataRowNamed<SN>[] {
    return this.dataRows.filter((row) => {
      for (const columnName in values) {
        if (row.value(columnName) !== values[columnName]) {
          return false;
        }
      }
      return true;
    });
  }
  appendRowWithVals(values: Partial<TableValues<SN>>): DataRowNamed<SN> {
    const { rowIndex } = this.raw.appendDataRow();
    return this.dataRow(rowIndex).updateValues(values);
  }
}
