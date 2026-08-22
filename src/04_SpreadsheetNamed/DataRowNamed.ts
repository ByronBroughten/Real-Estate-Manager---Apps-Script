import { DataRowRaw } from "../01_SpreadsheetRaw/ClassBases/DataRowRaw";
import type { SheetName } from "../02_generatedTraits/02_sheetTraitsTypes";
import type {
  ColumnName,
  ColumnValue,
  SheetDataValues,
} from "../02_generatedTraits/03_columnTraits";
import type { Value, ValueName } from "../02_generatedTraits/06_valueSchemas";
import { DataRowIndexed } from "../03_SpreadsheetIndexed/DataRowIndexed";
import { Dat } from "../utils/Dat";
import { Obj } from "../utils/Obj";
import { valS } from "../utils/validation";
import { CellNamed } from "./CellNamed";
import { RowNamedBase } from "./ClassBases/RowNamedBase";
import type { ColumnSchemaNamed } from "./ColumnSchemaNamed";
import type { SheetSchemaNamed } from "./SheetSchemaNamed";

import { SheetNamed } from "./SheetNamed";

export class DataRowNamed<SN extends SheetName> extends RowNamedBase<SN> {
  get sheetSchema(): SheetSchemaNamed<SN> {
    return this.sheet.schema;
  }
  columnSchema<CN extends ColumnName<SN>>(
    columnName: CN,
  ): ColumnSchemaNamed<SN, CN> {
    return this.sheetSchema.column(columnName);
  }
  colIndex(columnName: ColumnName<SN>): number {
    return this.sheet.column(columnName).colIndex;
  }
  colIndexes(columnNames: ColumnName<SN>[]): number[] {
    return columnNames.map((name) => this.colIndex(name));
  }
  get sheet(): SheetNamed<SN> {
    return new SheetNamed(this.sheetNamedProps);
  }
  get indexed(): DataRowIndexed {
    return new DataRowIndexed({
      ...this.rowNamedProps,
      sheetGid: this.sheet.sheetGid,
    });
  }
  get raw(): DataRowRaw {
    return new DataRowRaw({
      ...this.sheet.raw.sheetRawProps,
      rowIndex: this.rowIndex,
    });
  }
  cell<CN extends ColumnName<SN>>(columnName: CN): CellNamed<SN, CN> {
    return this.sheet.column(columnName).dataCell(this.rowIndex);
  }
  cellIsActive<CN extends ColumnName<SN>>(columnName: CN): boolean {
    return this.cell(columnName).isActive;
  }
  value<CN extends ColumnName<SN>>(columnName: CN): ColumnValue<SN, CN> {
    return this.cell(columnName).value();
  }
  valueStringNotEmpty<CN extends ColumnName<SN>>(columnName: CN): string {
    const value = this.value(columnName);
    return valS.validate.stringNotEmpty(value);
  }
  valueNumber<CN extends ColumnName<SN>>(columnName: CN): number {
    const value = this.value(columnName);
    return valS.validate.number(value);
  }
  valueDate<CN extends ColumnName<SN>>(columnName: CN): Date {
    const value = this.value(columnName);
    return valS.validate.date(value);
  }
  valueDateOrEmpty<CN extends ColumnName<SN>>(columnName: CN): Date | "" {
    const value = this.value(columnName);
    return valS.validate.dateOrEmpty(value);
  }
  dateValueAfterOrGivenDate<CN extends ColumnName<SN>>(
    columnName: CN,
    date: Date = new Date(),
  ): Date {
    const dateValue = this.valueDateOrEmpty(columnName);
    if (!valS.is.date(dateValue)) {
      return date;
    }

    if (Dat.isDateSameOrAfter(dateValue, date)) {
      return dateValue;
    } else {
      return date;
    }
  }
  dateValueBeforeOrGivenDate<CN extends ColumnName<SN>>(
    columnName: CN,
    date: Date = new Date(),
  ): Date {
    const dateValue = this.valueDateOrEmpty(columnName);
    if (!valS.is.date(dateValue)) {
      return date;
    }

    if (Dat.isDateSameOrBefore(dateValue, date)) {
      return dateValue;
    } else {
      return date;
    }
  }
  dateValueOrGivenDate<CN extends ColumnName<SN>>(
    columnName: CN,
    date: Date = new Date(),
  ): Date {
    const dateValue = this.valueDateOrEmpty(columnName);
    if (valS.is.date(dateValue)) {
      return dateValue;
    } else {
      return date;
    }
  }
  values<CN extends ColumnName<SN> = ColumnName<SN>>(
    ...columnNames: readonly CN[]
  ): SheetDataValues<SN, CN> {
    const keys =
      columnNames.length > 0 ? columnNames : (this.activeCellNames as CN[]);
    return keys.reduce(
      (values, columnName) => {
        (values[columnName] as SheetDataValues<SN, CN>[CN]) = this.value(
          columnName,
        ) as SheetDataValues<SN, CN>[CN];
        return values;
      },
      {} as SheetDataValues<SN, CN>,
    );
  }
  validateValues<CN extends ColumnName<SN> = ColumnName<SN>>(
    ...columnNames: CN[]
  ): SheetDataValues<SN, CN> {
    const values = this.values(...columnNames);
    for (const [columnName, value] of Obj.entries(values)) {
      this.columnSchema(columnName).validate(value);
    }
    return values;
  }
  get activeCellNames(): ColumnName<SN>[] {
    return [...this.raw.rowState.keys()].map((colIndex) => {
      const columnId = this.sheet.indexed.columnIdByIndex(colIndex);
      return this.sheetSchema.colNameByColumnId(columnId);
    });
  }
  updateToDefault(...columnNames: ColumnName<SN>[]): DataRowNamed<SN> {
    columnNames.forEach((columnName) => this.cell(columnName).updateToDefault());
    return this;
  }
  updateCellToDefault(columnName: ColumnName<SN>): DataRowNamed<SN> {
    this.cell(columnName).updateToDefault();
    return this;
  }
  updateValue<CN extends ColumnName<SN>>(
    columnName: CN,
    value: ColumnValue<SN, CN>,
  ): DataRowNamed<SN> {
    this.cell(columnName).updateValue(value);
    return this;
  }
  delete(): void {
    this.raw.delete();
    this;
  }
  setValueType<CN extends ColumnName<SN>>(
    columnName: CN,
    valueName: ValueName,
    value: Value,
  ): DataRowNamed<SN> {
    this.cell(columnName).setValueType(valueName, value);
    return this;
  }
  updateValues(sectionValues: Partial<SheetDataValues<SN>>): DataRowNamed<SN> {
    for (const [columnName, value] of Obj.entries(sectionValues)) {
      this.updateValue(columnName, value as ColumnValue<SN, typeof columnName>);
    }
    return this;
  }
}
