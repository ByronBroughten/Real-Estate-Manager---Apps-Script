import type {
  Value,
  ValueName,
} from "../0. spreadsheetMetaData/3.2 valueAttributes";
import type { TableName } from "../0. spreadsheetMetaData/4.0 tableAttributes";
import type {
  ColumnName,
  ColumnValue,
  TableValues,
} from "../0. spreadsheetMetaData/5. allColumnAttributes";
import type {
  SheetSchema,
  VarbNameMutable,
} from "../1. SpreadsheetSchema/SheetSchema";
import { RowRaw } from "../2. AppsScriptRaw/RowRaw";
import type { BatchUpdateRequest } from "../2. AppsScriptRaw/Types/AppsScriptTypes";
import {
  asU,
  type StandardizedValue,
  type UserEnteredValue,
} from "../utilitiesAppsScript";
import { utils } from "../utilitiesGeneral";
import { Obj } from "../utils/Obj";
import { valS } from "../utils/validation";
import { RowBase, type RowState } from "./ClassBases/RowNamedBase";

import { SheetNamed } from "./SheetNamed";

export class Row<TN extends TableName> extends RowBase<TN> {
  get schema(): SheetSchema<TN> {
    return this.tableSchema;
  }
  get state(): RowState<TN> {
    return this.rowState;
  }
  get idxBase1(): number {
    const { topBodyRowIdxBase1 } = this.sheet;
    const baseIdx = this.sheetState.bodyRowOrder.indexOf(this.id);
    return baseIdx + topBodyRowIdxBase1;
  }
  get raw(): RowRaw {
    return new RowRaw({
      ...this.sheet.raw.sheetRawProps,
      idxBase0: this.idxBase1 - 1,
    });
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

    if (utils.date.isDateSameOrAfter(dateValue, date)) {
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

    if (utils.date.isDateSameOrBefore(dateValue, date)) {
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

  valueStandardized<CN extends ColumnName<TN>>(
    columnName: CN,
  ): StandardizedValue<ColumnValue<TN, CN>> {
    return asU.standardize.value(this.value(columnName)) as StandardizedValue<
      ColumnValue<TN, CN>
    >;
  }
  valueUserEntered(columnName: ColumnName<TN>): UserEnteredValue {
    const value = this.value(columnName);
    if (valS.is.string(value)) {
      if (value[0] === "=") {
        return { formulaValue: value };
      } else {
        return { stringValue: value };
      }
    } else if (valS.is.date(value)) {
      return { stringValue: asU.standardize.date(value) };
    } else if (valS.is.number(value)) {
      return { numberValue: value };
    } else if (valS.is.boolean(value)) {
      return { boolValue: value };
    }
  }

  values<CN extends ColumnName<TN> = ColumnName<TN>>(
    columnNames?: readonly CN[],
  ): TableValues<TN, CN> {
    const keys = columnNames || (this.columnNames as CN[]);
    return keys.reduce(
      (values, columnName) => {
        values[columnName] = this.value(
          columnName,
        ) as (typeof values)[typeof columnName];
        return values;
      },
      {} as TableValues<TN, CN>,
    );
  }
  validateValues<CN extends ColumnName<TN> = ColumnName<TN>>(
    columnNames?: CN[],
  ): TableValues<TN, CN> {
    const values = this.values(columnNames);
    for (const [columnName, value] of Obj.entries(values)) {
      this.schema.column(columnName).validate(value);
    }
    return values;
  }

  get columnNames(): ColumnName<TN>[] {
    return this.schema.columnNames;
  }
  get sheet(): SheetNamed<TN> {
    return new SheetNamed(this.sheetProps);
  }
  resetToDefault(columnNames?: VarbNameMutable<TN>[]): void {
    this.setValues(
      this.schema.makeDefaultValues(columnNames) as Partial<TableValues<TN>>,
    );
  }
  addAllVarbsAsChanges(): void {
    this.sheet.addChangeToSave(this.id, {
      action: "update",
      columnNames: this.columnNames,
    });
  }
  setValue<CN extends ColumnName<TN>, VL extends ColumnValue<TN, CN>>(
    columnName: CN,
    value: VL,
  ): Row<TN> {
    this.rowState[columnName] = value as RowState<TN>[CN];
    this.sheet.addChangeToSave(this.id, {
      action: "update",
      columnNames: [columnName],
    });
    return this;
  }
  markForDelete() {
    this.sheet.addChangeToSave(this.id, {
      action: "delete",
    });
  }
  setValueType<CN extends ColumnName<TN>>(
    columnName: CN,
    valueName: ValueName,
    value: Value,
  ): Row<TN> {
    const schema = this.schema.column(columnName);
    if (schema.valueName !== valueName) {
      throw new Error(
        `Value name ${valueName} does not match varb value name ${schema.valueName}`,
      );
    }

    value = schema.validate(value);
    this.setValue(columnName, value as ColumnValue<TN, CN>);
    return this;
  }
  setValues(sectionValues: Partial<TableValues<TN>>): Row<TN> {
    sectionValues = Obj.pick(sectionValues, this.columnNames) as Partial<
      TableValues<TN>
    >;
    for (const [columnName, value] of Obj.entries(sectionValues)) {
      this.setValue(columnName, value as ColumnValue<TN, typeof columnName>);
    }
    return this;
  }
  makeUpdateRequest<CN extends ColumnName<TN>>(
    columnName: CN,
  ): BatchUpdateRequest {
    // inexplicably, GAS treats indices as zero-indexed for this purpose
    const rowIdx = this.idxBase1 - 1;
    const colIdx = this.sheet.colIdxBase1(columnName) - 1;
    return {
      updateCells: {
        fields: "userEnteredValue",
        rows: [
          {
            values: [{ userEnteredValue: this.valueUserEntered(columnName) }],
          },
        ],
        range: {
          sheetId: this.schema.sheetGid,
          startRowIndex: rowIdx,
          endRowIndex: rowIdx + 1,
          startColumnIndex: colIdx,
          endColumnIndex: colIdx + 1,
        },
      },
    };
  }
}
