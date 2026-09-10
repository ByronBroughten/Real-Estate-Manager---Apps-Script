import type {
  ColumnName,
  ColumnValue,
  SheetDataValues,
  SheetDataValuesAll,
} from "../01_generatedConfigs/columnConfigsTypes";
import type { SheetName } from "../01_generatedConfigs/sheetConfigsTypes";
import type { SheetRaw } from "../02_SpreadsheetRaw/SheetRaw";
import type { ColumnIndexed } from "../03_SpreadsheetIndexed/ColumnIndexed";
import { SheetIndexed } from "../03_SpreadsheetIndexed/SheetIndexed";
import { Arr } from "../utils/Arr";
import { Obj } from "../utils/Obj";
import { ColumnNamed } from "./ColumnNamed";
import { RowNamed } from "./RowNamed";
import { SheetCommon } from "./SheetCommon";
import { SheetMetaNamed } from "./SheetMetaNamed";

export class SheetNamed<
  SN extends SheetName = SheetName,
> extends SheetCommon<SN> {
  get meta(): SheetMetaNamed<SN> {
    return new SheetMetaNamed(this.sheetNamedProps);
  }
  get raw(): SheetRaw {
    return this.indexed.raw;
  }
  get indexed(): SheetIndexed {
    return new SheetIndexed({
      ...this.sheetNamedProps,
      sheetGid: this.sheetGid,
    });
  }
  get rowIndexesActive(): number[] {
    return this.indexed.rowIndexesActive;
  }
  get rowIndexesActiveWithData(): number[] {
    return this.indexed.rowIndexesActiveWithData;
  }
  get rowIndexesFullWithData(): number[] {
    return this.indexed.rowIndexesFullWithData;
  }
  get rows(): RowNamed<SN>[] {
    return this.indexed.rows.map((row) => this.row(row.rowIndex));
  }
  get topRow(): RowNamed<SN> {
    return this.row(this.schema.topDataRowIdx);
  }
  row(rowIndex: number): RowNamed<SN> {
    return new RowNamed({
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
  // By id, so the column name's value type isn't composed into the result.
  columnIndexed(columnName: ColumnName<SN>): ColumnIndexed {
    const { columnId } = this.schema.columnByName(columnName);
    return this.indexed.column(columnId);
  }
  columns<CNs extends readonly ColumnName<SN>[]>(
    ...columnNames: CNs
  ): { [K in CNs[number]]: ColumnNamed<SN, K> } {
    const columns = {} as { [K in CNs[number]]: ColumnNamed<SN, K> };
    columnNames.forEach((columnName) => {
      columns[columnName] = this.column(columnName);
    });
    return columns;
  }
  prepFetchColumnsFull<CNs extends readonly ColumnName<SN>[]>(
    ...columnNames: CNs
  ): { [K in CNs[number]]: ColumnNamed<SN, K> } {
    const columns = {} as { [K in CNs[number]]: ColumnNamed<SN, K> };
    columnNames.forEach((columnName) => {
      columns[columnName] = this.column(columnName).prepFetchFull();
    });
    return columns;
  }
  prepFetchColumnsSpecific<CNs extends readonly ColumnName<SN>[]>(
    rowIndexes: number[],
    ...columnNames: CNs
  ): { [K in CNs[number]]: ColumnNamed<SN, K> } {
    const columns = {} as { [K in CNs[number]]: ColumnNamed<SN, K> };
    columnNames.forEach((columnName) => {
      columns[columnName] =
        this.column(columnName).prepFetchSpecific(rowIndexes);
    });
    return columns;
  }
  prepFetchColumnsActive<CNs extends readonly ColumnName<SN>[]>(
    ...columnNames: CNs
  ): { [K in CNs[number]]: ColumnNamed<SN, K> } {
    return this.prepFetchColumnsSpecific(this.rowIndexesActive, ...columnNames);
  }
  sortRowsbyColumnName(
    rows: RowNamed<SN>[],
    columnName: ColumnName<SN>,
  ): RowNamed<SN>[] {
    return rows.sort((a, b) => {
      return Arr.compareForSort(
        a.valueOrEmpty(columnName),
        b.valueOrEmpty(columnName),
      );
    });
  }
  DELETE_ALL_DATA_ROWS(): void {
    this.indexed.DELETE_ALL_DATA_ROWS();
  }
  rowsFiltered(values: Partial<SheetDataValues<SN>>): RowNamed<SN>[] {
    return this.rows.filter((row) => {
      for (const columnName of Obj.keys(values)) {
        if (row.valueOrEmpty(columnName) !== values[columnName]) {
          return false;
        }
      }
      return true;
    });
  }
  rowByValue<CN extends ColumnName<SN>>(
    columnName: CN,
    value: ColumnValue<SN, CN>,
  ): RowNamed<SN> {
    const rows = this.rows.filter(
      (row) => row.valueOrEmpty(columnName) === value,
    );
    if (rows.length !== 1) {
      throw new Error(
        `Expected 1 row of "${this.sheetName}" to have a "${columnName}" of "${value}", but ${rows.length} did.`,
      );
    }
    return rows[0]!;
  }
  appendRowWithVals(values: Partial<SheetDataValues<SN>>): RowNamed<SN> {
    const { rowIndex } = this.indexed.appendRowDefault();
    return this.row(rowIndex).updateValues(values);
  }
  appendRowWithAllVals(values: SheetDataValuesAll<SN>): RowNamed<SN> {
    // A subset of the partial bag, which the checker can't see while the sheet name is generic.
    return this.appendRowWithVals(values as Partial<SheetDataValues<SN>>);
  }
}
