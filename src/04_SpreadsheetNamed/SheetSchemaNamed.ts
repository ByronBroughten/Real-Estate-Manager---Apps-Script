import {
  getColumnTraitByIndex,
  getSheetColumnNames,
  type ColumnName,
} from "../01_generatedConfigs/columnConfigsTypes";
import type { SheetConfig } from "../01_generatedConfigs/sheetConfigBuilder";
import {
  getSheetTraitByName,
  type SheetName,
  type SheetNameSimple,
} from "../01_generatedConfigs/sheetConfigsTypes";
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
    this.validateSheetGid();
  }
  trait<K extends keyof SheetConfig>(key: K): SheetConfig[K] {
    return getSheetTraitByName(this.sheetName, key);
  }
  get sheetGid(): number {
    return this.trait("sheetGid");
  }
  isColumnName(str: string): str is ColumnName<SN> {
    return this.columnNames.includes(str as ColumnName<SN>);
  }
  column<CN extends ColumnName<SN>>(columnName: CN): ColumnSchemaNamed<SN, CN> {
    return new ColumnSchemaNamed(this.sheetName, columnName);
  }
  columnByColumnId(columnId: string): ColumnSchemaNamed<SN, ColumnName<SN>> {
    const columnName = this.colNameByColumnId(columnId);
    return new ColumnSchemaNamed(this.sheetName, columnName);
  }
  // Delegates to the Indexed-flavored accessor (tier 01, so this is a
  // downward and allowed dependency) because it's the only place with an
  // O(1) columnId -> columnName index; a Named-only implementation would
  // have to scan every column in the sheet.
  colNameByColumnId(columnId: string): ColumnName<SN> {
    return getColumnTraitByIndex(
      this.sheetGid,
      columnId,
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
