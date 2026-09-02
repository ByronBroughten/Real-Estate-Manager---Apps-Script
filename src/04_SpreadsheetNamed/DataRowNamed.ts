import type {
  ColumnName,
  ColumnValue,
  SheetDataValues,
} from "../01_generatedConfigs/columnConfigsTypes";
import type { SheetName } from "../01_generatedConfigs/sheetConfigsTypes";
import type { Value, ValueName } from "../01_generatedConfigs/valueSchemas";
import { DataRowRaw } from "../02_SpreadsheetRaw/ClassBases/DataRowRaw";
import { DataRowIndexed } from "../03_SpreadsheetIndexed/DataRowIndexed";
import { Dat } from "../utils/Dat";
import { Obj } from "../utils/Obj";
import { Val } from "../utils/Val";
import { CellNamed } from "./CellNamed";
import { RowNamedBase } from "./ClassBases/RowNamedBase";

import { SheetNamed } from "./SheetNamed";

export class DataRowNamed<SN extends SheetName> extends RowNamedBase<SN> {
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
    return this.sheet.column(columnName).data.cell(this.rowIndex);
  }
  cellIsActive<CN extends ColumnName<SN>>(columnName: CN): boolean {
    return this.cell(columnName).isActive;
  }
  value<CN extends ColumnName<SN>>(columnName: CN): ColumnValue<SN, CN> {
    return this.cell(columnName).value();
  }
  valueStringNotEmpty<CN extends ColumnName<SN>>(columnName: CN): string {
    const value = this.value(columnName);
    return Val.validate.stringNotEmpty(value);
  }
  valueNumber<CN extends ColumnName<SN>>(columnName: CN): number {
    const value = this.value(columnName);
    return Val.validate.number(value);
  }
  valueDate<CN extends ColumnName<SN>>(columnName: CN): Date {
    const value = this.value(columnName);
    return Val.validate.date(value);
  }
  valueDateOrEmpty<CN extends ColumnName<SN>>(columnName: CN): Date | "" {
    const value = this.value(columnName);
    return Val.validate.dateOrEmpty(value);
  }
  dateValueAfterOrGivenDate<CN extends ColumnName<SN>>(
    columnName: CN,
    date: Date = new Date(),
  ): Date {
    const dateValue = this.valueDateOrEmpty(columnName);
    if (!Val.is.date(dateValue)) {
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
    if (!Val.is.date(dateValue)) {
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
    if (Val.is.date(dateValue)) {
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
      this.schema.column(columnName).validate(value);
    }
    return values;
  }
  get activeCellNames(): ColumnName<SN>[] {
    return this.indexed.activeColumnIds.map((columnId) =>
      this.schema.colNameByColumnId(columnId),
    );
  }
  updateToDefault(...columnNames: ColumnName<SN>[]): DataRowNamed<SN> {
    columnNames.forEach((columnName) =>
      this.cell(columnName).updateToDefault(),
    );
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
    this.indexed.delete();
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
  prepFetchFull(): this {
    this.indexed.prepFetchFull();
    return this;
  }
}
