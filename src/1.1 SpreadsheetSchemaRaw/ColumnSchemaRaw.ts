import type { CellValue } from "../1.0 Configs/0.0 ConfigPrecursors";
import {
  getColumnAttributeRaw,
  type ColAttributesRaw,
} from "../1.0 Configs/3.0 columnConfigs";
import type {
  GoogleCellValue,
  UserEnteredValue,
} from "../2. AppsScriptRaw/Types/AppsScriptTypes";
import {
  extractCellValue,
  type ValueSchemaBase,
} from "../2.0 Schemas/3.0 valueSchema";
import {
  getValueAttribute,
  type Value,
  type ValueAttributes,
  type ValueName,
} from "../2.0 Schemas/3.2 valueSchemas";
import { SchemaBase } from "./SchemaBase";
import { SheetSchemaRaw } from "./SheetSchemaRaw";

export class ColumnSchemaRaw extends SchemaBase {
  readonly sheetId: number;
  readonly colIndex: number;
  constructor(sheetId: number, colIndex: number) {
    super();
    this.sheetId = sheetId;
    this.colIndex = colIndex;
  }
  // What can I do about the fact that columnSchemas are sus in the raw layer?
  // the attributes are a lie.
  attribute<K extends keyof ColAttributesRaw>(key: K): ColAttributesRaw[K] {
    return getColumnAttributeRaw(this.sheetId, this.colIndex, key);
  }
  get sheet(): SheetSchemaRaw {
    return new SheetSchemaRaw(this.sheetId);
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
  valueAttributes<K extends keyof ValueSchemaBase>(key: K): ValueAttributes[K] {
    return getValueAttribute(this.valueName, key);
  }

  // Everything here will probably need to switch to ColumnRaw. The schemas are no good on the raw layer.
  // I should probably get rid of all the raw schemas and use only active stuff. Yeah?
  makeDefaultDataValue(): Value {
    if (this.columnName === "id") {
      return this.sheet.makeRowId();
    } else {
      return this.valueAttributes("makeDefault")();
    }
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
    if (emptyAllowed && value === "") {
      return value;
    } else {
      return this.valueAttributes("strictValidate")(value);
    }
  }
}
