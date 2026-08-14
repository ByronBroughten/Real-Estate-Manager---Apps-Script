import type { SheetName } from "../01_configs/02_sheetTraitsTypes";
import type {
  ColumnName,
  ColumnValue,
  TableValues,
} from "../01_configs/03_columnTraits";
import { RowRaw } from "../02_AppsScriptRaw/RowRaw";
import { SchemaDataRow } from "../02_AppsScriptRaw/SchemaDataRow";
import type { Value, ValueName } from "../02_Schemas/03_valueSchemas";
import type { ColumnSchemaNamed } from "../02_Schemas/ColumnSchemaNamed";
import type { SheetSchemaNamed } from "../02_Schemas/SheetSchemaNamed";
import { Dat } from "../utils/Dat";
import { Obj } from "../utils/Obj";
import { valS } from "../utils/validation";
import { RowNamedBase } from "./ClassBases/RowNamedBase";

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
    return this.columnSchema(columnName).colIndex;
  }
  colIndexes(columnNames: ColumnName<SN>[]): number[] {
    return columnNames.map((name) => this.colIndex(name));
  }
  get sheet(): SheetNamed<SN> {
    return new SheetNamed(this.sheetNamedProps);
  }
  get rich(): SchemaDataRow {
    return new SchemaDataRow(this.raw.rowRawProps);
  }

  get raw(): RowRaw {
    return new RowRaw({
      ...this.sheet.raw.sheetRawProps,
      rowIndex: this.rowIndex,
    });
  }
  cellIsActive<CN extends ColumnName<SN>>(columnName: CN): boolean {
    const colIdx = this.colIndex(columnName);
    return this.raw.cellIsActive(colIdx);
  }
  cellIsEmpty<CN extends ColumnName<SN>>(columnName: CN): boolean {
    const colIdx = this.colIndex(columnName);
    return this.raw.isEmptyCell(colIdx);
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
  ): TableValues<SN, CN> {
    const keys =
      columnNames.length > 0 ? columnNames : (this.activeColumnNames as CN[]);
    return keys.reduce(
      (values, columnName) => {
        (values[columnName] as TableValues<SN, CN>[CN]) = this.value(
          columnName,
        ) as TableValues<SN, CN>[CN];
        return values;
      },
      {} as TableValues<SN, CN>,
    );
  }
  validateValues<CN extends ColumnName<SN> = ColumnName<SN>>(
    ...columnNames: CN[]
  ): TableValues<SN, CN> {
    const values = this.values(...columnNames);
    for (const [columnName, value] of Obj.entries(values)) {
      this.columnSchema(columnName).validate(value);
    }
    return values;
  }
  get activeColumnNames(): ColumnName<SN>[] {
    return this.sheet.activeColumnNames;
  }
  updateToDefault(...columnNames: ColumnName<SN>[]): DataRowNamed<SN> {
    this.rich.updateToDefault(...this.colIndexes(columnNames));
    return this;
  }
  updateCellToDefault(columnName: ColumnName<SN>): DataRowNamed<SN> {
    this.rich.updateCellToDefault(this.colIndex(columnName));
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
  updateValues(sectionValues: Partial<TableValues<SN>>): DataRowNamed<SN> {
    sectionValues = Obj.pick(sectionValues, this.activeColumnNames) as Partial<
      TableValues<SN>
    >;
    for (const [columnName, value] of Obj.entries(sectionValues)) {
      this.updateValue(columnName, value as ColumnValue<SN, typeof columnName>);
    }
    return this;
  }
}
