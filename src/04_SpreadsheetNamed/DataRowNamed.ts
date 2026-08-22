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
  cellIsActive<CN extends ColumnName<SN>>(columnName: CN): boolean {
    const colIndex = this.colIndex(columnName);
    return this.raw.cell(colIndex).isActive;
  }
  value<CN extends ColumnName<SN>>(columnName: CN): ColumnValue<SN, CN> {
    return this.raw.value(this.colIndex(columnName)) as ColumnValue<SN, CN>;
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
    return this.raw.activeColIds.map((index) =>
      this.sheetSchema.colNameByIndex(index),
    );
  }
  updateToDefault(...columnNames: ColumnName<SN>[]): DataRowNamed<SN> {
    this.indexed.updateToDefault(...this.colIndexes(columnNames));
    return this;
  }
  updateCellToDefault(columnName: ColumnName<SN>): DataRowNamed<SN> {
    this.indexed.updateCellToDefault(this.colIndex(columnName));
    return this;
  }
  updateValue<CN extends ColumnName<SN>, VL extends ColumnValue<SN, CN>>(
    columnName: CN,
    value: VL,
  ): DataRowNamed<SN> {
    this.raw.updateValue(this.colIndex(columnName), value);
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
    const schema = this.columnSchema(columnName);
    if (schema.valueName !== valueName) {
      throw new Error(
        `Value name ${valueName} does not match varb value name ${schema.valueName}`,
      );
    }

    value = schema.validate(value);
    this.updateValue(columnName, value as ColumnValue<SN, CN>);
    return this;
  }
  updateValues(sectionValues: Partial<SheetDataValues<SN>>): DataRowNamed<SN> {
    for (const [columnName, value] of Obj.entries(sectionValues)) {
      this.updateValue(columnName, value as ColumnValue<SN, typeof columnName>);
    }
    return this;
  }
}
