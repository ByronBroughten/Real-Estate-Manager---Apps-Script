import type { SheetTrait } from "../00_base/makeSheetsTraits";
import {
  getSheetTraitByName,
  type SheetName,
  type SheetNameSimple,
} from "../02_generatedTraits/02_sheetTraitsTypes";
import {
  getColumnTraitByIndex,
  getSheetColumnNames,
  type ColumnName,
} from "../02_generatedTraits/03_columnTraits";
import { SheetSchemaCommon } from "../03_SpreadsheetIndexed/SheetSchemaCommon";
import { ColumnSchemaNamed } from "./ColumnSchemaNamed";
import type { ColumnSpecifierNamed } from "./Types/NamedState";

const varbNameImmutable = ["baseId"] as const;
type VarbNameImmutable = (typeof varbNameImmutable)[number];
export type VarbNameMutable<SN extends SheetName> = Exclude<
  ColumnName<SN>,
  VarbNameImmutable
>;

export class SheetSchemaNamed<
  SN extends SheetNameSimple,
> extends SheetSchemaCommon {
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
  column<CN extends ColumnName<SN>>(columnName: CN): ColumnSchemaNamed<SN, CN> {
    return new ColumnSchemaNamed(this.sheetName, columnName);
  }
  columnByIndex(colIndex: number): ColumnSchemaNamed<SN, ColumnName<SN>> {
    const columnName = this.colNameByIndex(colIndex);
    return new ColumnSchemaNamed(this.sheetName, columnName);
  }
  colNameByIndex(colIndex: number): ColumnName<SN> {
    return getColumnTraitByIndex(
      this.sheetGid,
      colIndex,
      "columnName",
    ) as ColumnName<SN>;
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
