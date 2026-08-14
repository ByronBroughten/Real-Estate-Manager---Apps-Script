import {
  getSheetTraitByName,
  type SheetName,
} from "../01_generatedTraits/02_sheetTraitsTypes";
import {
  getColumnTraitByName,
  type ColTraits,
  type ColTraitsBase,
  type ColumnName,
  type ColumnValueName,
} from "../01_generatedTraits/03_columnTraits";
import { ColumnSchemaIndexed } from "../01_SchemaIndexed/ColumnSchemaIndexed";
import type { CombineStringsWithFlat } from "../utils/Str";
import type { ValueSchemaKey } from "./03_valueSchema";
import {
  getValTrait,
  type ValueName,
  type ValueSchema,
} from "./03_valueSchemas";
import { SheetSchemaNamed } from "./SheetSchemaNamed";

export class ColumnSchemaNamed<
  TN extends SheetName = SheetName,
  CN extends ColumnName<TN> = ColumnName<TN>,
> extends ColumnSchemaIndexed {
  readonly sheetName: TN;
  readonly columnName: CN;
  constructor(sheetName: TN, columnName: CN) {
    super(
      getSheetTraitByName(sheetName, "sheetGid"),
      getColumnTraitByName(sheetName, columnName, "colIndex"),
    );
    this.sheetName = sheetName;
    this.columnName = columnName;
  }
  traitByName<K extends keyof ColTraitsBase>(
    key: K,
  ): ColTraits<TN, CN>[K & keyof ColTraits<TN, CN>] {
    return getColumnTraitByName(
      this.sheetName,
      this.columnName,
      key as unknown as keyof ColTraits<TN, CN>,
    ) as ColTraits<TN, CN>[K & keyof ColTraits<TN, CN>];
  }
  get sheetSchema(): SheetSchemaNamed<TN> {
    return new SheetSchemaNamed(this.sheetName);
  }
  get columnFullname(): CombineStringsWithFlat<TN, CN & string> {
    return `${this.sheetName}_${this.columnName as string}` as CombineStringsWithFlat<
      TN,
      CN & string
    >;
  }
  valTrait<K extends ValueSchemaKey>(
    key: K,
  ): ValueSchema<ColumnValueName<TN, CN> & ValueName>[K] {
    return getValTrait(
      this.valueName as ColumnValueName<TN, CN> & ValueName,
      key,
    );
  }
}
