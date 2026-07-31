import {
  getValueAttribute,
  type ValueAttributes,
  type ValueName,
} from "../0. spreadsheetMetaData/3.2 valueAttributes";
import type { TableName } from "../0. spreadsheetMetaData/4.0 tableAttributes";
import {
  getColumnAttribute,
  type ColumnAttributes,
  type ColumnAttributesBase,
  type ColumnName,
  type ColumnValue,
  type ColumnValueName,
} from "../0. spreadsheetMetaData/5. allColumnAttributes";
import type { CombineStringsWithFlat } from "../utils/Str";

export class ColumnSchema<TN extends TableName, CN extends ColumnName<TN>> {
  readonly tableName: TN;
  readonly columnName: CN;
  constructor(tableName: TN, columnName: CN) {
    this.tableName = tableName;
    this.columnName = columnName;
  }
  get columnFullname(): CombineStringsWithFlat<TN, CN & string> {
    return `${this.tableName}_${this.columnName as string}` as CombineStringsWithFlat<
      TN,
      CN & string
    >;
  }
  get columnId(): string {
    return this.colAttribute("columnId") as string;
  }
  get idxBase0(): number {
    return this.colAttribute("indexBase0") as number;
  }
  colAttribute<K extends keyof ColumnAttributesBase>(
    key: K,
  ): ColumnAttributes<TN, CN>[K & keyof ColumnAttributes<TN, CN>] {
    return getColumnAttribute(
      this.tableName,
      this.columnName,
      key as unknown as keyof ColumnAttributes<TN, CN>,
    ) as ColumnAttributes<TN, CN>[K & keyof ColumnAttributes<TN, CN>];
  }
  get valueName(): ColumnAttributes<TN, CN>["valueName" &
    keyof ColumnAttributes<TN, CN>] {
    return this.colAttribute("valueName");
  }
  valueAttribute<
    K extends keyof ValueAttributes<ColumnValueName<TN, CN> & ValueName>,
  >(key: K) {
    return getValueAttribute(
      this.valueName as ColumnValueName<TN, CN> & ValueName,
      key,
    );
  }
  validate(value: unknown): ColumnValue<TN, CN> {
    const emptyAllowed = this.colAttribute("emptyAllowed");
    return this.valueAttribute("defaultValidate")(value) as ColumnValue<TN, CN>;
  }
  makeDefaultValue(): ColumnValue<TN, CN> {
    return this.valueAttribute("makeDefault")() as ColumnValue<TN, CN>;
  }
  get isEquationLiteral(): boolean {
    const defaultValue = this.makeDefaultValue();
    if (typeof defaultValue === "string" && defaultValue.startsWith("=")) {
      return true;
    } else {
      return false;
    }
  }
}
