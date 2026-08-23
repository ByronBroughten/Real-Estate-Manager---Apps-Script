import type {
  ColumnName,
  ColumnValue,
  SheetDataValues,
} from "../01_generatedConfigs/columnConfigsTypes";
import type { SheetName } from "../01_generatedConfigs/sheetConfigsTypes";
import type { SheetRaw } from "../02_SpreadsheetRaw/SheetRaw";
import { SheetIndexed } from "../03_SpreadsheetIndexed/SheetIndexed";
import { Arr } from "../utils/Arr";
import { Obj } from "../utils/Obj";
import { SheetNamedBase } from "./ClassBases/SheetNamedBase";
import { ColumnNamed } from "./ColumnNamed";
import { DataRowNamed } from "./DataRowNamed";
import type { SheetSchemaNamed } from "./SheetSchemaNamed";
import { SpreadsheetNamed } from "./SpreadsheetNamed";

export class SheetNamed<
  SN extends SheetName = SheetName,
> extends SheetNamedBase<SN> {
  get spreadsheet(): SpreadsheetNamed {
    return new SpreadsheetNamed(this.spreadsheetNamedProps);
  }
  get schema(): SheetSchemaNamed<SN> {
    return this.ssSchema.sheet(this.sheetName);
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
  dataRow(rowIndex: number): DataRowNamed<SN> {
    return new DataRowNamed({
      ...this.sheetNamedProps,
      rowIndex,
    });
  }
  columnByIndex(colIndex: number): ColumnNamed<SN> {
    const columnId = this.indexed.columnIdByIndex(colIndex);
    const columnName = this.schema.colNameByColumnId(columnId);
    return new ColumnNamed({
      ...this.sheetNamedProps,
      columnName,
    });
  }
  addMissingColumnIds(): void {
    this.raw.addMissingColumnIds(this.schema.trait("idPrefix"));
  }
  column<CN extends ColumnName<SN>>(columnName: CN): ColumnNamed<SN, CN> {
    return new ColumnNamed({
      ...this.sheetNamedProps,
      columnName,
    });
  }
  columnsPrepFetchAllDataCells<CNs extends readonly ColumnName<SN>[]>(
    ...columnNames: CNs
  ): { [K in CNs[number]]: ColumnNamed<SN, K> } {
    const columns = {} as { [K in CNs[number]]: ColumnNamed<SN, K> };
    columnNames.forEach((columnName) => {
      columns[columnName] = this.column(columnName).prepFetchAllDataCells();
    });
    return columns;
  }
  get topDataRow(): DataRowNamed<SN> {
    return this.dataRow(this.schema.topDataRowIdx);
  }
  get dataRows(): DataRowNamed<SN>[] {
    return this.indexed.dataRows.map((row) => this.dataRow(row.rowIndex));
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
    if (this.indexed.dataRowCount > 0) {
      this.topDataRow.updateToDefault(...this.schema.columnNames);
    }
    if (this.indexed.dataRowCount > 1) {
      this.DELETE_DATA_ROWS_AFTER_TOP();
    }
  }
  private DELETE_DATA_ROWS_AFTER_TOP() {
    this.raw.DELETE_ACTIVE_DATA_ROWS(this.schema.topDataRowIdx + 1);
  }
  rowsFiltered(values: Partial<SheetDataValues<SN>>): DataRowNamed<SN>[] {
    return this.dataRows.filter((row) => {
      for (const columnName of Obj.keys(values)) {
        if (row.value(columnName) !== values[columnName]) {
          return false;
        }
      }
      return true;
    });
  }
  appendRowWithVals(values: Partial<SheetDataValues<SN>>): DataRowNamed<SN> {
    const { rowIndex } = this.indexed.appendRowDefault();
    return this.dataRow(rowIndex).updateValues(values);
  }
}
