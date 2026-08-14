import {
  getColumnTraitByIndex,
  getSheetColumnNames,
  type ColumnName,
} from "../1.0 Configs/3.0 columnConfigs";
import {
  getSheetTraitByName,
  type SheetConfig,
  type SheetName,
  type SheetNameSimple,
} from "../1.0 Configs/sheetConfigsTypes";
import { SchemaBase } from "../1.1 SpreadsheetSchemaRaw/SchemaBase";
import type { ColumnSpecifierNamed } from "../3. SpreadsheetNamed/Types/NamedState";
import { ColumnSchemaNamed } from "./ColumnSchemaNamed";

const varbNameImmutable = ["baseId"] as const;
type VarbNameImmutable = (typeof varbNameImmutable)[number];
export type VarbNameMutable<TN extends SheetName> = Exclude<
  ColumnName<TN>,
  VarbNameImmutable
>;

export class SheetSchemaNamed<TN extends SheetNameSimple> extends SchemaBase {
  readonly sheetName: TN;
  constructor(sheetName: TN) {
    super();
    this.sheetName = sheetName;
  }
  trait<K extends keyof SheetConfig>(key: K): SheetConfig[K] {
    return getSheetTraitByName(this.sheetName, key);
  }
  get sheetGid(): number {
    return this.trait("sheetGid");
  }
  columnNameByIdx(colIdx: number): ColumnName<TN> {
    return getColumnTraitByIndex(
      this.sheetGid,
      colIdx,
      "columnName",
    ) as ColumnName<TN>;
  }
  column<CN extends ColumnName<TN>>(columnName: CN): ColumnSchemaNamed<TN, CN> {
    return new ColumnSchemaNamed(this.sheetName, columnName);
  }
  colIndex<CN extends ColumnName<TN>>(columnName: CN): number {
    return this.column(columnName).colIndex;
  }
  columnSpecifierToStandard(
    columnSpecifier: ColumnSpecifierNamed<TN>,
  ): ColumnName<TN>[] {
    if (columnSpecifier === "allColumns") {
      return this.columnNames;
    } else if (Array.isArray(columnSpecifier)) {
      return columnSpecifier;
    } else {
      return [columnSpecifier];
    }
  }
  get columnNames(): ColumnName<TN>[] {
    return getSheetColumnNames(this.sheetName);
  }
}
