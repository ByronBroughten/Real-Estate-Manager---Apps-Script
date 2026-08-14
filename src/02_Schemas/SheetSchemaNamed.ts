import {
  getSheetTraitByName,
  type SheetName,
  type SheetNameSimple,
  type SheetTrait,
} from "../01_generatedTraits/02_sheetTraitsTypes";
import {
  getColumnTraitByIndex,
  getSheetColumnNames,
  type ColumnName,
  type SheetColumnName,
} from "../01_generatedTraits/03_columnTraits";
import { SchemaBase } from "../01_SchemaIndexed/SchemaBase";
import type { ColumnSpecifierNamed } from "../03_SpreadsheetNamed/Types/NamedState";
import { ColumnSchemaNamed } from "./ColumnSchemaNamed";

const varbNameImmutable = ["baseId"] as const;
type VarbNameImmutable = (typeof varbNameImmutable)[number];
export type VarbNameMutable<SN extends SheetName> = Exclude<
  ColumnName<SN>,
  VarbNameImmutable
>;

export class SheetSchemaNamed<SN extends SheetNameSimple> extends SchemaBase {
  readonly sheetName: SN;
  constructor(sheetName: SN) {
    super();
    this.sheetName = sheetName;
  }
  trait<K extends keyof SheetTrait>(key: K): SheetTrait[K] {
    return getSheetTraitByName(this.sheetName, key);
  }
  get sheetGid(): number {
    return this.trait("sheetGid");
  }
  sheetColName<CN extends ColumnName<SN> & string>(
    columnName: CN,
  ): SheetColumnName<SN, CN> {
    return `${this.sheetName}${this.nameDelimiter}${columnName}`;
  }
  column<CN extends ColumnName<SN>>(columnName: CN): ColumnSchemaNamed<SN, CN> {
    return new ColumnSchemaNamed(this.sheetName, columnName);
  }
  columnByIndex(colIndex: number): ColumnSchemaNamed<SN, ColumnName<SN>> {
    const columnName = this.columnNameByIdx(colIndex);
    return new ColumnSchemaNamed(this.sheetName, columnName);
  }
  columnNameByIdx(colIndex: number): ColumnName<SN> {
    return getColumnTraitByIndex(
      this.sheetGid,
      colIndex,
      "columnName",
    ) as ColumnName<SN>;
  }
  colIndex<CN extends ColumnName<SN>>(columnName: CN): number {
    return this.column(columnName).colIndex;
  }
  columnSpecifierToStandard(
    columnSpecifier: ColumnSpecifierNamed<SN>,
  ): ColumnName<SN>[] {
    if (columnSpecifier === "allColumns") {
      return this.columnNames;
    } else if (Array.isArray(columnSpecifier)) {
      return columnSpecifier;
    } else {
      return [columnSpecifier];
    }
  }
  get columnNames(): ColumnName<SN>[] {
    return getSheetColumnNames(this.sheetName);
  }
}
