import type { NotEmpty } from "../00_base/base";
import type {
  ColumnName,
  ColumnValue,
  ColumnValueDeclared,
  SheetDataValues,
} from "../01_generatedConfigs/columnConfigsTypes";
import type { SheetName } from "../01_generatedConfigs/sheetConfigsTypes";
import type { Value, ValueName } from "../01_generatedConfigs/valueSchemas";
import { RowRaw } from "../02_SpreadsheetRaw/RowRaw";
import { RowIndexed } from "../03_SpreadsheetIndexed/RowIndexed";
import { Dat } from "../utils/Dat";
import { Obj } from "../utils/Obj";
import { Val } from "../utils/Val";
import { CellNamed } from "./CellNamed";
import { RowNamedBase } from "./ClassBases/RowNamedBase";

import { SheetNamed } from "./SheetNamed";

export class RowNamed<SN extends SheetName> extends RowNamedBase<SN> {
  get sheet(): SheetNamed<SN> {
    return new SheetNamed(this.sheetNamedProps);
  }
  get indexed(): RowIndexed {
    return new RowIndexed({
      ...this.rowNamedProps,
      sheetGid: this.sheet.sheetGid,
    });
  }
  get raw(): RowRaw {
    return new RowRaw({
      ...this.sheet.raw.sheetRawProps,
      rowIndex: this.rowIndex,
    });
  }
  cell<CN extends ColumnName<SN>>(columnName: CN): CellNamed<SN, CN> {
    return this.sheet.column(columnName).cell(this.rowIndex);
  }
  cellIsActive<CN extends ColumnName<SN>>(columnName: CN): boolean {
    return this.cell(columnName).isActive;
  }
  valueOrEmpty<CN extends ColumnName<SN>>(columnName: CN): ColumnValue<SN, CN> {
    return this.cell(columnName).valueOrEmpty();
  }
  valueNotEmpty<CN extends ColumnName<SN>>(
    columnName: CN,
  ): NotEmpty<ColumnValue<SN, CN>> {
    return this.cell(columnName).valueNotEmpty();
  }
  value<CN extends ColumnName<SN>>(
    columnName: CN,
  ): ColumnValueDeclared<SN, CN> {
    return this.cell(columnName).value();
  }
  dateValueAfterOrGivenDate<CN extends ColumnName<SN>>(
    columnName: CN,
    date: Date = new Date(),
  ): Date {
    const dateValue = this.valueOrEmpty(columnName);
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
    const dateValue = this.valueOrEmpty(columnName);
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
    const dateValue = this.valueOrEmpty(columnName);
    if (Val.is.date(dateValue)) {
      return dateValue;
    } else {
      return date;
    }
  }
  valuesOrEmpty<CN extends ColumnName<SN> = ColumnName<SN>>(
    ...columnNames: readonly CN[]
  ): SheetDataValues<SN, CN> {
    const keys =
      columnNames.length > 0 ? columnNames : (this.activeCellNames as CN[]);
    return keys.reduce(
      (values, columnName) => {
        (values[columnName] as SheetDataValues<SN, CN>[CN]) = this.valueOrEmpty(
          columnName,
        ) as SheetDataValues<SN, CN>[CN];
        return values;
      },
      {} as SheetDataValues<SN, CN>,
    );
  }
  get activeCellNames(): ColumnName<SN>[] {
    return this.indexed.activeColumnIds.map((columnId) =>
      this.schema.colNameByColumnId(columnId),
    );
  }
  updateToDefault(...columnNames: ColumnName<SN>[]): RowNamed<SN> {
    columnNames.forEach((columnName) =>
      this.cell(columnName).updateToDefault(),
    );
    return this;
  }
  updateCellToDefault(columnName: ColumnName<SN>): RowNamed<SN> {
    this.cell(columnName).updateToDefault();
    return this;
  }
  updateValue<CN extends ColumnName<SN>>(
    columnName: CN,
    value: ColumnValue<SN, CN>,
  ): RowNamed<SN> {
    this.cell(columnName).updateValue(value);
    return this;
  }
  get isBlank(): boolean {
    return this.indexed.isBlank;
  }
  clearValues(): RowNamed<SN> {
    this.indexed.clearValues();
    return this;
  }
  delete(): void {
    this.indexed.delete();
  }
  setValueType<CN extends ColumnName<SN>>(
    columnName: CN,
    valueName: ValueName,
    value: Value,
  ): RowNamed<SN> {
    this.cell(columnName).setValueType(valueName, value);
    return this;
  }
  updateValues(sectionValues: Partial<SheetDataValues<SN>>): RowNamed<SN> {
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
