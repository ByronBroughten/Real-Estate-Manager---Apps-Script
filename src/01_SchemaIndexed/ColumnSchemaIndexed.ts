import {
  getColumnTraitByIndex,
  type ColTraitsRaw,
} from "../01_configs/03_columnConfigs";
import {
  getValTrait,
  type Value,
  type ValueName,
  type ValueSchema,
} from "../02_Schemas/03_valueSchemas";
import { SchemaBase } from "./SchemaBase";
import { SheetSchemaIndexed } from "./SheetSchemaIndexed";

export class ColumnSchemaIndexed extends SchemaBase {
  readonly sheetId: number;
  readonly colIndex: number;
  constructor(sheetId: number, colIndex: number) {
    super();
    this.sheetId = sheetId;
    this.colIndex = colIndex;
  }
  get sheet(): SheetSchemaIndexed {
    return new SheetSchemaIndexed(this.sheetId);
  }
  trait<K extends keyof ColTraitsRaw>(key: K): ColTraitsRaw[K] {
    return getColumnTraitByIndex(this.sheetId, this.colIndex, key);
  }
  get valueName(): ValueName {
    return this.trait("valueName");
  }
  valTrait<K extends keyof ValueSchema>(key: K): ValueSchema[K] {
    return getValTrait(this.valueName, key);
  }
  get isFormula(): boolean {
    return this.trait("isFormula");
  }
  get columnId(): string {
    return this.trait("columnId");
  }
  validateDataNotFormula() {
    if (this.isFormula) {
      throw new Error(
        `Column at index ${this.colIndex} is a formula column and cannot be used for this operation.`,
      );
    }
  }
  makeDefaultDataValue(): Value {
    if (this.trait("columnName") === "id") {
      return this.sheet.makeRowId();
    } else {
      return this.valTrait("makeDefault")();
    }
  }
  validate(value: unknown) {
    const emptyAllowed = this.trait("emptyAllowed");
    if (emptyAllowed && value === "") {
      return value;
    } else {
      return this.valTrait("strictValidate")(value);
    }
  }
}
