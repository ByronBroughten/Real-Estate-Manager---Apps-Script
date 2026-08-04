import {
  extractCellValue,
  type ValueAttributesBase,
} from "../0. spreadsheetMetaData/3.0 valueAttribute";
import {
  getValueAttribute,
  type Value,
  type ValueAttributes,
  type ValueName,
} from "../0. spreadsheetMetaData/3.2 valueAttributes";
import {
  getColumnAttributeRaw,
  type ColAttributesRaw,
} from "../0. spreadsheetMetaData/5. allColumnAttributes";
import type {
  GoogleCellValue,
  UserEnteredValue,
} from "../2. AppsScriptRaw/Types/AppsScriptTypes";
import type { CellValue } from "../2. AppsScriptRaw/Types/RawState";
import { SchemaBase } from "./SchemaBase";

export class ColumnSchemaRaw extends SchemaBase {
  readonly sheetId: number;
  readonly columnIdx: number;
  constructor(sheetId: number, columnIdx: number) {
    super();
    this.sheetId = sheetId;
    this.columnIdx = columnIdx;
  }
  attribute<K extends keyof ColAttributesRaw>(key: K): ColAttributesRaw[K] {
    return getColumnAttributeRaw(this.sheetId, this.columnIdx, key);
  }
  get columnId(): string {
    return this.attribute("columnId") as string;
  }
  get columnName(): string {
    return this.attribute("columnName") as string;
  }
  get isFormula(): boolean {
    return this.attribute("isFormula");
  }

  get valueName(): ValueName {
    return this.attribute("valueName");
  }
  valueAttributes<K extends keyof ValueAttributesBase>(
    key: K,
  ): ValueAttributes[K] {
    return getValueAttribute(this.valueName, key);
  }
  makeDefaultValue(): Value {
    return this.valueAttributes("makeDefault")();
  }
  extractCellString(cellValue: GoogleCellValue | undefined): string {
    return extractCellValue(cellValue, "stringValue");
  }
  makeUserEnteredValue(value: Value): UserEnteredValue {
    return this.valueAttributes("makeUserEnteredValue")(value as any);
  }
  extractCellValue(cellValue: GoogleCellValue | undefined): CellValue {
    return this.valueAttributes("extractCellValue")(cellValue);
  }
  validate(value: unknown) {
    const emptyAllowed = this.attribute("emptyAllowed");
    if (!emptyAllowed && value === "") {
      throw new Error("Empty string not allowed.");
    }
    return this.valueAttributes("defaultValidate")(value);
  }
}
