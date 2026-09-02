import {
  getColumnTraitByName,
  type ColumnConfig,
  type ColumnConfigAt,
  type ColumnFullName,
  type ColumnName,
  type ColumnValueName,
} from "../01_generatedConfigs/columnConfigsTypes";
import type { SheetName } from "../01_generatedConfigs/sheetConfigsTypes";
import type { ValueName } from "../01_generatedConfigs/valueSchemas";
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
  trait<K extends keyof ColumnConfig>(
    key: K,
  ): ColumnConfigAt<SN, CN>[K & keyof ColumnConfigAt<SN, CN>] {
    return getColumnTraitByName(
      this.sheetName,
      this.columnName,
      key as unknown as keyof ColumnConfigAt<SN, CN>,
    ) as ColumnConfigAt<SN, CN>[K & keyof ColumnConfigAt<SN, CN>];
  }
  get valueName(): ColumnValueName<SN, CN> & ValueName {
    return this.trait("valueName");
  }
  get sheet(): SheetSchemaNamed<SN> {
    return new SheetSchemaNamed(this.sheetName);
  }
  makeRowId(): string {
    return this.sheet.makeRowId();
  }
  get fullName(): ColumnFullName<SN, CN> {
    return `${this.sheetName}${this.nameDelimiter}${this.columnName as string}` as ColumnFullName<
      SN,
      CN
    >;
  }
}
