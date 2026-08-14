import {
  getSheetTraitByName,
  type SheetName,
} from "../02_generatedTraits/02_sheetTraitsTypes";
import {
  getColumnTraitByName,
  type ColTraits,
  type ColTraitsBase,
  type ColumnName,
  type ColumnNameFull,
  type ColumnValueName,
} from "../02_generatedTraits/03_columnTraits";
import { ColumnSchemaIndexed } from "../04_SchemaIndexed/ColumnSchemaIndexed";

import type { ValueSchemaKey } from "../03_Schemas/valueSchema";
import {
  getValTrait,
  type ValueName,
  type ValueSchema,
} from "../03_Schemas/valueSchemas";
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
  get fullName(): ColumnNameFull<TN, CN> {
    return `${this.sheetName}${this.nameDelimiter}${this.columnName as string}` as ColumnNameFull<
      TN,
      CN
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
