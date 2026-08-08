import type {
  Value,
  ValueName,
} from "../0. spreadsheetMetaData/3.2 valueAttributes";
import type { SheetName } from "../0. spreadsheetMetaData/4.0 tableAttributes";
import type {
  ColumnName,
  ColumnValue,
  TableValues,
} from "../0. spreadsheetMetaData/5. allColumnAttributes";
import type { ColumnSchemaNamed } from "../1. SpreadsheetSchema/ColumnSchemaNamed";
import type { SheetSchemaNamed } from "../1. SpreadsheetSchema/SheetSchemaNamed";
import { RowRaw } from "../2. AppsScriptRaw/RowRaw";
import { Dat } from "../utils/Dat";
import { Obj } from "../utils/Obj";
import { valS } from "../utils/validation";
import { RowNamedBase, type RowState } from "./ClassBases/RowNamedBase";

import { SheetNamed } from "./SheetNamed";

export class RowNamed<TN extends SheetName> extends RowNamedBase<TN> {
  get state(): RowState<TN> {
    return this.rowState;
  }
  get sheetSchema(): SheetSchemaNamed<TN> {
    return this.sheet.schema;
  }
  columnSchema<CN extends ColumnName<TN>>(
    columnName: CN,
  ): ColumnSchemaNamed<TN, CN> {
    return this.sheetSchema.column(columnName);
  }
  get idxBase0(): number {
    return this.raw.idxBase0;
  }
  get raw(): RowRaw {
    return new RowRaw({
      ...this.sheet.raw.sheetRawProps,
      idxBase0: this.idxBase0,
    });
  }
  cellIsActive<CN extends ColumnName<TN>>(columnName: CN): boolean {
    const colIdx = this.columnIdx(columnName);
    return this.raw.cellIsActive(colIdx);
  }
  value<CN extends ColumnName<TN>>(columnName: CN): ColumnValue<TN, CN> {
    return this.rowState[columnName] as ColumnValue<TN, CN>;
  }

  valueStringNotEmpty<CN extends ColumnName<TN>>(columnName: CN): string {
    const value = this.value(columnName);
    return valS.validate.stringNotEmpty(value);
  }
  valueNumber<CN extends ColumnName<TN>>(columnName: CN): number {
    const value = this.value(columnName);
    return valS.validate.number(value);
  }
  valueDate<CN extends ColumnName<TN>>(columnName: CN): Date {
    const value = this.value(columnName);
    return valS.validate.date(value);
  }
  valueDateOrEmpty<CN extends ColumnName<TN>>(columnName: CN): Date | "" {
    const value = this.value(columnName);
    return valS.validate.dateOrEmpty(value);
  }
  dateValueAfterOrGivenDate<CN extends ColumnName<TN>>(
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
  dateValueBeforeOrGivenDate<CN extends ColumnName<TN>>(
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
  dateValueOrGivenDate<CN extends ColumnName<TN>>(
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
  values<CN extends ColumnName<TN> = ColumnName<TN>>(
    ...columnNames: readonly CN[]
  ): TableValues<TN, CN> {
    const keys =
      columnNames.length > 0 ? columnNames : (this.activeColumnNames as CN[]);
    return keys.reduce(
      (values, columnName) => {
        (values[columnName] as TableValues<TN, CN>[CN]) = this.value(
          columnName,
        ) as TableValues<TN, CN>[CN];
        return values;
      },
      {} as TableValues<TN, CN>,
    );
  }
  validateValues<CN extends ColumnName<TN> = ColumnName<TN>>(
    ...columnNames: CN[]
  ): TableValues<TN, CN> {
    const values = this.values(...columnNames);
    for (const [columnName, value] of Obj.entries(values)) {
      this.columnSchema(columnName).validate(value);
    }
    return values;
  }
  get activeColumnNames(): ColumnName<TN>[] {
    return this.sheet.activeColumnNames;
  }
  get sheet(): SheetNamed<TN> {
    return new SheetNamed(this.sheetNamedProps);
  }
  columnIdx(columnName: ColumnName<TN>): number {
    return this.columnSchema(columnName).idxBase0;
  }
  setValue<CN extends ColumnName<TN>, VL extends ColumnValue<TN, CN>>(
    columnName: CN,
    value: VL,
  ): RowNamed<TN> {
    this.raw.setValue(this.columnIdx(columnName), value);
    return this;
  }
  delete(): void {
    this.raw.delete();
    this;
  }
  setValueType<CN extends ColumnName<TN>>(
    columnName: CN,
    valueName: ValueName,
    value: Value,
  ): RowNamed<TN> {
    const schema = this.columnSchema(columnName);
    if (schema.valueName !== valueName) {
      throw new Error(
        `Value name ${valueName} does not match varb value name ${schema.valueName}`,
      );
    }

    value = schema.validate(value);
    this.setValue(columnName, value as ColumnValue<TN, CN>);
    return this;
  }
  setValues(sectionValues: Partial<TableValues<TN>>): RowNamed<TN> {
    sectionValues = Obj.pick(sectionValues, this.activeColumnNames) as Partial<
      TableValues<TN>
    >;
    for (const [columnName, value] of Obj.entries(sectionValues)) {
      this.setValue(columnName, value as ColumnValue<TN, typeof columnName>);
    }
    return this;
  }
}
