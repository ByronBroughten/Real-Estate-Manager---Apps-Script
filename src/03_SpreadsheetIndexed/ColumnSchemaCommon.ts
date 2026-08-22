import type { ValueSchemaKey } from "../00_base/valueSchema";
import type { ColTraitsLiteral } from "../02_generatedTraits/03_columnTraits";
import {
  getValTrait,
  type Value,
  type ValueName,
  type ValueSchema,
} from "../02_generatedTraits/06_valueSchemas";
import { SchemaBase } from "../01_SpreadsheetRaw/SchemaBase";

type ColumnTraitLiteral = Omit<ColTraitsLiteral, "columnId">;

export abstract class ColumnSchemaCommon<
  VN extends ValueName = ValueName,
> extends SchemaBase {
  abstract columnName: PropertyKey;
  abstract columnId: string;
  abstract valueName: VN;
  abstract trait<K extends keyof ColumnTraitLiteral>(
    key: K,
  ): ColumnTraitLiteral[K];
  abstract makeRowId(): string;

  valTrait<K extends ValueSchemaKey>(key: K): ValueSchema<VN>[K] {
    return getValTrait(this.valueName, key);
  }
  get isFormula(): boolean {
    return this.trait("isFormula");
  }
  validateDataNotFormula() {
    if (this.isFormula) {
      throw new Error(
        `Column with id "${this.columnId}" is a formula column and cannot be used for this operation.`,
      );
    }
  }
  makeDefaultDataValue(): Value<VN> {
    if (this.columnName === "id") {
      return this.makeRowId() as Value<VN>;
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
