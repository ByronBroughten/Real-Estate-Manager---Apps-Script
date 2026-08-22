import type { SheetName } from "../02_generatedTraits/02_sheetTraitsTypes";
import {
  getColumnTraitByName,
  type ColTraits,
  type ColTraitsBase,
  type ColumnFullName,
  type ColumnName,
  type ColumnValueName,
} from "../02_generatedTraits/03_columnTraits";
import type { ValueName } from "../02_generatedTraits/06_valueSchemas";
import { ColumnSchemaCommon } from "../03_SpreadsheetIndexed/ColumnSchemaCommon";
import { SheetSchemaNamed } from "./SheetSchemaNamed";

export class ColumnSchemaNamed<
  SN extends SheetName = SheetName,
  CN extends ColumnName<SN> = ColumnName<SN>,
> extends ColumnSchemaCommon<ColumnValueName<SN, CN> & ValueName> {
  readonly sheetName: SN;
  readonly columnName: CN;
  constructor(sheetName: SN, columnName: CN) {
    super();
    this.sheetName = sheetName;
    this.columnName = columnName;
  }
  get columnId(): string {
    return this.trait("columnId");
  }
  trait<K extends keyof ColTraitsBase>(
    key: K,
  ): ColTraits<SN, CN>[K & keyof ColTraits<SN, CN>] {
    return getColumnTraitByName(
      this.sheetName,
      this.columnName,
      key as unknown as keyof ColTraits<SN, CN>,
    ) as ColTraits<SN, CN>[K & keyof ColTraits<SN, CN>];
  }
  get valueName(): ColumnValueName<SN, CN> & ValueName {
    return this.trait("valueName");
  }
  get sheetSchema(): SheetSchemaNamed<SN> {
    return new SheetSchemaNamed(this.sheetName);
  }
  makeRowId(): string {
    return this.sheetSchema.makeRowId();
  }
  get fullName(): ColumnFullName<SN, CN> {
    return `${this.sheetName}${this.nameDelimiter}${this.columnName as string}` as ColumnFullName<
      SN,
      CN
    >;
  }
}
