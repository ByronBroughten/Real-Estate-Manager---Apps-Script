import type { SheetName } from "../1.0 Configs/2.0 sheetConfigs";
import {
  getColumnAttribute,
  type ColumnAttributes,
  type ColumnAttributesBase,
  type ColumnName,
  type ColumnValue,
  type ColumnValueName,
} from "../1.0 Configs/3.0 columnConfigs";
import { ColumnSchemaRaw } from "../1.1 SpreadsheetSchemaRaw/ColumnSchemaRaw";
import { SchemaBase } from "../1.1 SpreadsheetSchemaRaw/SchemaBase";
import type { CombineStringsWithFlat } from "../utils/Str";
import {
  getValueAttribute,
  type ValueAttributes,
  type ValueName,
} from "./3.2 valueSchemas";
import { SheetSchemaNamed } from "./SheetSchemaNamed";

export class ColumnSchemaNamed<
  TN extends SheetName = SheetName,
  CN extends ColumnName<TN> = ColumnName<TN>,
> extends SchemaBase {
  readonly sheetName: TN;
  readonly columnName: CN;
  constructor(sheetName: TN, columnName: CN) {
    super();
    this.sheetName = sheetName;
    this.columnName = columnName;
  }
  get sheetSchema(): SheetSchemaNamed<TN> {
    return new SheetSchemaNamed(this.sheetName);
  }
  get raw(): ColumnSchemaRaw {
    return new ColumnSchemaRaw(this.sheetSchema.sheetGid, this.colIndex);
  }
  get columnFullname(): CombineStringsWithFlat<TN, CN & string> {
    return `${this.sheetName}_${this.columnName as string}` as CombineStringsWithFlat<
      TN,
      CN & string
    >;
  }
  get colIndex(): number {
    return this.colAttribute("colIndex");
  }
  get columnId(): string {
    return this.colAttribute("columnId");
  }
  colAttribute<K extends keyof ColumnAttributesBase>(
    key: K,
  ): ColumnAttributes<TN, CN>[K & keyof ColumnAttributes<TN, CN>] {
    return getColumnAttribute(
      this.sheetName,
      this.columnName,
      key as unknown as keyof ColumnAttributes<TN, CN>,
    ) as ColumnAttributes<TN, CN>[K & keyof ColumnAttributes<TN, CN>];
  }
  get valueName(): ColumnValueName<TN, CN> {
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
    return this.raw.validate(value) as ColumnValue<TN, CN>;
  }
  makeDefaultDataValue(): ColumnValue<TN, CN> {
    return this.valueAttribute("makeDefault")() as ColumnValue<TN, CN>;
  }
  get isFormula(): boolean {
    const defaultValue = this.makeDefaultDataValue();
    if (typeof defaultValue === "string" && defaultValue.startsWith("=")) {
      return true;
    } else {
      return false;
    }
  }
}
