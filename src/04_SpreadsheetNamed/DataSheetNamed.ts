import type {
  ColumnName,
  ColumnValue,
  SheetDataValues,
} from "../01_generatedConfigs/columnConfigsTypes";
import type { SheetName } from "../01_generatedConfigs/sheetConfigsTypes";
import type { SheetRaw } from "../02_SpreadsheetRaw/SheetRaw";
import { DataSheetIndexed } from "../03_SpreadsheetIndexed/DataSheetIndexed";
import { Arr } from "../utils/Arr";
import { Obj } from "../utils/Obj";
import { DataColumnNamed } from "./DataColumnNamed";
import { DataRowNamed } from "./DataRowNamed";
import { SheetCommon } from "./SheetCommon";
import { SheetNamed } from "./SheetNamed";

export class DataSheetNamed<
  SN extends SheetName = SheetName,
> extends SheetCommon<SN> {
  get sheet(): SheetNamed<SN> {
    return new SheetNamed(this.sheetNamedProps);
  }
  get raw(): SheetRaw {
    return this.sheet.raw;
  }
  get indexed(): DataSheetIndexed {
    return new DataSheetIndexed({
      ...this.sheetNamedProps,
      sheetGid: this.schema.sheetGid,
    });
  }
  get dataRowIndexesActive(): number[] {
    return this.indexed.dataRowIndexesActive;
  }
  row(rowIndex: number): DataRowNamed<SN> {
    return new DataRowNamed({
      ...this.sheetNamedProps,
      rowIndex,
    });
  }
  get rows(): DataRowNamed<SN>[] {
    return this.indexed.rows.map((row) => this.row(row.rowIndex));
  }
  get topRow(): DataRowNamed<SN> {
    return this.row(this.schema.topDataRowIdx);
  }
  topRowValue<CN extends ColumnName<SN>>(columnName: CN): ColumnValue<SN, CN> {
    return this.topRow.value(columnName);
  }
  column<CN extends ColumnName<SN>>(columnName: CN): DataColumnNamed<SN, CN> {
    return new DataColumnNamed({
      ...this.sheetNamedProps,
      columnName,
    });
  }
  columns<CNs extends readonly ColumnName<SN>[]>(
    ...columnNames: CNs
  ): { [K in CNs[number]]: DataColumnNamed<SN, K> } {
    const columns = {} as { [K in CNs[number]]: DataColumnNamed<SN, K> };
    columnNames.forEach((columnName) => {
      columns[columnName] = this.column(columnName);
    });
    return columns;
  }
  prepFetchColumnsFull<CNs extends readonly ColumnName<SN>[]>(
    ...columnNames: CNs
  ): { [K in CNs[number]]: DataColumnNamed<SN, K> } {
    const columns = {} as { [K in CNs[number]]: DataColumnNamed<SN, K> };
    columnNames.forEach((columnName) => {
      columns[columnName] = this.column(columnName).prepFetchFull();
    });
    return columns;
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
      this.topRow.updateToDefault(...this.schema.columnNames);
    }
    if (this.indexed.dataRowCount > 1) {
      this.DELETE_DATA_ROWS_AFTER_TOP();
    }
  }
  private DELETE_DATA_ROWS_AFTER_TOP() {
    this.raw.DELETE_ACTIVE_DATA_ROWS(this.schema.topDataRowIdx + 1);
  }
  rowsFiltered(values: Partial<SheetDataValues<SN>>): DataRowNamed<SN>[] {
    return this.rows.filter((row) => {
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
    return this.row(rowIndex).updateValues(values);
  }
}
